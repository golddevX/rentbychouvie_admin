import adminApiClient from './api-client';

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    adminApiClient.post('/auth/login', { email, password }),

  refresh: (refreshToken: string) =>
    adminApiClient.post('/auth/refresh', { refreshToken }),

  logout: () =>
    adminApiClient.post('/auth/logout'),
};

// Leads API
export const leadsApi = {
  getAll: (status?: string) =>
    adminApiClient.get('/leads', { params: { status } }),

  getById: (id: string) =>
    adminApiClient.get(`/leads/${id}`),

  create: (data: any) =>
    adminApiClient.post('/leads', data),

  update: (id: string, data: any) =>
    adminApiClient.patch(`/leads/${id}`, data),

  selectProduct: (id: string, data: any) =>
    adminApiClient.post(`/leads/${id}/select-product`, data),

  updateStatus: (id: string, status: string) =>
    adminApiClient.patch(`/leads/${id}/status`, { status }),

  markContacted: (id: string, data?: { notes?: string; contactedAt?: string }) =>
    adminApiClient.post(`/leads/${id}/contact`, data ?? {}),

  requestDeposit: (id: string, data?: any) =>
    adminApiClient.post(`/leads/${id}/request-deposit`, data ?? {}),

  receiveDeposit: (id: string, data: { amount: number; paymentMethod?: string; description?: string }) =>
    adminApiClient.post(`/leads/${id}/receive-deposit`, data),

  createAppointment: (id: string) =>
    adminApiClient.post(`/leads/${id}/create-appointment`),

  archive: (id: string) =>
    adminApiClient.patch(`/leads/${id}/archive`),

  assignTo: (id: string, userId: string) =>
    adminApiClient.patch(`/leads/${id}/assign`, { userId }),

  convertToBooking: (id: string, bookingId?: string) =>
    adminApiClient.post(`/leads/${id}/convert-to-booking`, bookingId ? { bookingId } : {}),
};

// Bookings API
export const bookingsApi = {
  getAll: (status?: string) =>
    adminApiClient.get('/bookings', { params: { status } }),

  getById: (id: string) =>
    adminApiClient.get(`/bookings/${id}`),

  create: (data: any) =>
    adminApiClient.post('/bookings', data),

  updateStatus: (id: string, status: string) =>
    adminApiClient.patch(`/bookings/${id}/status`, { status }),

  confirm: (id: string, notes?: string) =>
    adminApiClient.post(`/bookings/${id}/confirm`, { notes }),

  recordBookingDeposit: (id: string, amount: number, paymentMethod = 'CASH') =>
    adminApiClient.post(`/bookings/${id}/deposit`, { amount, paymentMethod }),

  archive: (id: string) =>
    adminApiClient.patch(`/bookings/${id}/archive`),

  getAvailability: (startDate: string, endDate: string) =>
    adminApiClient.get('/bookings/availability', {
      params: { startDate, endDate },
    }),
};

// Inventory API
export const inventoryApi = {
  getItems: (status?: string) =>
    adminApiClient.get('/inventory/items', { params: { status } }),

  getItemById: (id: string) =>
    adminApiClient.get(`/inventory/items/${id}`),

  scanQR: (code: string) =>
    adminApiClient.get(`/inventory/qr/${code}`),

  resolveQR: (code: string) =>
    adminApiClient.get(`/inventory/qr/${encodeURIComponent(code)}/resolve`),

  createItem: (data: any) =>
    adminApiClient.post('/inventory/items', data),

  updateItemStatus: (id: string, status: string, notes?: string) =>
    adminApiClient.patch(`/inventory/items/${id}/status`, { status, notes }),

  regenerateQR: (id: string) =>
    adminApiClient.patch(`/inventory/items/${id}/regenerate-qr`),

  getQRImage: (id: string) =>
    adminApiClient.get(`/inventory/items/${id}/qr-image`),

  getSchedule: (id: string) =>
    adminApiClient.get(`/inventory/items/${id}/schedule`),

  archiveItem: (id: string) =>
    adminApiClient.patch(`/inventory/items/${id}/archive`),
};

export const scanApi = {
  resolve: (qrCode: string) =>
    adminApiClient.get(`/scan/${encodeURIComponent(qrCode)}`),
};

export const pickupApi = {
  scan: (bookingId: string, qrCode: string) =>
    adminApiClient.post(`/pickup/${bookingId}/scan`, { qrCode }),
  confirm: (bookingId: string, qrCodes: string[], conditionNotes?: string) =>
    adminApiClient.post(`/pickup/${bookingId}/confirm`, { qrCodes, conditionNotes }),
};

export const returnsApi = {
  inspect: (bookingId: string, data: {
    condition: 'clean' | 'dirty' | 'damaged' | 'incomplete';
    images: string[];
    notes?: string;
    declaredDamageFee?: number;
  }) => adminApiClient.post(`/return/${bookingId}/inspect`, data),
  settle: (bookingId: string, data: {
    qrCodes: string[];
    condition: 'clean' | 'dirty' | 'damaged' | 'incomplete';
    actualReturnDate?: string;
    damageFee?: number;
    accessoryLostValues?: number[];
    affectsNextBooking?: boolean;
    notes?: string;
  }) => adminApiClient.post(`/return/${bookingId}/settle`, data),
};

