export type UserRole = 'admin' | 'manager' | 'staff';

export interface UserPermissions {
  dashboard: boolean;
  pos: boolean;
  orders: boolean;
  inventory: boolean;
  crm: boolean;
  suppliers: boolean;
  logistics: boolean;
  tasks: boolean;
  finance: boolean;
  hr: boolean;
  team: boolean;
  settings: boolean;
  reports: boolean;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  permissions?: UserPermissions;
  photoURL?: string;
  createdAt?: any;
  lastLogin?: any;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'partial_delivered' | 'cancelled' | 'returned';
export type PaymentMethod = 'COD' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank Transfer';
export type PaymentStatus = 'unpaid' | 'paid' | 'partially_paid';
export type OrderSource = 'Facebook' | 'Messenger' | 'Instagram' | 'Website' | 'WooCommerce' | 'Shopify' | 'Daraz' | 'WhatsApp' | 'In-store' | 'Manual';

export interface OrderItem {
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderLog {
  user: string;
  action: string;
  timestamp: any;
  details?: string;
}

export interface Order {
  id: string;
  orderNumber?: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district?: string;
  area?: string;
  landmark?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  advanceAmount?: number;
  status: OrderStatus;
  courierId?: string;
  courierName?: string;
  trackingNumber?: string;
  courierStatus?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  source: OrderSource;
  notes?: string;
  tags?: string[];
  logs?: OrderLog[];
  returnReason?: string;
  returnType?: 'full' | 'partial';
  isPartialDelivery?: boolean;
  partialDeliveryItems?: OrderItem[];
  fraudScore?: number;
  fraudReason?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: any; // Firestore Timestamp
  tags?: string[];
  segment?: 'New' | 'Repeat' | 'VIP' | 'At Risk';
  notes?: string;
  followUpDate?: any;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  active: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string; // e.g. "Red / XL"
  size?: string;
  color?: string;
  material?: string;
  price: number;
  stockLevel: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  category: string;
  stockLevel: number;
  reorderPoint: number;
  warehouseId: string;
  hasVariants: boolean;
  variants?: ProductVariant[];
  isBundle?: boolean;
  bundleItems?: { productId: string; variantId?: string; quantity: number }[];
}

export interface Courier {
  id: string;
  name: string;
  contact: string;
  apiEnabled: boolean;
  active: boolean;
}

export interface Shipment {
  id: string;
  orderId: string;
  courierId: string;
  trackingNumber: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'returned';
  lastUpdate: any;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details?: string;
  timestamp: any;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string; // User ID
  assignedToName: string;
  assignedBy: string; // User ID
  assignedByName: string;
  status: 'todo' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high';
  dueDate?: any;
  createdAt: any;
  updatedAt: any;
}

export interface Transaction {
  id: string;
  orderId?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  paymentMethod: string;
  accountId?: string;
  date: any; // Firestore Timestamp
  description?: string;
}

export interface Account {
  id: string;
  name: string; // e.g. "Cash", "bKash Merchant", "Bank Asia"
  type: 'cash' | 'bank' | 'mobile_wallet';
  balance: number;
  accountNumber?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
  leadTimeDays?: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: { productId: string; variantId?: string; quantity: number; costPrice: number }[];
  totalAmount: number;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  expectedDate?: any;
  receivedDate?: any;
  createdAt: any;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber?: number;
  items: { productId: string; variantId?: string; quantity: number; reason: string }[];
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  type: 'return' | 'exchange';
  exchangeOrderId?: string;
  refundAmount?: number;
  createdAt: any;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  voucherNo: string;
  dueAmount: number;
  amount: number;
  total: number;
  paymentType: string;
  paidAmount: number;
  remark?: string;
  uid: string;
  createdAt: any;
}

export interface Designation {
  id: string;
  name: string;
  description?: string;
  uid: string;
  createdAt: any;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  designationId: string;
  designationName: string;
  joiningDate: string;
  baseSalary: number;
  profileImage?: string;
  status: 'Active' | 'Inactive';
  uid: string;
  createdAt: any;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  note?: string;
  uid: string;
  createdAt: any;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  note?: string;
  status: 'Pending' | 'Deducted';
  uid: string;
  createdAt: any;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  baseSalary: number;
  deductions: number;
  advanceDeduction: number;
  bonus: number;
  netSalary: number;
  status: 'Paid' | 'Pending';
  paidAt?: any;
  uid: string;
  createdAt: any;
}
