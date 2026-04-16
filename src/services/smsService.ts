import { db, doc, getDoc } from '../firebase';

export async function sendOrderConfirmationSMS(order: any) {
  try {
    const globalSettingsSnap = await getDoc(doc(db, 'settings', 'company'));
    const globalSettings = globalSettingsSnap.data();
    
    if (!globalSettings?.sms?.enableOrderConfirmation) {
      return false; // SMS is disabled
    }

    const { confirmationTemplate } = globalSettings.sms;
    const message = confirmationTemplate
      .replace('{customerName}', order.customerName || 'Customer')
      .replace('{orderNumber}', order.orderNumber || order.id || 'N/A')
      .replace('{totalAmount}', order.totalAmount || '0')
      .replace('{companyName}', globalSettings.companyName || 'Our Store');
      
    console.log('Sending SMS to:', order.customerPhone);
    console.log('Message:', message);
    
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: order.customerPhone, message })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to send SMS:', errorData);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}