export const productsApi = {
  getAll: (params?: { category?: string; search?: string }) =>
    adminApiClient.get('/products', { params }),

  getById: (id: string) =>
    adminApiClient.get(`/products/${id}`),

  createVariant: (productId: string, data: any) =>
    adminApiClient.post(`/products/${productId}/variants`, data),

  updateVariant: (id: string, data: any) =>
    adminApiClient.patch(`/products/variants/${id}`, data),

  archiveVariant: (id: string) =>
    adminApiClient.patch(`/products/variants/${id}/archive`),
};

// Rentals API
export const rentalsApi = {
  getAll: () =>
    adminApiClient.get('/rentals'),

  getActive: () =>
    adminApiClient.get('/rentals/active'),

  getById: (id: string) =>
    adminApiClient.get(`/rentals/${id}`),

  processPickup: (id: string, qrCodes: string[], conditionNotes?: string) =>
    adminApiClient.post(`/rentals/${id}/pickup`, { qrCodes, conditionNotes }),

  processReturn: (id: string, qrCodes: string[], conditionNotes?: string, damageAmount?: number) =>
    adminApiClient.post(`/rentals/${id}/return`, {
      qrCodes,
      conditionNotes,
      damageAmount,
    }),

  calculateReturnSettlement: (id: string, data: {
    condition?: 'clean' | 'dirty' | 'damaged' | 'incomplete';
    actualReturnDate?: string;
    accessoryLostValues?: number[];
    affectsNextBooking?: boolean;
  }) => adminApiClient.post(`/rentals/${id}/return/settlement`, data),

  confirmPayment: (id: string) =>
    adminApiClient.patch(`/rentals/${id}/confirm-payment`),
};

// Payments API
export const paymentsApi = {
  getAll: (status?: string) =>
    adminApiClient.get('/payments', { params: { status } }),

  getById: (id: string) =>
    adminApiClient.get(`/payments/${id}`),

  create: (data: any) =>
    adminApiClient.post('/payments', data),

  process: (id: string, externalTransactionId?: string) =>
    adminApiClient.patch(`/payments/${id}/process`, { externalTransactionId }),

  initialize: (
    id: string,
    data?: { provider?: string; returnUrl?: string; callbackUrl?: string; currency?: string; idempotencyKey?: string },
  ) => adminApiClient.post(`/payments/${id}/initialize`, data ?? {}),

  retry: (
    id: string,
    data?: { provider?: string; returnUrl?: string; callbackUrl?: string; currency?: string },
  ) => adminApiClient.post(`/payments/${id}/retry`, data ?? {}),

  cancel: (id: string, reason?: string) =>
    adminApiClient.post(`/payments/${id}/cancel`, { reason }),

  refund: (id: string, refundAmount: number) =>
    adminApiClient.patch(`/payments/${id}/refund`, { refundAmount }),

  updateStatus: (id: string, status: string) =>
    adminApiClient.patch(`/payments/${id}/status`, { status }),

  initializeRentalOrder: (
    orderId: string,
    data?: { provider?: string; returnUrl?: string; callbackUrl?: string; currency?: string; idempotencyKey?: string },
  ) => adminApiClient.post(`/payments/rental-orders/${orderId}/initialize`, data ?? {}),

  retryRentalOrder: (
    orderId: string,
    data?: { provider?: string; returnUrl?: string; callbackUrl?: string; currency?: string },
  ) => adminApiClient.post(`/payments/rental-orders/${orderId}/retry`, data ?? {}),

  initializeBooking: (
    bookingId: string,
    data?: {
      provider?: string;
      returnUrl?: string;
      callbackUrl?: string;
      currency?: string;
      idempotencyKey?: string;
      paymentType?: 'deposit' | 'remaining' | 'full';
      depositAmount?: number;
    },
  ) => adminApiClient.post(`/payments/bookings/${bookingId}/initialize`, data ?? {}),

  archive: (id: string) =>
    adminApiClient.patch(`/payments/${id}/archive`),

  generateReceipt: (id: string) =>
    adminApiClient.post(`/payments/${id}/receipt`),
};

export const receiptsApi = {
  getAll: () => adminApiClient.get('/receipts'),
  getById: (id: string) => adminApiClient.get(`/receipts/${id}`),
  update: (id: string, data: any) => adminApiClient.patch(`/receipts/${id}`, data),
  print: (id: string) => adminApiClient.post(`/receipts/${id}/print`),
  getPdf: (id: string) => adminApiClient.get(`/receipts/${id}/pdf`),
  archive: (id: string) => adminApiClient.patch(`/receipts/${id}/archive`),
};

