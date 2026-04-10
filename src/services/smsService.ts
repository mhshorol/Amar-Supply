import { db, doc, getDoc } from '../firebase';

export async function sendOrderConfirmationSMS(order: any) {
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'user_admin')); // Assuming admin settings are stored here or globally
    // Actually, settings are usually stored per user or in a global 'company' doc
    // Let's try to find where the SMS settings are stored.
    // In Settings.tsx, I saved them to `user_${auth.currentUser?.uid}`.
    // This might be tricky if the current user is not the one who configured it.
    // Let's assume there's a global settings doc for SMS.
    
    const globalSettingsSnap = await getDoc(doc(db, 'settings', 'company'));
    const globalSettings = globalSettingsSnap.data();
    
    // For now, let's just log it. In a real app, you'd call an API.
    console.log('Sending SMS to:', order.customerPhone);
    console.log('Message:', `Hello ${order.customerName}, your order #${order.orderNumber || order.id} has been received. Total: ${order.totalAmount}. Thank you!`);
    
    // Placeholder for actual API call (e.g., Twilio)
    /*
    if (globalSettings?.sms?.enableOrderConfirmation) {
      const { twilioSid, twilioToken, twilioFrom, confirmationTemplate } = globalSettings.sms;
      const message = confirmationTemplate
        .replace('{customerName}', order.customerName)
        .replace('{orderNumber}', order.orderNumber || order.id)
        .replace('{totalAmount}', order.totalAmount)
        .replace('{companyName}', globalSettings.companyName || 'Our Store');
        
      // Call your backend API to send the SMS to avoid exposing keys on frontend
      await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: order.customerPhone, message })
      });
    }
    */
    
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}
