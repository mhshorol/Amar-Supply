import React from 'react';

interface InvoiceProps {
  order: any;
  company: any;
  currencySymbol?: string;
}

export const A5Invoice = React.forwardRef<HTMLDivElement, InvoiceProps>(({ order, company, currencySymbol = '৳' }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans relative" style={{ width: '210mm', minHeight: '148mm', margin: '0 auto' }}>
      {/* Top Black Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-black"></div>

      {/* Header Section */}
      <div className="flex justify-between items-start mt-2 mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {company.companyLogo ? (
              <img src={company.companyLogo} alt="Logo" className="h-12 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex items-center gap-1">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-3 h-3 bg-[#e91e63]"></div>
                  <div className="w-3 h-3 bg-[#2196f3]"></div>
                  <div className="w-3 h-3 bg-[#ffeb3b]"></div>
                  <div className="w-3 h-3 bg-[#4caf50]"></div>
                </div>
                <span className="text-2xl font-bold tracking-tighter">KARUKARJO</span>
              </div>
            )}
          </div>
          <p className="text-[11px] font-bold uppercase mt-1">
            {company.companyName || 'KARUKARJO LTD'} : {company.companyAddress || '44 PEACE TOWER, L# 01&06'}
          </p>
          <p className="text-[11px] font-bold uppercase">
            {company.companyWebsite || 'NEW MODEL TOWN, HAZARIBAG, DHAKA'}
          </p>
          <p className="text-[11px] font-bold">
            {company.companyMobile || '01932626364 , 01734694343'}
          </p>
        </div>
        <div className="text-right">
          <h1 className="text-5xl font-medium tracking-tight text-[#1f2937]">INVOICE</h1>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex justify-between mb-8">
        <div className="max-w-[60%]">
          <h3 className="text-[13px] font-bold mb-1">CUSTOMER DETAILS:</h3>
          <p className="text-xl font-bold mb-1">{order.customerName}</p>
          <p className="text-[13px] font-medium leading-tight">
            {order.customerAddress}
            {order.area && `, ${order.area}`}
            {order.district && `, ${order.district}`}
          </p>
        </div>
        <div className="text-right space-y-1">
          <div className="flex justify-end gap-4">
            <span className="font-bold text-[13px]">DATE:</span>
            <span className="text-[13px] w-32">
              {order.createdAt?.toDate 
                ? order.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                : (order.createdAt?.seconds 
                  ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                  : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                )
              }
            </span>
          </div>
          <div className="flex justify-end gap-4">
            <span className="font-bold text-[13px]">INVOICE NO:</span>
            <span className="text-[13px] w-32 font-bold">#{order.orderNumber || order.id.slice(0, 8)}</span>
          </div>
          <div className="flex justify-end gap-4">
            <span className="font-bold text-[13px]">PHONE:</span>
            <span className="text-[13px] w-32 font-bold">+88 {order.customerPhone}</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-[13px] font-bold uppercase">
            <th className="text-left py-2 w-10">SL</th>
            <th className="text-left py-2">ITEM DESCRIPTION</th>
            <th className="text-center py-2 w-20">QTY</th>
            <th className="text-right py-2 w-32">UNIT PRICE</th>
            <th className="text-right py-2 w-32">TOTAL</th>
          </tr>
        </thead>
        <tbody className="text-[13px]">
          {order.items?.map((item: any, idx: number) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f9fafb]' : 'bg-white'}>
              <td className="py-2 px-1 text-left">{idx + 1}</td>
              <td className="py-2 px-1">
                <span className="font-medium">{item.name || item.productName || 'N/A'}</span>
                {item.variant && <span className="text-[11px] text-[#6b7280] ml-2">({item.variant})</span>}
              </td>
              <td className="text-center py-2">{item.quantity}</td>
              <td className="text-right py-2">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="text-right py-2 font-medium">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {/* Fill empty rows to maintain layout if needed, or just padding */}
          <tr className="border-t border-[#e5e7eb]">
            <td></td>
            <td className="py-2"></td>
            <td></td>
            <td></td>
            <td className="text-right py-2 font-medium">{currencySymbol}0.00</td>
          </tr>
        </tbody>
      </table>

      {/* Footer Section */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="mb-4">
            <p className="text-[13px] font-bold">Notes:</p>
            <p className="text-[12px] text-[#4b5563] italic">{order.notes || 'THANK YOU FOR SHOPPING WITH US'}</p>
          </div>
          <div className="text-[11px] font-bold uppercase space-y-0.5">
            <p>THANK YOU FOR SHOPPING WITH US</p>
            <p>IF POSSIBLE PLEASE GIVE US A REVIEW ON FACEBOOK</p>
            <p>SHOP ONLINE {company.companyWebsite || 'WWW.KARUKARJO.COM.BD'}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="w-56 space-y-1">
            <div className="flex justify-between text-[15px]">
              <span className="font-bold">SUB TOTAL</span>
              <span className="font-bold">{currencySymbol}{order.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[15px]">
              <span className="font-bold">DELIVERY</span>
              <span className="font-bold">{currencySymbol}{order.deliveryCharge?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-[15px]">
                <span className="font-bold">DISCOUNT</span>
                <span className="font-bold">-{currencySymbol}{order.discount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-[15px]">
              <span className="font-bold">PAID</span>
              <span className="font-bold">{currencySymbol}{order.paidAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-3xl font-bold pt-2 border-t border-[#e5e7eb]">
              <span>DUE</span>
              <span>{currencySymbol}{order.dueAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Disclaimer */}
      <div className="absolute bottom-4 left-8 right-8 text-center border-t border-[#e5e7eb] pt-2">
        <p className="text-[10px] text-[#9ca3af]">
          Generated on {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
});

export const POSInvoice = React.forwardRef<HTMLDivElement, InvoiceProps>(({ order, company, currencySymbol = '৳' }, ref) => {
  return (
    <div ref={ref} className="p-4 bg-[#ffffff] text-[#000000] font-mono" style={{ width: '80mm' }}>
      <div className="text-center mb-4">
        {company.companyLogo && (
          <img src={company.companyLogo} alt="Logo" className="h-10 object-contain mx-auto mb-2" referrerPolicy="no-referrer" />
        )}
        <h1 className="text-lg font-bold uppercase">{company.companyName}</h1>
        <p className="text-[10px]">{company.companyAddress}</p>
        <p className="text-[10px]">Mob: {company.companyMobile}</p>
        <p className="text-[10px]">{company.companyWebsite}</p>
      </div>

      <div className="border-t border-b border-dashed border-[#e5e7eb] py-2 mb-2 text-[10px]">
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
        <div className="flex justify-between">
          <span>Cust: {order.customerName}</span>
          <span>{order.customerPhone}</span>
        </div>
      </div>

      <table className="w-full text-[10px] mb-2">
        <thead>
          <tr className="border-b border-dashed border-[#e5e7eb]">
            <th className="text-left py-1 w-6">SL</th>
            <th className="text-left py-1">Item</th>
            <th className="text-center py-1">Qty</th>
            <th className="text-right py-1">Price</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any, idx: number) => (
            <tr key={idx}>
              <td className="py-1">{idx + 1}</td>
              <td className="py-1">{item.name || item.productName || 'N/A'}</td>
              <td className="text-center py-1">{item.quantity}</td>
              <td className="text-right py-1">{currencySymbol}{(item.quantity * item.price).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-[#e5e7eb] pt-2 space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{currencySymbol}{order.subtotal?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery:</span>
          <span>{currencySymbol}{order.deliveryCharge?.toLocaleString()}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{currencySymbol}{order.discount?.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-dashed border-[#e5e7eb] pt-1">
          <span>Total:</span>
          <span>{currencySymbol}{order.totalAmount?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid:</span>
          <span>{currencySymbol}{order.paidAmount?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Due:</span>
          <span>{currencySymbol}{order.dueAmount?.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-center mt-6 text-[10px]">
        <p>*** Thank You ***</p>
        <p>Please visit again</p>
      </div>
    </div>
  );
});