export const appointmentsApi = {
  getAll: (params?: any) => adminApiClient.get('/appointments', { params }),
  getById: (id: string) => adminApiClient.get(`/appointments/${id}`),
  create: (data: any) => adminApiClient.post('/appointments', data),
  update: (id: string, data: any) => adminApiClient.patch(`/appointments/${id}`, data),
  getAvailability: (params: {
    startTime: string;
    endTime: string;
    staffId?: string;
    room?: string;
    resourceItemId?: string;
  }) => adminApiClient.get('/appointments/availability/query', { params }),
  complete: (id: string) => adminApiClient.post(`/appointments/${id}/complete`),
  updateStatus: (id: string, status: string) =>
    adminApiClient.patch(`/appointments/${id}/status`, { status }),
  archive: (id: string) => adminApiClient.patch(`/appointments/${id}/archive`),
};

export const rentalOrdersApi = {
  getAll: (params?: { status?: string; paymentStatus?: string; includeArchived?: boolean }) =>
    adminApiClient.get('/rental-orders', { params }),
  getById: (id: string) => adminApiClient.get(`/rental-orders/${id}`),
  create: (data: any) => adminApiClient.post('/rental-orders', data),
  checkAvailability: (data: { startDateTime: string; endDateTime: string; inventoryItemIds: string[]; rentalOrderId?: string }) =>
    adminApiClient.post('/rental-orders/availability/check', data),
  updateStatus: (id: string, status: string) => adminApiClient.patch(`/rental-orders/${id}/status`, { status }),
  updatePaymentStatus: (id: string, paymentStatus: string) =>
    adminApiClient.patch(`/rental-orders/${id}/payment-status`, { paymentStatus }),
  archive: (id: string) => adminApiClient.patch(`/rental-orders/${id}/archive`),
};

export const previewRequestsApi = {
  getAll: (params?: any) => adminApiClient.get('/preview-requests', { params }),
  getById: (id: string) => adminApiClient.get(`/preview-requests/${id}`),
  create: (data: any) => adminApiClient.post('/preview-requests', data),
  update: (id: string, data: any) => adminApiClient.patch(`/preview-requests/${id}`, data),
  updateStatus: (id: string, status: string) =>
    adminApiClient.patch(`/preview-requests/${id}/status`, { status }),
  archive: (id: string) => adminApiClient.patch(`/preview-requests/${id}/archive`),
};

export const auditLogsApi = {
  getAll: (params?: {
    entity?: string;
    entityId?: string;
    bookingId?: string;
    paymentId?: string;
    inventoryItemId?: string;
  }) => adminApiClient.get('/audit-logs', { params }),
};

export const disputesApi = {
  getAll: (params?: { status?: string; priority?: string; bookingId?: string }) =>
    adminApiClient.get('/disputes', { params }),
  getById: (id: string) => adminApiClient.get(`/disputes/${id}`),
  create: (data: any) => adminApiClient.post('/disputes', data),
  update: (id: string, data: any) => adminApiClient.patch(`/disputes/${id}`, data),
  addEvidence: (id: string, data: any) => adminApiClient.post(`/disputes/${id}/evidence`, data),
  resolve: (id: string, data: any) => adminApiClient.post(`/disputes/${id}/resolve`, data),
};

// Reports API
export const reportsApi = {
  getDailyRevenue: (date: string) =>
    adminApiClient.get('/reports/revenue', { params: { date } }),

  getInventoryStatus: () =>
    adminApiClient.get('/reports/inventory-status'),

  getRentalAnalytics: (startDate?: string, endDate?: string) =>
    adminApiClient.get('/reports/rental-analytics', {
      params: { startDate, endDate },
    }),

  getLeadConversion: (startDate?: string, endDate?: string) =>
    adminApiClient.get('/reports/lead-conversion', {
      params: { startDate, endDate },
    }),

  getStaffPerformance: () =>
    adminApiClient.get('/reports/staff-performance'),
};

// Users API
export const usersApi = {
  getAll: () =>
    adminApiClient.get('/users'),

  getById: (id: string) =>
    adminApiClient.get(`/users/${id}`),

  create: (data: any) =>
    adminApiClient.post('/users', data),

  update: (id: string, data: any) =>
    adminApiClient.patch(`/users/${id}`, data),

  archive: (id: string) =>
    adminApiClient.patch(`/users/${id}/archive`),

  resetPassword: (id: string) =>
    adminApiClient.post(`/users/${id}/reset-password`),

  delete: (id: string) =>
    adminApiClient.delete(`/users/${id}`),
};

export const rolesApi = {
  getAll: () => adminApiClient.get('/roles'),
  getById: (id: string) => adminApiClient.get(`/roles/${id}`),
  create: (data: any) => adminApiClient.post('/roles', data),
  update: (id: string, data: any) => adminApiClient.patch(`/roles/${id}`, data),
  updatePermissions: (id: string, permissions: string[], auditNote?: string) =>
    adminApiClient.patch(`/roles/${id}/permissions`, { permissions, auditNote }),
};

export const permissionsApi = {
  getAll: () => adminApiClient.get('/permissions'),
};

export const siteSettingsApi = {
  getHomepage: () => adminApiClient.get('/site-settings/homepage'),
  updateHomepage: (data: any) => adminApiClient.patch('/site-settings/homepage', data),
};
