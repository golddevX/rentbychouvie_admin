import type { Tone } from './demo-data';
import type { Role } from './permissions';

export type RbacModule =
  | 'dashboard'
  | 'reports'
  | 'lead'
  | 'appointment'
  | 'booking'
  | 'payment'
  | 'receipt'
  | 'inventory'
  | 'qr'
  | 'scan'
  | 'pickup'
  | 'return'
  | 'preview'
  | 'dispute'
  | 'audit'
  | 'user'
  | 'role'
  | 'client_settings'
  | 'system_settings';

export type PermissionRisk = 'low' | 'medium' | 'high' | 'critical';

export type RbacPermission = {
  id: `${RbacModule}.${string}`;
  module: RbacModule;
  action: string;
  title: string;
  description: string;
  risk: PermissionRisk;
};

export type RbacRole = {
  id: Role;
  label: string;
  description: string;
  operatingModel: string;
  permissions: string[];
};

export type RbacUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: 'active' | 'disabled';
  lastActiveAt: string;
  createdAt: string;
  workload: number;
  activity: Array<{ time: string; title: string; detail: string }>;
};

const moduleTitles: Record<RbacModule, string> = {
  dashboard: 'Tổng quan',
  reports: 'Báo cáo',
  lead: 'Lead',
  appointment: 'Lịch hẹn',
  booking: 'Booking',
  payment: 'Thanh toán',
  receipt: 'Biên lai',
  inventory: 'Kho hàng',
  qr: 'Nhãn QR',
  scan: 'Quét QR',
  pickup: 'Quầy bàn giao',
  return: 'Quầy nhận trả',
  preview: 'Hàng đợi preview',
  dispute: 'Tranh chấp',
  audit: 'Kiểm toán',
  user: 'Người dùng',
  role: 'Vai trò',
  client_settings: 'Cài đặt client',
  system_settings: 'Cài đặt hệ thống',
};

export const rbacModules = Object.keys(moduleTitles) as RbacModule[];

export function moduleLabel(module: RbacModule) {
  return moduleTitles[module];
}

function p(module: RbacModule, action: string, title: string, description: string, risk: PermissionRisk = 'low'): RbacPermission {
  return {
    id: `${module}.${action}` as `${RbacModule}.${string}`,
    module,
    action,
    title,
    description,
    risk,
  };
}

