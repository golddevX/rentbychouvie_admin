export type Role = 'super_admin' | 'manager' | 'sales' | 'operator' | 'cashier';

export type Permission =
  | 'view_dashboard'
  | 'manage_leads'
  | 'manage_appointments'
  | 'manage_bookings'
  | 'approve_exceptions'
  | 'view_payments'
  | 'process_payments'
  | 'process_refunds'
  | 'print_receipts'
  | 'manage_inventory'
  | 'scan_qr'
  | 'process_pickup'
  | 'process_return'
  | 'view_audit_logs'
  | 'manage_disputes'
  | 'view_reports'
  | 'manage_users'
  | 'manage_preview_queue'
  | 'manage_settings';

const rolePermissions: Record<Role, Permission[]> = {
  super_admin: [
    'view_dashboard',
    'manage_leads',
    'manage_appointments',
    'manage_bookings',
    'approve_exceptions',
    'view_payments',
    'process_payments',
    'process_refunds',
    'print_receipts',
    'manage_inventory',
    'scan_qr',
    'process_pickup',
    'process_return',
    'view_audit_logs',
    'manage_disputes',
    'view_reports',
    'manage_users',
    'manage_preview_queue',
    'manage_settings',
  ],
  manager: [
    'view_dashboard',
    'manage_leads',
    'manage_appointments',
    'manage_bookings',
    'approve_exceptions',
    'view_payments',
    'print_receipts',
    'manage_inventory',
    'scan_qr',
    'process_pickup',
    'process_return',
    'view_audit_logs',
    'manage_disputes',
    'view_reports',
    'manage_preview_queue',
    'manage_settings',
  ],
  sales: [
    'view_dashboard',
    'manage_leads',
    'manage_appointments',
    'manage_bookings',
    'scan_qr',
    'manage_preview_queue',
  ],
  operator: [
    'view_dashboard',
    'manage_inventory',
    'scan_qr',
    'process_pickup',
    'process_return',
    'manage_disputes',
    'manage_preview_queue',
  ],
  cashier: [
    'view_dashboard',
    'view_payments',
    'process_payments',
    'process_refunds',
    'print_receipts',
    'manage_bookings',
    'manage_disputes',
  ],
};

export function normalizeRole(role?: string | null): Role {
  const normalized = role?.toLowerCase();

  if (
    normalized === 'super_admin' ||
    normalized === 'manager' ||
    normalized === 'sales' ||
    normalized === 'operator' ||
    normalized === 'cashier'
  ) {
    return normalized;
  }

  return 'super_admin';
}

export function can(role: Role | string | undefined | null, permission: Permission) {
  return rolePermissions[normalizeRole(role)].includes(permission);
}

export function permissionsFor(role: Role | string | undefined | null) {
  return rolePermissions[normalizeRole(role)];
}

export const roleLabels: Record<Role, string> = {
  super_admin: 'Super admin',
  manager: 'Manager',
  sales: 'Sales',
  operator: 'Operator',
  cashier: 'Cashier',
};
