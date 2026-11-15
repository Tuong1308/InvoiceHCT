/**
 * VietQR EMVCo compliant QR code generator
 * NAPAS Specification for Interbank Electronic Fund Transfer
 */

import { removeVietnameseTones } from './search';

function formatTLV(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Calculates CRC-16 CCITT (polynomial 0x1021, initial 0xFFFF)
 */
export function crc16CCITT(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    crc ^= code << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

export interface VietQROptions {
  bin: string;
  accountNo: string;
  amount: number;
  memo: string; // bill code, max 25 characters, unaccented
}

/**
 * Builds the EMVCo string for VietQR
 */
export function buildVietQRString(options: VietQROptions): string {
  const { bin, accountNo, amount, memo } = options;

  // Tag 00: Payload Format Indicator = '01'
  const tag00 = formatTLV('00', '01');

  // Tag 01: Point of Initiation Method = '12' (dynamic with amount)
  const tag01 = formatTLV('01', '12');

  // Tag 38: Merchant Account Information
  // 38.00 = NAPAS GUID: 'A000000727'
  const sub00 = formatTLV('00', 'A000000727');

  // 38.01 = Consumer account info: 00 = BIN, 01 = Account No
  const sub01_00 = formatTLV('00', bin);
  const sub01_01 = formatTLV('01', accountNo);
  const sub01 = formatTLV('01', `${sub01_00}${sub01_01}`);

  // 38.02 = Service code: 'QRIBFTTA' (Chuyển nhanh Napas 247 bằng QR đến tài khoản)
  const sub02 = formatTLV('02', 'QRIBFTTA');

  const tag38 = formatTLV('38', `${sub00}${sub01}${sub02}`);

  // Tag 53: Transaction Currency = '704' (VND)
  const tag53 = formatTLV('53', '704');

  // Tag 54: Transaction Amount
  const roundedAmount = Math.round(amount).toString();
  const tag54 = formatTLV('54', roundedAmount);

  // Tag 58: Country Code = 'VN'
  const tag58 = formatTLV('58', 'VN');

  // Tag 62: Additional Data Field Template
  // 62.08 = Purpose of Transaction / Order ID
  const cleanMemo = removeVietnameseTones(memo).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 25);
  const sub62_08 = formatTLV('08', cleanMemo);
  const tag62 = formatTLV('62', sub62_08);

  // Partial string before CRC
  const rawData = `${tag00}${tag01}${tag38}${tag53}${tag54}${tag58}${tag62}6304`;

  // Tag 63: CRC16
  const crc = crc16CCITT(rawData);

  return `${rawData}${crc}`;
}