export const permissionCatalog: RbacPermission[] = [
  p('dashboard', 'read', 'Read dashboard', 'View the operating command center and high-level blockers.'),
  p('reports', 'read', 'Read reports', 'View revenue, inventory and conversion reporting.'),
  p('reports', 'export', 'Export reports', 'Export operational reports for leadership review.', 'medium'),
  p('lead', 'read', 'Read leads', 'View lead queue, customer intent and commercial status.'),
  p('lead', 'create', 'Create leads', 'Create new customer inquiries from web, Zalo or walk-in demand.'),
  p('lead', 'update', 'Update leads', 'Edit lead qualification, notes and owner.'),
  p('lead', 'request_deposit', 'Request deposit', 'Move qualified lead into a deposit request workflow.', 'medium'),
  p('lead', 'convert_to_booking', 'Convert to booking', 'Convert qualified demand into a booking draft.', 'medium'),
  p('appointment', 'read', 'Read appointments', 'View fitting, consultation, pickup and return calendar.'),
  p('appointment', 'create', 'Create appointments', 'Create customer appointments and resource holds.'),
  p('appointment', 'update', 'Update appointments', 'Reschedule, assign staff or complete appointments.'),
  p('booking', 'read', 'Read bookings', 'View rental bookings, lifecycle state and payment position.'),
  p('booking', 'create', 'Create bookings', 'Create bookings from leads or walk-in demand.', 'medium'),
  p('booking', 'update', 'Update bookings', 'Edit booking dates, customer context and lifecycle notes.', 'medium'),
  p('booking', 'confirm', 'Confirm bookings', 'Confirm bookings after deposit and availability checks.', 'high'),
  p('booking', 'cancel', 'Cancel bookings', 'Cancel bookings and release commercial commitments.', 'high'),
  p('payment', 'read', 'Read payments', 'View payment status and payment history.'),
  p('payment', 'create', 'Create payments', 'Record deposits, rental payments, fees and security deposit holds.', 'medium'),
  p('payment', 'process', 'Process payments', 'Mark payment records as processed after verification.', 'high'),
  p('payment', 'refund', 'Issue refunds', 'Issue or record refunds against payments.', 'critical'),
  p('payment', 'override', 'Override payment state', 'Override failed or disputed payment state.', 'critical'),
  p('receipt', 'read', 'Read receipts', 'View generated receipts and bill details.'),
  p('receipt', 'print', 'Print receipts', 'Print customer receipts for deposit, rental and return workflows.'),
  p('inventory', 'read', 'Read inventory', 'View products, variants and physical item status.'),
  p('inventory', 'create', 'Create inventory', 'Create products, variants or physical item records.', 'high'),
  p('inventory', 'update', 'Update inventory', 'Edit product, variant and item details.', 'high'),
  p('inventory', 'status_update', 'Update item status', 'Move items between available, rented, maintenance, damaged and retired.', 'high'),
  p('qr', 'read', 'Read QR labels', 'View QR code metadata and label state.'),
  p('qr', 'regenerate', 'Regenerate QR labels', 'Rotate QR labels and invalidate old labels.', 'critical'),
  p('scan', 'read', 'Read scan result', 'Resolve scanned QR codes to item and booking context.'),
  p('scan', 'operate', 'Operate scan desk', 'Use scan result to drive pickup, return and inventory actions.', 'medium'),
  p('pickup', 'read', 'Read pickup queue', 'View bookings ready for pickup handoff.'),
  p('pickup', 'confirm', 'Confirm pickup', 'Confirm physical item handoff after QR validation.', 'high'),
  p('return', 'read', 'Read return queue', 'View active returns and inspection context.'),
  p('return', 'inspect', 'Inspect returns', 'Capture condition, evidence and suggested deductions.', 'high'),
  p('return', 'settle', 'Settle returns', 'Finalize return settlement and deposit impact.', 'critical'),
  p('preview', 'read', 'Read preview queue', 'View AI preview requests and customer upload state.'),
  p('preview', 'update', 'Update preview queue', 'Assign, process or reject preview requests.', 'medium'),
  p('dispute', 'read', 'Read disputes', 'View disputes, evidence and resolution timeline.'),
  p('dispute', 'create', 'Create disputes', 'Open a dispute case from payment, return or inventory context.', 'medium'),
  p('dispute', 'resolve', 'Resolve disputes', 'Resolve disputes and record outcome.', 'critical'),
  p('audit', 'read', 'Read audit logs', 'View security and operational audit history.', 'medium'),
  p('user', 'read', 'Read users', 'View admin users and their role assignment.', 'medium'),
  p('user', 'create', 'Create users', 'Invite or create operational users.', 'critical'),
  p('user', 'update', 'Update users', 'Edit user profile, status or assigned role.', 'critical'),
  p('user', 'archive', 'Archive users', 'Disable user access by archiving the account.', 'critical'),
  p('user', 'reset_password', 'Reset passwords', 'Trigger password reset or temporary credential workflow.', 'critical'),
  p('role', 'read', 'Read roles', 'View roles and inherited permissions.', 'medium'),
  p('role', 'update', 'Update roles', 'Change role descriptions or role-level policy.', 'critical'),
  p('role', 'permissions_update', 'Update role permissions', 'Change role permission assignments.', 'critical'),
  p('client_settings', 'read', 'Read client settings', 'View storefront control center settings.', 'medium'),
  p('client_settings', 'update', 'Update client settings', 'Edit storefront settings draft.', 'high'),
  p('client_settings', 'publish', 'Publish client settings', 'Publish storefront settings to the customer-facing client.', 'critical'),
  p('system_settings', 'read', 'Read system settings', 'View operational system settings.', 'medium'),
  p('system_settings', 'update', 'Update system settings', 'Change system-level operational settings.', 'critical'),
];

const allPermissionIds = permissionCatalog.map((permission) => permission.id);

export const defaultRbacRoles: RbacRole[] = [
  {
    id: 'super_admin',
    label: 'Super admin',
    description: 'Full platform ownership, including users, roles, permissions, refunds and settings publication.',
    operatingModel: 'Only for trusted administrators who can change access policy and critical money flows.',
    permissions: allPermissionIds,
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Broad operational control, reporting, exception handling and dispute resolution.',
    operatingModel: 'Can supervise operations and approve refunds, but cannot manage the role-permission system by default.',
    permissions: allPermissionIds.filter((id) => !id.startsWith('role.') && !['user.create', 'user.archive', 'user.reset_password', 'client_settings.publish', 'system_settings.update', 'payment.override', 'qr.regenerate'].includes(id)),
  },
  {
    id: 'sales',
    label: 'Sales',
    description: 'Lead, appointment and booking creation for customer-facing sales workflows.',
    operatingModel: 'Can qualify demand and create bookings. No refunds, inventory edits or client settings publication.',
    permissions: [
      'dashboard.read',
      'lead.read',
      'lead.create',
      'lead.update',
      'lead.request_deposit',
      'lead.convert_to_booking',
      'appointment.read',
      'appointment.create',
      'appointment.update',
      'booking.read',
      'booking.create',
      'booking.update',
      'scan.read',
      'preview.read',
      'preview.update',
    ],
  },
  {
    id: 'operator',
    label: 'Operator',
    description: 'Pickup, return, scan and physical inventory movement.',
    operatingModel: 'Can move stock through fulfillment. No payment edits, pricing overrides or role access.',
    permissions: [
      'dashboard.read',
      'inventory.read',
      'inventory.status_update',
      'qr.read',
      'scan.read',
      'scan.operate',
      'pickup.read',
      'pickup.confirm',
      'return.read',
      'return.inspect',
      'return.settle',
      'preview.read',
      'preview.update',
      'dispute.read',
      'dispute.create',
    ],
  },
  {
    id: 'cashier',
    label: 'Cashier',
    description: 'Payments, receipts and policy-bound refund handling.',
    operatingModel: 'Can operate money desk and receipts. Cannot modify inventory or manage lead/booking ownership.',
    permissions: [
      'dashboard.read',
      'booking.read',
      'payment.read',
      'payment.create',
      'payment.process',
      'payment.refund',
      'receipt.read',
      'receipt.print',
      'dispute.read',
      'dispute.create',
    ],
  },
];

