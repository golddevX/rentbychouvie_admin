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
  | 'deposit_requested'
  | 'deposit_received'
  | 'confirmed'
  | 'scheduled_pickup'
  | 'picked_up'
  | 'return_pending'
  | 'returned'
  | 'completed'
  | 'cancelled'
  | 'late_return'
  | 'damage_review';

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

export const staff: Staff[] = [
  { id: 'u1', name: 'Linh Nguyen', email: 'admin@test.com', role: 'super_admin', active: true, workload: 9 },
  { id: 'u2', name: 'Mai Tran', email: 'manager@test.com', role: 'manager', active: true, workload: 12 },
  { id: 'u3', name: 'An Le', email: 'sales@test.com', role: 'sales', active: true, workload: 18 },
  { id: 'u4', name: 'Khoa Pham', email: 'operator@test.com', role: 'operator', active: true, workload: 7 },
  { id: 'u5', name: 'Nhi Vo', email: 'cashier@test.com', role: 'cashier', active: true, workload: 11 },
];

export const leads: Lead[] = [
  {
    id: 'lead-1024',
    customer: 'Nguyen Thi Lan',
    email: 'lan.nguyen@test.com',
    phone: '0911000001',
    source: 'web',
    status: 'new',
    staff: 'An Le',
    date: '2026-04-18',
    requestedLook: 'Ao dai for graduation shoot',
    budget: 900000,
    notes: 'Needs two looks and prefers red or ivory tones.',
  },
  {
    id: 'lead-1025',
    customer: 'Tran Van Minh',
    email: 'minh.tran@test.com',
    phone: '0911000002',
    source: 'walk-in',
    status: 'contacted',
    staff: 'An Le',
    date: '2026-04-18',
    requestedLook: 'Black formal vest',
    budget: 650000,
    notes: 'Asked for same-day fitting and pickup next week.',
  },
  {
    id: 'lead-1026',
    customer: 'Le Thi Hoa',
    email: 'hoa.le@test.com',
    phone: '0911000003',
    source: 'referral',
    status: 'booking_created',
    staff: 'Mai Tran',
    date: '2026-04-17',
    requestedLook: 'White party dress and accessories',
    budget: 1200000,
    notes: 'Converted to booking BK-2407.',
  },
  {
    id: 'lead-1027',
    customer: 'Pham Quang Huy',
    email: 'huy.pham@test.com',
    phone: '0911000004',
    source: 'zalo',
    status: 'deposit_requested',
    staff: 'An Le',
    date: '2026-04-16',
    requestedLook: 'Gold evening gown',
    budget: 1500000,
    notes: 'Waiting for deposit policy approval.',
  },
  {
    id: 'lead-1028',
    customer: 'Vo Thanh Mai',
    email: 'mai.vo@test.com',
    phone: '0911000005',
    source: 'facebook',
    status: 'lost',
    staff: 'An Le',
    date: '2026-04-15',
    requestedLook: 'Ao dai rental',
    budget: 400000,
    notes: 'Event date changed.',
  },
];

export const appointments: Appointment[] = [
  { id: 'apt-3101', customer: 'Nguyen Thi Lan', staff: 'An Le', type: 'consultation', status: 'scheduled', date: '2026-04-18', time: '09:30', room: 'Studio 2' },
  { id: 'apt-3102', customer: 'Tran Van Minh', staff: 'An Le', type: 'fitting', status: 'checked_in', date: '2026-04-18', time: '10:45', room: 'Fitting A' },
  { id: 'apt-3103', customer: 'Pham Quang Huy', staff: 'Khoa Pham', type: 'pickup', status: 'scheduled', date: '2026-04-18', time: '14:00', room: 'Pickup desk' },
  { id: 'apt-3104', customer: 'Dang Minh Khoa', staff: 'Khoa Pham', type: 'return', status: 'scheduled', date: '2026-04-18', time: '16:30', room: 'Return desk' },
  { id: 'apt-3105', customer: 'Bui Yen Nhi', staff: 'Mai Tran', type: 'fitting', status: 'completed', date: '2026-04-19', time: '11:00', room: 'Fitting B' },
];

