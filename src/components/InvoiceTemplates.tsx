import React from 'react';

interface InvoiceProps {
  order: any;
  company: any;
  currencySymbol?: string;
}

export const A5Invoice = React.forwardRef<HTMLDivElement, InvoiceProps>(({ order, company, currencySymbol = '৳' }, ref) => {
  return (
    <div ref={ref} className="p-4 bg-[#ffffff] text-[#000000] font-sans relative overflow-hidden" style={{ width: '210mm', height: '148mm', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Decorative Background Elements - Subtle Grayscale */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full -mr-24 -mt-24 z-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full -ml-16 -mb-16 z-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}></div>

      {/* Top Accent Bar - Black */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#000000]"></div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2">
            {company.companyLogo ? (
              <img src={company.companyLogo} alt="Logo" className="h-10 object-contain grayscale" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#000000] rounded-lg flex items-center justify-center text-white font-black text-base shadow-lg">
                  {company.companyName?.[0] || 'K'}
                </div>
                <span className="text-lg font-black tracking-tighter text-[#000000]">
                  {company.companyName || 'KARUKARJO'}
                </span>
              </div>
            )}
            <div className="space-y-0">
              <h1 className="text-xl font-black text-[#000000] tracking-tight uppercase leading-none">Invoice</h1>
              <div className="flex items-center gap-2 text-[9px] font-bold text-[#666666] uppercase tracking-widest">
                <span>No:</span>
                <span className="text-[#000000]">#{order.orderNumber || order.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          <div className="text-right space-y-1">
            <h2 className="text-xs font-black text-[#000000] uppercase tracking-wide">{company.companyName || 'KARUKARJO LTD'}</h2>
            <div className="text-[8px] font-medium text-[#444444] space-y-0 max-w-[220px] ml-auto leading-tight">
              <p>{company.companyAddress || '44 PEACE TOWER, L# 01&06, NEW MODEL TOWN, HAZARIBAG, DHAKA'}</p>
              <p className="text-[#000000] font-bold">
                {company.companyMobile || '01932626364'} {company.companyPhone && `| ${company.companyPhone}`}
              </p>
              <p>{company.companyEmail && `Email: ${company.companyEmail}`}</p>
              <p>{company.companyWebsite && `Web: ${company.companyWebsite}`}</p>
              {company.companyVat && (
                <p className="text-[#000000] font-black mt-0.5 border-t border-gray-100 pt-0.5">BIN/VAT: {company.companyVat}</p>
              )}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div className="space-y-1">
            <div className="space-y-0.5">
              <p className="text-base font-black text-[#000000] leading-tight">{order.customerName}</p>
              <p className="text-xs font-bold text-[#000000]">{order.customerPhone}</p>
              <p className="text-[10px] text-[#333333] leading-relaxed max-w-[350px]">
                {order.customerAddress}
                {order.area && `, ${order.area}`}
                {order.district && `, ${order.district}`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0">
                <p className="text-[7px] font-black text-[#666666] uppercase tracking-widest">Date Issued</p>
                <p className="text-[9px] font-bold text-[#000000]">
                  {order.createdAt?.toDate 
                    ? order.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : (order.createdAt?.seconds 
                      ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    )
                  }
                </p>
              </div>
              <div className="space-y-0">
                <p className="text-[7px] font-black text-[#666666] uppercase tracking-widest">Payment Method</p>
                <p className="text-[9px] font-bold text-[#000000] uppercase">{order.paymentMethod || 'Cash on Delivery'}</p>
              </div>
            </div>
            <div className="p-1.5 bg-[#f9f9f9] rounded border border-[#eeeeee] flex items-center justify-between">
              <div className="space-y-0">
                <p className="text-[6px] font-black text-[#666666] uppercase tracking-widest">Status</p>
                <p className="text-[8px] font-black text-[#000000] uppercase">{order.status || 'Pending'}</p>
              </div>
              <div className="h-4 w-[1px] bg-[#dddddd]"></div>
              <div className="text-right space-y-0">
                <p className="text-[6px] font-black text-[#666666] uppercase tracking-widest">Channel</p>
                <p className="text-[8px] font-black text-[#000000] uppercase">{order.channel || 'Direct'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-grow rounded border border-[#eeeeee] overflow-hidden mb-3 shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[8px] font-black text-[#000000] uppercase tracking-wider" style={{ backgroundColor: '#f3f3f3' }}>
                <th className="text-left py-1.5 px-3 w-8">#</th>
                <th className="text-left py-1.5 px-2">Item Description</th>
                <th className="text-center py-1.5 px-2 w-12">Qty</th>
                <th className="text-right py-1.5 px-2 w-24">Unit Price</th>
                <th className="text-right py-1.5 px-3 w-24">Total</th>
              </tr>
            </thead>
            <tbody className="text-[9px]">
              {order.items?.map((item: any, idx: number) => (
                <tr key={idx} className="border-t border-[#f9f9f9]">
                  <td className="py-1.5 px-3 text-[#666666] font-bold">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="py-1.5 px-2">
                    <p className="font-black text-[#000000] leading-tight">{item.name || item.productName || 'N/A'}</p>
                    {item.variantName && <p className="text-[7px] font-bold text-[#444444] uppercase">{item.variantName}</p>}
                  </td>
                  <td className="text-center py-1.5 px-2 font-bold text-[#000000]">{item.quantity}</td>
                  <td className="text-right py-1.5 px-2 font-bold text-[#333333]">{currencySymbol}{(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="text-right py-1.5 px-3 font-black text-[#000000]">{currencySymbol}{(item.quantity * item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div className="flex justify-between items-end gap-4 mt-auto">
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <h4 className="text-[7px] font-black text-[#666666] uppercase tracking-widest">Notes</h4>
              <p className="text-[8px] text-[#333333] italic leading-tight bg-[#f9f9f9] p-2 rounded border border-[#eeeeee] min-h-[30px]">
                {order.notes || company.invoiceFooterNote || 'Thank you for your business!'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded border border-[#dddddd]">
                <div className="w-5 h-5 bg-[#000000] rounded flex items-center justify-center text-white font-bold text-[8px]">QR</div>
              </div>
              <div className="space-y-0">
                <p className="text-[6px] font-black text-[#666666] uppercase tracking-widest">Verify</p>
                <p className="text-[7px] font-bold text-[#000000] uppercase tracking-tight">{company.companyWebsite || 'WWW.KARUKARJO.COM.BD'}</p>
              </div>
            </div>
          </div>

          <div className="w-56 space-y-1.5">
            <div className="space-y-1 px-2">
              <div className="flex justify-between text-[9px]">
                <span className="font-bold text-[#666666] uppercase tracking-wider">Subtotal</span>
                <span className="font-black text-[#000000]">{currencySymbol}{(order.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="font-bold text-[#666666] uppercase tracking-wider">Delivery</span>
                <span className="font-black text-[#000000]">{currencySymbol}{(order.deliveryCharge || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-[9px]">
                  <span className="font-bold text-[#666666] uppercase tracking-wider">Discount</span>
                  <span className="font-black text-[#000000]">-{currencySymbol}{(order.discount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-[9px] pt-0.5 border-t border-[#eeeeee]">
                <span className="font-bold text-[#666666] uppercase tracking-wider">Total Amount</span>
                <span className="font-black text-[#000000]">{currencySymbol}{(order.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="font-bold text-[#666666] uppercase tracking-wider">Paid Amount</span>
                <span className="font-black text-[#000000]">{currencySymbol}{(order.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            
            <div className="bg-[#000000] rounded p-2 text-white shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Due Amount</span>
                <span className="text-base font-black">{currencySymbol}{(order.dueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {company.signatureImage && (
              <div className="pt-1 flex flex-col items-center">
                <img src={company.signatureImage} alt="Signature" className="h-8 object-contain grayscale" referrerPolicy="no-referrer" />
                <div className="w-full border-t border-[#eeeeee]"></div>
                <p className="text-[6px] font-black text-[#666666] uppercase tracking-widest">Authorized Signature</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-3 pt-1.5 border-t border-[#eeeeee] flex justify-between items-center text-[6px] font-black text-[#999999] uppercase tracking-[0.2em]">
          <span>Computer generated invoice</span>
          <span>Date: {new Date().toLocaleDateString()}</span>
          <span>Page 01 of 01</span>
        </div>
      </div>
    </div>
  );
});

export const POSInvoice = React.forwardRef<HTMLDivElement, InvoiceProps>(({ order, company, currencySymbol = '৳' }, ref) => {
  return (
    <div ref={ref} className="p-2 bg-[#ffffff] text-[#000000] font-mono" style={{ width: '80mm' }}>
      <div className="text-center mb-1">
        {company.companyLogo && (
          <img src={company.companyLogo} alt="Logo" className="h-8 object-contain mx-auto mb-1" referrerPolicy="no-referrer" />
        )}
        <h1 className="text-base font-bold uppercase">{company.companyName}</h1>
        <p className="text-[9px]">{company.companyAddress}</p>
        <p className="text-[9px]">Mob: {company.companyMobile}</p>
        <p className="text-[9px]">{company.companyWebsite}</p>
      </div>

      <div className="border-t border-b border-dashed border-[#000000] py-1 mb-1 text-[11px]">
        <div className="flex justify-between">
          <span>Order: #ORD-{order.orderNumber || order.id.slice(0, 8)}</span>
          <span>
            {order.createdAt?.toDate 
              ? order.createdAt.toDate().toLocaleDateString()
              : (order.createdAt?.seconds 
                ? new Date(order.createdAt.seconds * 1000).toLocaleDateString()
                : new Date().toLocaleDateString()
              )
            }
          </span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Cust: {order.customerName}</span>
          <span>{order.customerPhone}</span>
        </div>
      </div>

      <table className="w-full text-[9px] mb-1">
        <thead>
          <tr className="border-b border-dashed border-[#000000]">
            <th className="text-left py-0.5 w-5">SL</th>
            <th className="text-left py-0.5">Item</th>
            <th className="text-center py-0.5">Qty</th>
            <th className="text-right py-0.5">Price</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any, idx: number) => (
            <tr key={idx}>
              <td className="py-0.5">{idx + 1}</td>
              <td className="py-0.5">{item.name || item.productName || 'N/A'}</td>
              <td className="text-center py-0.5">{item.quantity}</td>
              <td className="text-right py-0.5">{currencySymbol}{(item.quantity * item.price || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-[#000000] pt-1 space-y-0.5 text-[9px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{currencySymbol}{(order.subtotal || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery:</span>
          <span>{currencySymbol}{(order.deliveryCharge || 0).toLocaleString()}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{currencySymbol}{(order.discount || 0).toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Total:</span>
          <span>{currencySymbol}{(order.totalAmount || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid:</span>
          <span>{currencySymbol}{(order.paidAmount || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold text-sm">
          <span>Due:</span>
          <span>{currencySymbol}{(order.dueAmount || 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="text-center mt-2 text-[9px]">
        <p className="whitespace-pre-line">{company.invoiceFooterNote || '*** Thank You ***\nPlease visit again'}</p>
      </div>
    </div>
  );
});
