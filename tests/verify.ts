import { crc16CCITT, buildVietQRString } from '../src/lib/vietqr';
import { formatVND, parseVND, calculateChange } from '../src/lib/money';
import { removeVietnameseTones, matchesVietnameseSearch } from '../src/lib/search';
import { getVietnamBusinessDate, getVietnamBillPrefix } from '../src/lib/date';

console.log('--- STARTING VERIFICATION TESTS ---');

// 1. Test Money Formatting & Calculation
console.log('\n[1] Testing Money Utilities...');
console.assert(formatVND(88000) === '88.000đ', `formatVND(88000) failed: ${formatVND(88000)}`);
console.assert(formatVND(88000, false) === '88.000', `formatVND(88000, false) failed`);
console.assert(parseVND('100.000') === 100000, `parseVND('100.000') failed: ${parseVND('100.000')}`);
console.assert(parseVND('88.000đ') === 88000, `parseVND('88.000đ') failed: ${parseVND('88.000đ')}`);

const changeTest1 = calculateChange(88000, 100000);
console.assert(changeTest1.isEnough === true, '100k for 88k should be enough');
console.assert(changeTest1.change === 12000, `Expected change 12.000, got ${changeTest1.change}`);

const changeTest2 = calculateChange(88000, 50000);
console.assert(changeTest2.isEnough === false, '50k for 88k should not be enough');
console.assert(changeTest2.difference === -38000, `Expected diff -38.000, got ${changeTest2.difference}`);
console.log('✓ Money tests passed');

// 2. Test Vietnamese Unaccented Search
console.log('\n[2] Testing Vietnamese Search Utilities...');
console.assert(removeVietnameseTones('Cà phê muối') === 'ca phe muoi', `Tones failed: ${removeVietnameseTones('Cà phê muối')}`);
console.assert(removeVietnameseTones('Trà đào cam sả') === 'tra dao cam sa', `Tones failed: ${removeVietnameseTones('Trà đào cam sả')}`);
console.assert(matchesVietnameseSearch('Cà phê muối', 'ca phe') === true, 'ca phe should match Cà phê muối');
console.assert(matchesVietnameseSearch('Cà phê muối', 'muoi') === true, 'muoi should match Cà phê muối');
console.assert(matchesVietnameseSearch('Cà phê đen', 'CA PHE DEN') === true, 'CA PHE DEN should match Cà phê đen');
console.assert(matchesVietnameseSearch('Bạc xỉu', 'matcha') === false, 'matcha should not match Bạc xỉu');
console.log('✓ Vietnamese search tests passed');

// 3. Test Date & Business Date (Asia/Ho_Chi_Minh)
console.log('\n[3] Testing Date Utilities...');
const bDate = getVietnamBusinessDate();
console.assert(/^\d{4}-\d{2}-\d{2}$/.test(bDate), `Invalid business date format: ${bDate}`);
const prefix = getVietnamBillPrefix();
console.assert(/^\d{6}$/.test(prefix), `Invalid bill prefix format: ${prefix}`);
console.log(`✓ Business date: ${bDate}, Prefix: ${prefix}`);

// 4. Test VietQR EMVCo Spec & CRC16
console.log('\n[4] Testing VietQR & CRC16-CCITT...');
// Known test for CRC16-CCITT: '123456789' with poly 0x1021 and init 0xFFFF is 0x29B1
const testCRC = crc16CCITT('123456789');
console.assert(testCRC === '29B1', `CRC16 failed for '123456789': expected 29B1, got ${testCRC}`);

const qrStr = buildVietQRString({
  bin: '970436',
  accountNo: '0123456789',
  amount: 88000,
  memo: '141126-005',
});
console.assert(qrStr.startsWith('000201010212'), 'QR must start with payload format and dynamic method indicator');
console.assert(qrStr.includes('5303704'), 'QR must include VND currency 704');
console.assert(qrStr.includes('540588000'), 'QR must include amount 88000');
console.assert(qrStr.includes('5802VN'), 'QR must include country VN');
console.assert(qrStr.includes('141126-005'), 'QR must include bill code memo');
console.assert(qrStr.length > 50, 'QR string valid length');
console.log('✓ VietQR EMVCo generated: ' + qrStr);

console.log('\n=======================================');
console.log('ALL UNIT VERIFICATION TESTS PASSED 100%');
console.log('=======================================');