export const bookings: Booking[] = [
  {
    id: 'BK-2407',
    customer: 'Le Thi Hoa',
    phone: '0911000003',
    source: 'lead-1026',
    status: 'deposit_received',
    staff: 'Mai Tran',
    startDate: '2026-05-07',
    endDate: '2026-05-09',
    pickupAt: '2026-05-07 10:00',
    returnAt: '2026-05-09 17:30',
    product: 'Dam Trang Du Tiec',
    variant: 'White satin / long',
    itemCode: 'DRESS-WHITE-001',
    size: 'M',
    rentalFee: 560000,
    deposit: 200000,
    paid: 760000,
    refundableDeposit: 200000,
    previewRequest: 'PV-8021',
    timeline: ['Lead won', 'Booking confirmed', 'Deposit paid by card', 'Receipt RC-2407 printed'],
  },
  {
    id: 'BK-2408',
    customer: 'Pham Quang Huy',
    phone: '0911000004',
    source: 'walk-in',
    status: 'picked_up',
    staff: 'An Le',
    startDate: '2026-04-17',
    endDate: '2026-04-20',
    pickupAt: '2026-04-17 15:00',
    returnAt: '2026-04-20 18:00',
    product: 'Dam Da Hoi Vang',
    variant: 'Gold evening gown',
    itemCode: 'GOWN-GOLD-001',
    size: 'S',
    rentalFee: 1350000,
    deposit: 200000,
    paid: 1550000,
    refundableDeposit: 200000,
    timeline: ['Booking confirmed', 'Bank transfer verified', 'Pickup completed by Khoa Pham'],
  },
  {
    id: 'BK-2409',
    customer: 'Dang Minh Khoa',
    phone: '0911000006',
    source: 'web',
    status: 'damage_review',
    staff: 'Mai Tran',
    startDate: '2026-04-12',
    endDate: '2026-04-14',
    pickupAt: '2026-04-12 09:00',
    returnAt: '2026-04-14 17:00',
    product: 'Ao Dai Do Truyen Thong',
    variant: 'Red silk / classic',
    itemCode: 'AODAI-RED-002',
    size: 'L',
    rentalFee: 500000,
    deposit: 200000,
    paid: 800000,
    refundableDeposit: 100000,
    timeline: ['Returned with stain', 'Cleaning fee proposed', 'Partial refund pending approval'],
  },
  {
    id: 'BK-2410',
    customer: 'Bui Yen Nhi',
    phone: '0911000008',
    source: 'zalo',
    status: 'deposit_requested',
    staff: 'An Le',
    startDate: '2026-05-21',
    endDate: '2026-05-23',
    pickupAt: '2026-05-21 11:00',
    returnAt: '2026-05-23 19:00',
    product: 'Vest Den Nam',
    variant: 'Black slim fit',
    itemCode: 'VEST-BLACK-003',
    size: 'XL',
    rentalFee: 600000,
    deposit: 200000,
    paid: 0,
    refundableDeposit: 0,
    timeline: ['Booking draft created', 'Bank transfer proof pending'],
  },
];

export const payments: Payment[] = [
  { id: 'PAY-5001', bookingId: 'BK-2407', customer: 'Le Thi Hoa', type: 'booking_deposit', method: 'cash', status: 'completed', amount: 280000, paidAt: '2026-04-17 10:18', receiptId: 'RC-2407-D' },
  { id: 'PAY-5002', bookingId: 'BK-2407', customer: 'Le Thi Hoa', type: 'rental_payment', method: 'ewallet', status: 'completed', amount: 280000, paidAt: '2026-04-17 10:20', receiptId: 'RC-2407-R' },
  { id: 'PAY-5003', bookingId: 'BK-2408', customer: 'Pham Quang Huy', type: 'security_deposit', method: 'bank_transfer', status: 'completed', amount: 500000, paidAt: '2026-04-17 14:50', receiptId: 'RC-2408-S' },
  { id: 'PAY-5004', bookingId: 'BK-2409', customer: 'Dang Minh Khoa', type: 'fee', method: 'cash', status: 'partially_refunded', amount: 500000, paidAt: '2026-04-14 18:12', receiptId: 'RC-2409-RET' },
  { id: 'PAY-5005', bookingId: 'BK-2410', customer: 'Bui Yen Nhi', type: 'booking_deposit', method: 'bank_transfer', status: 'processing', amount: 300000, paidAt: 'Waiting', receiptId: undefined },
];

