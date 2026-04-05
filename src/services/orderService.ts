import { db, collection, query, where, getDocs, Timestamp } from '../firebase';

export interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
}

export interface DuplicateCheckParams {
  customerPhone: string;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  timeWindowHours?: number; // Default to 24 hours
}

/**
 * Checks if a similar order already exists in the system within a given time window.
 * Returns the duplicate order if found, otherwise null.
 */
export async function checkDuplicateOrder({
  customerPhone,
  customerName,
  items,
  totalAmount,
  timeWindowHours = 24
}: DuplicateCheckParams) {
  try {
    // Calculate the start of the time window
    const timeWindowStart = new Date();
    timeWindowStart.setHours(timeWindowStart.getHours() - timeWindowHours);
    const startTimestamp = Timestamp.fromDate(timeWindowStart);

    // Query orders for the same phone number within the time window
    // We filter by phone number first as it's the primary key for duplicates
    const q = query(
      collection(db, 'orders'),
      where('customerPhone', '==', customerPhone),
      where('createdAt', '>=', startTimestamp)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    // Sort items by productId and variantId for consistent comparison
    const sortedNewItems = [...items].sort((a, b) => {
      const idA = `${a.productId}-${a.variantId || ''}`;
      const idB = `${b.productId}-${b.variantId || ''}`;
      return idA.localeCompare(idB);
    });

    for (const doc of querySnapshot.docs) {
      const existingOrder = doc.data();
      
      // 1. Check Order Value (Strict match)
      if (Math.abs(existingOrder.totalAmount - totalAmount) > 0.01) {
        continue;
      }

      // 2. Check Customer Name (Optional match - if provided and different, we might still consider it a duplicate if phone matches)
      // The user said "Customer Name (optional match)", so we'll prioritize phone and products.
      // If names are completely different, we might flag it but still consider it a duplicate if other fields match.
      
      // 3. Check Products / SKU
      const existingItems = existingOrder.items || [];
      if (existingItems.length !== items.length) {
        continue;
      }

      const sortedExistingItems = [...existingItems].sort((a: any, b: any) => {
        const idA = `${a.productId}-${a.variantId || ''}`;
        const idB = `${b.productId}-${b.variantId || ''}`;
        return idA.localeCompare(idB);
      });

      const itemsMatch = sortedNewItems.every((item, index) => {
        const existingItem = sortedExistingItems[index];
        return (
          item.productId === existingItem.productId &&
          (item.variantId || '') === (existingItem.variantId || '') &&
          item.quantity === existingItem.quantity
        );
      });

      if (itemsMatch) {
        return { id: doc.id, ...existingOrder } as any;
      }
    }

    return null;
  } catch (error) {
    console.error("Error checking for duplicate orders:", error);
    return null;
  }
}
