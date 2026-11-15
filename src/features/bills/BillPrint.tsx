import { useEffect, useState, forwardRef } from 'react';
import QRCode from 'qrcode';
import { BillWithItems, ShopSettings } from '../../types/database';
import { formatVND } from '../../lib/money';
import { formatVietnamDateTime } from '../../lib/date';
import { buildVietQRString } from '../../lib/vietqr';

interface BillPrintProps {
  bill: BillWithItems;
  settings: ShopSettings;
}

export const BillPrint = forwardRef<HTMLDivElement, BillPrintProps>(({ bill, settings }, ref) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (bill.payment_method === 'transfer' && settings.account_no && settings.bank_bin) {
      const qrString = buildVietQRString({
        bin: settings.bank_bin,
        accountNo: settings.account_no,
        amount: bill.total,
        memo: bill.code,
      });

      QRCode.toDataURL(qrString, {
        margin: 1,
        width: 180,
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating receipt QR:', err));
    }
  }, [bill, settings]);

  const isVoid = bill.status === 'void';
  const paperWidth = settings.bill_paper_size === '80mm' ? 'max-w-[80mm]' : 'max-w-[148mm]';

  return (
    <div
      ref={ref}
      id="printable-receipt"
      className={`relative mx-auto bg-white p-4 text-stone-900 font-mono text-[13px] leading-relaxed ${paperWidth} print:m-0 print:p-2 print:shadow-none print:w-full`}
    >
      {/* Void Watermark if bill is void */}
      {isVoid && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="text-red-500/30 text-5xl font-black border-4 border-red-500/30 px-6 py-2 rotate-[-25deg] tracking-widest uppercase select-none">
            ĐÃ HỦY
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-1 mb-3">
        <h2 className="text-base font-bold uppercase tracking-wider">{settings.shop_name}</h2>
        <p className="text-[12px] text-stone-600">{settings.address}</p>
        <p className="text-[12px] text-stone-600">SĐT: {settings.phone}</p>
      </div>

      <div className="border-t border-dashed border-stone-400 my-2" />

      {/* Bill Meta */}
      <div className="space-y-0.5 text-[12px]">
        <div className="flex justify-between">
          <span>Bill:</span>
          <span className="font-bold">{bill.code}</span>
        </div>
        <div className="flex justify-between">
          <span>Ngày:</span>
          <span>{formatVietnamDateTime(bill.created_at)}</span>
        </div>
        {isVoid && bill.void_reason && (
          <div className="text-red-600 font-semibold text-[11px] mt-1">
            Lý do huỷ: {bill.void_reason}
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-stone-400 my-2" />

      {/* Items Table */}
      <table className="w-full text-left border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-stone-300">
            <th className="py-1 font-bold">Món</th>
            <th className="py-1 text-center font-bold">SL</th>
            <th className="py-1 text-right font-bold">Đ.giá</th>
            <th className="py-1 text-right font-bold">T.tiền</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item) => (
            <tr key={item.id} className="border-b border-stone-100">
              <td className="py-1 pr-1 font-medium leading-tight">
                {item.name_snapshot}
              </td>
              <td className="py-1 px-1 text-center font-bold">{item.qty}</td>
              <td className="py-1 px-1 text-right">{formatVND(item.price_snapshot, false)}</td>
              <td className="py-1 pl-1 text-right font-bold">{formatVND(item.line_total, false)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-stone-400 my-2" />

      {/* Totals */}
      <div className="space-y-1 text-[13px]">
        <div className="flex justify-between font-bold text-sm">
          <span>TỔNG CỘNG:</span>
          <span className="text-base">{formatVND(bill.total)}</span>
        </div>

        {bill.payment_method === 'cash' ? (
          <>
            <div className="flex justify-between text-[12px]">
              <span>Thanh toán:</span>
              <span>Tiền mặt</span>
            </div>
            {bill.cash_received !== null && (
              <>
                <div className="flex justify-between text-[12px]">
                  <span>Khách đưa:</span>
                  <span>{formatVND(bill.cash_received, false)}</span>
                </div>
                <div className="flex justify-between text-[12px] font-bold">
                  <span>Tiền thối:</span>
                  <span>{formatVND(bill.change_amount || 0, false)}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="pt-2 text-center space-y-2">
            <div className="flex justify-between text-[12px]">
              <span>Thanh toán:</span>
              <span className="font-bold">Chuyển khoản</span>
            </div>

            {/* QR Section */}
            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center my-2">
                <img src={qrDataUrl} alt="VietQR" className="w-36 h-36 object-contain" />
              </div>
            )}

            <div className="text-[11px] text-stone-700 space-y-0.5 text-left border border-stone-200 p-2 rounded">
              <div>Ngân hàng: <b>{settings.bank_name}</b></div>
              <div>STK: <b className="font-mono">{settings.account_no}</b></div>
              <div>Chủ TK: <b className="uppercase">{settings.account_name}</b></div>
              <div>Nội dung: <b className="font-mono">{bill.code}</b></div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-stone-400 my-3" />

      {/* Footer Greeting */}
      <div className="text-center text-[12px] text-stone-600">
        <p>{settings.footer_text || 'Cảm ơn quý khách!'}</p>
      </div>
    </div>
  );
});

BillPrint.displayName = 'BillPrint';