export const inventory: InventoryItem[] = [
  { id: 'item-001', product: 'Ao Dai Do Truyen Thong', variant: 'Red silk / classic', size: 'L', itemCode: 'AODAI-RED-001', qrCode: 'RF-AODAI-RED-001', status: 'available', condition: 'good', location: 'Rack A1', history: ['Steamed', 'Available for booking'] },
  { id: 'item-002', product: 'Ao Dai Do Truyen Thong', variant: 'Red silk / classic', size: 'L', itemCode: 'AODAI-RED-002', qrCode: 'RF-AODAI-RED-002', status: 'damaged', condition: 'dirty', location: 'Care desk', currentBooking: 'BK-2409', maintenanceNote: 'Needs stain removal before next rental.', history: ['Returned with stain', 'Damage review opened'] },
  { id: 'item-003', product: 'Dam Da Hoi Vang', variant: 'Gold evening gown', size: 'S', itemCode: 'GOWN-GOLD-001', qrCode: 'RF-GOWN-GOLD-001', status: 'rented', condition: 'good', location: 'With customer', currentBooking: 'BK-2408', history: ['Picked up by customer', 'Return due 2026-04-20'] },
  { id: 'item-004', product: 'Dam Da Hoi Vang', variant: 'Gold evening gown', size: 'M', itemCode: 'GOWN-GOLD-002', qrCode: 'RF-GOWN-GOLD-002', status: 'maintenance', condition: 'good', location: 'Tailor bench', maintenanceNote: 'Hem check and steaming.', history: ['Maintenance block created'] },
  { id: 'item-005', product: 'Vest Den Nam', variant: 'Black slim fit', size: 'XL', itemCode: 'VEST-BLACK-003', qrCode: 'RF-VEST-BLACK-003', status: 'available', condition: 'good', location: 'Rack B2', history: ['Inspected', 'Ready for pickup'] },
  { id: 'item-006', product: 'Bo Phu Kien Chup Anh', variant: 'Accessory set', size: 'One size', itemCode: 'ACCESSORY-002', qrCode: 'RF-ACCESSORY-002', status: 'retired', condition: 'incomplete', location: 'Archive', maintenanceNote: 'Missing scarf, retired from rentable stock.', history: ['Marked retired'] },
];

export const previewRequests: PreviewRequest[] = [
  { id: 'PV-8021', customer: 'Le Thi Hoa', garment: 'Dam Trang Du Tiec', status: 'completed', requestedAt: '2026-04-17 09:12', result: 'Preview accepted, warm indoor lighting selected.' },
  { id: 'PV-8022', customer: 'Nguyen Thi Lan', garment: 'Ao Dai Do Truyen Thong', status: 'pending', requestedAt: '2026-04-18 08:40', result: 'Waiting for source photo.' },
  { id: 'PV-8023', customer: 'Pham Quang Huy', garment: 'Dam Da Hoi Vang', status: 'processing', requestedAt: '2026-04-18 10:05', result: 'Background removal in progress.' },
  { id: 'PV-8024', customer: 'Vo Thanh Mai', garment: 'Ao Dai Do Truyen Thong', status: 'rejected', requestedAt: '2026-04-15 16:24', result: 'Rejected because the photo was too blurred.' },
];

