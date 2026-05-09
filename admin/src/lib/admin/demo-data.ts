import type { Role } from './permissions';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export type Staff = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  workload: number;
};

export type Lead = {
  id: string;
  customer: string;
  email: string;
  phone: string;
  source: string;
  status: 'new' | 'contacted' | 'deposit_requested' | 'deposit_received' | 'booking_created' | 'lost';
  staff: string;
  date: string;
  requestedLook: string;
  budget: number;
  notes: string;
};

export type Appointment = {
  id: string;
  customer: string;
  staff: string;
  type: 'consultation' | 'fitting' | 'pickup' | 'return';
  status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled';
  date: string;
  time: string;
  room: string;
};

export type BookingStage =
  | 'draft'
  | 'awaiting_security_deposit'
  | 'awaiting_remaining_payment'
  | 'ready_for_pickup'
  | 'deposit_requested'
  | 'deposit_received'
  | 'confirmed'
  | 'scheduled_pickup'
  | 'picked_up'
  | 'return_pending'
  | 'settlement_pending'
  | 'returned'
  | 'completed'
  | 'cancelled';

export type Booking = {
  id: string;
  customer: string;
  phone: string;
  source: string;
  status: BookingStage;
  staff: string;
  startDate: string;
  endDate: string;
  pickupAt: string;
  returnAt: string;
  product: string;
  variant: string;
  itemCode: string;
  size: string;
  rentalFee: number;
  deposit: number;
  paid: number;
  refundableDeposit: number;
  previewRequest?: string;
  timeline: string[];
};

export type Payment = {
  id: string;
  bookingId: string;
  customer: string;
  type: 'booking_deposit' | 'rental_payment' | 'security_deposit' | 'fee' | 'refund';
  method: 'cash' | 'bank_transfer' | 'ewallet';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  amount: number;
  paidAt: string;
  receiptId?: string;
};

export type InventoryItem = {
  id: string;
  product: string;
  variant: string;
  size: string;
  itemCode: string;
  qrCode: string;
  status: 'available' | 'rented' | 'maintenance' | 'damaged' | 'retired';
  condition: 'good' | 'dirty' | 'damaged' | 'incomplete';
  location: string;
  currentBooking?: string;
  maintenanceNote?: string;
  history: string[];
};

export type PreviewRequest = {
  id: string;
  customer: string;
  garment: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  result: string;
};

export type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  actor: string;
  createdAt: string;
  bookingId?: string;
  paymentId?: string;
  inventoryItemId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

export type Dispute = {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_REVIEW' | 'WAITING_ON_CUSTOMER' | 'WAITING_ON_MANAGER' | 'RESOLVED' | 'REJECTED' | 'CANCELLED';
  summary: string;
  customerPosition?: string;
  internalNotes?: string;
  requestedAmount: number;
  approvedAmount: number;
  bookingId?: string;
  paymentId?: string;
  inventoryItemId?: string;
  assignedTo?: string;
  createdAt: string;
  dueAt?: string;
  evidence: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    evidenceType: string;
    note?: string;
    createdAt: string;
  }>;
};

export const staff: Staff[] = [];
export const leads: Lead[] = [];
export const appointments: Appointment[] = [];
export const bookings: Booking[] = [];
export const payments: Payment[] = [];
export const inventory: InventoryItem[] = [];
export const previewRequests: PreviewRequest[] = [];
export const auditLogs: AuditLog[] = [];
export const disputes: Dispute[] = [];

export const bookingStatusFlow: BookingStage[] = [
  'draft',
  'deposit_requested',
  'deposit_received',
  'confirmed',
  'scheduled_pickup',
  'picked_up',
  'return_pending',
  'returned',
  'completed',
];

export function currency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function statusTone(status: string): Tone {
  if (['completed', 'booking_created', 'available', 'deposit_received', 'returned'].includes(status)) return 'success';
  if (['pending', 'processing', 'new', 'deposit_requested', 'return_pending', 'awaiting_security_deposit', 'awaiting_remaining_payment', 'maintenance'].includes(status)) return 'warning';
  if (['cancelled', 'lost', 'failed', 'damaged', 'settlement_pending', 'retired'].includes(status)) return 'danger';
  if (['confirmed', 'contacted', 'deposit_received', 'picked_up', 'rented'].includes(status)) return 'info';
  return 'neutral';
}