export const rbacUsers: RbacUser[] = [
  {
    id: 'u1',
    fullName: 'Linh Nguyen',
    email: 'admin@test.com',
    phone: '0901000001',
    role: 'super_admin',
    status: 'active',
    lastActiveAt: '2026-04-23 09:25',
    createdAt: '2026-01-08',
    workload: 9,
    activity: [
      { time: '09:20', title: 'Published client settings', detail: 'Homepage campaign update approved.' },
      { time: '08:44', title: 'Reviewed dispute', detail: 'Damage fee case DS-2107 resolved.' },
    ],
  },
  {
    id: 'u2',
    fullName: 'Mai Tran',
    email: 'manager@test.com',
    phone: '0901000002',
    role: 'manager',
    status: 'active',
    lastActiveAt: '2026-04-23 09:12',
    createdAt: '2026-01-15',
    workload: 12,
    activity: [
      { time: '09:02', title: 'Approved refund', detail: 'Partial refund for BK-2409.' },
      { time: '08:30', title: 'Opened reports', detail: 'Daily revenue summary viewed.' },
    ],
  },
  {
    id: 'u3',
    fullName: 'An Le',
    email: 'sales@test.com',
    phone: '0901000003',
    role: 'sales',
    status: 'active',
    lastActiveAt: '2026-04-23 08:59',
    createdAt: '2026-02-01',
    workload: 18,
    activity: [
      { time: '08:55', title: 'Converted lead', detail: 'Lead-1026 moved to booking draft.' },
      { time: '08:40', title: 'Created appointment', detail: 'Fitting appointment for Nguyen Thi Lan.' },
    ],
  },
  {
    id: 'u4',
    fullName: 'Khoa Pham',
    email: 'operator@test.com',
    phone: '0901000004',
    role: 'operator',
    status: 'active',
    lastActiveAt: '2026-04-23 08:35',
    createdAt: '2026-02-12',
    workload: 7,
    activity: [
      { time: '08:30', title: 'Confirmed pickup', detail: 'QR matched for BK-2408.' },
      { time: '08:05', title: 'Updated inventory', detail: 'Item GOWN-GOLD-002 moved to maintenance.' },
    ],
  },
  {
    id: 'u5',
    fullName: 'Nhi Vo',
    email: 'cashier@test.com',
    phone: '0901000005',
    role: 'cashier',
    status: 'active',
    lastActiveAt: '2026-04-23 08:20',
    createdAt: '2026-03-04',
    workload: 11,
    activity: [
      { time: '08:17', title: 'Printed receipt', detail: 'Receipt RC-2407-R printed.' },
      { time: '08:01', title: 'Processed payment', detail: 'Payment PAY-5002 marked complete.' },
    ],
  },
  {
    id: 'u6',
    fullName: 'Bao Dang',
    email: 'inactive@test.com',
    phone: '0901000006',
    role: 'operator',
    status: 'disabled',
    lastActiveAt: '2026-03-28 15:10',
    createdAt: '2026-01-20',
    workload: 0,
    activity: [
      { time: 'Mar 28', title: 'Access disabled', detail: 'Archived after staffing change.' },
    ],
  },
];

export function riskTone(risk: PermissionRisk): Tone {
  if (risk === 'critical') return 'danger';
  if (risk === 'high') return 'warning';
  if (risk === 'medium') return 'info';
  return 'neutral';
}

export function roleTone(role: Role): Tone {
  const tones: Record<Role, Tone> = {
    super_admin: 'accent',
    manager: 'info',
    sales: 'success',
    operator: 'warning',
    cashier: 'neutral',
  };
  return tones[role];
}

export function getRole(role: Role | string | undefined) {
  return defaultRbacRoles.find((item) => item.id === role) ?? defaultRbacRoles[0];
}

export function permissionById(id: string) {
  return permissionCatalog.find((permission) => permission.id === id);
}

export function permissionsByModule(permissions = permissionCatalog) {
  return rbacModules.map((module) => ({
    module,
    label: moduleLabel(module),
    permissions: permissions.filter((permission) => permission.module === module),
  }));
}

export function userCountsByRole(users: RbacUser[] = rbacUsers) {
  return defaultRbacRoles.reduce<Record<Role, number>>((acc, role) => {
    acc[role.id] = users.filter((user) => user.role === role.id && user.status === 'active').length;
    return acc;
  }, {} as Record<Role, number>);
}

export function criticalPermissionCount(permissionIds: string[]) {
  return permissionIds.filter((id) => permissionById(id)?.risk === 'critical').length;
}