export const auditLogs: AuditLog[] = [
  {
    id: 'aud-9001',
    action: 'RETURN_INSPECTED',
    entity: 'ReturnInspection',
    entityId: 'insp-2409',
    bookingId: 'BK-2409',
    inventoryItemId: 'item-002',
    actor: 'Khoa Pham',
    summary: 'Inspected return as damaged; suggested fee 500,000 VND.',
    createdAt: '2026-04-18T10:24:00.000Z',
    before: { condition: 'good', status: 'RENTED' },
    after: { condition: 'dirty', suggestedFee: 500000, status: 'DAMAGE_REVIEW' },
  },
  {
    id: 'aud-9002',
    action: 'PAYMENT_PROCESSED',
    entity: 'Payment',
    entityId: 'PAY-5004',
    bookingId: 'BK-2409',
    paymentId: 'PAY-5004',
    actor: 'Nhi Vo',
    summary: 'Processed return fee payment and partial refund.',
    createdAt: '2026-04-18T10:31:00.000Z',
    before: { status: 'PROCESSING', amountRefunded: 0 },
    after: { status: 'PARTIALLY_REFUNDED', amountRefunded: 100000 },
  },
  {
    id: 'aud-9003',
    action: 'INVENTORY_LOCKED',
    entity: 'Booking',
    entityId: 'BK-2407',
    bookingId: 'BK-2407',
    inventoryItemId: 'item-001',
    actor: 'Mai Tran',
    summary: 'Booking deposit completed; inventory locked.',
    createdAt: '2026-04-17T10:20:00.000Z',
    before: { status: 'DEPOSIT_REQUESTED', bookingDepositPaid: 0 },
    after: { status: 'CONFIRMED', bookingDepositPaid: 280000, lockedAt: '2026-04-17T10:20:00.000Z' },
  },
];

export const disputes: Dispute[] = [
  {
    id: 'dsp-001',
    caseNumber: 'DSP-2026-042401',
    title: 'Damage fee disputed after return inspection',
    category: 'DAMAGE_FEE',
    priority: 'HIGH',
    status: 'WAITING_ON_MANAGER',
    summary: 'Customer disputes the cleaning and repair deduction on returned ao dai. Pickup notes did not mention the stain.',
    customerPosition: 'Customer says stain was present before pickup and requests the full security deposit back.',
    internalNotes: 'Compare pickup handoff notes, return evidence, and next-booking impact before approving adjustment.',
    requestedAmount: 500000,
    approvedAmount: 0,
    bookingId: 'BK-2409',
    paymentId: 'PAY-5004',
    inventoryItemId: 'item-002',
    assignedTo: 'Mai Tran',
    createdAt: '2026-04-18T11:00:00.000Z',
    dueAt: '2026-04-19T11:00:00.000Z',
    evidence: [
      {
        id: 'ev-001',
        fileName: 'return-stain-photo.jpg',
        fileUrl: 'https://example.com/evidence/return-stain-photo.jpg',
        evidenceType: 'return_photo',
        note: 'Photo captured at return desk.',
        createdAt: '2026-04-18T11:02:00.000Z',
      },
    ],
  },
  {
    id: 'dsp-002',
    caseNumber: 'DSP-2026-042402',
    title: 'Refund timing question for deposit hold',
    category: 'REFUND',
    priority: 'MEDIUM',
    status: 'IN_REVIEW',
    summary: 'Customer asks why refund was delayed after gateway settlement.',
    customerPosition: 'Customer wants confirmation of refund method and expected date.',
    requestedAmount: 200000,
    approvedAmount: 0,
    bookingId: 'BK-2407',
    paymentId: 'PAY-5002',
    assignedTo: 'Nhi Vo',
    createdAt: '2026-04-18T12:18:00.000Z',
    dueAt: '2026-04-20T09:00:00.000Z',
    evidence: [],
  },
];

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
  if (['pending', 'processing', 'new', 'deposit_requested', 'return_pending', 'maintenance', 'damage_review'].includes(status)) return 'warning';
  if (['cancelled', 'lost', 'failed', 'damaged', 'late_return', 'retired'].includes(status)) return 'danger';
  if (['confirmed', 'contacted', 'deposit_received', 'picked_up', 'rented'].includes(status)) return 'info';
  return 'neutral';
}
