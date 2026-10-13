const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = rawApiBase ? (rawApiBase.endsWith('/api') ? rawApiBase : `${rawApiBase.replace(/\/$/, '')}/api`) : '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth & Roles
  getCurrentUser: () => request('/auth/me'),
  login: (username, password, portal = '') => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, portal })
  }),
  register: (data) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getPortalCredentials: () => request('/auth/credentials'),
  switchRole: (role, trainerId = null) => request('/auth/switch-role', {
    method: 'POST',
    body: JSON.stringify({ role, trainer_id: trainerId })
  }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Members
  getMembers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/members${q ? `?${q}` : ''}`);
  },
  getMember: (id) => request(`/members/${id}`),
  updateMemberProfile: (id, data) => request(`/members/${id}/profile`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getMyProfile: (memberId = 1) => request(`/members/me?member_id=${memberId}`),
  getMemberProgress: (id) => request(`/members/${id}/progress`),
  getMemberPrograms: (id) => request(`/members/${id}/programs`),

  // Trainers
  getTrainers: () => request('/trainers'),
  getTrainer: (id) => request(`/trainers/${id}`),
  getTrainerAvailability: (id) => request(`/trainers/${id}/availability`),
  updateTrainerAvailability: (id, slots) => request(`/trainers/${id}/availability`, {
    method: 'PUT',
    body: JSON.stringify({ slots })
  }),
  getTrainerSlots: (id, date) => request(`/trainers/${id}/slots?date=${date}`),
  getTrainerSessions: (id, date) => request(`/trainers/${id}/sessions?date=${date}`),
  recordAttendance: (trainerId, data) => request(`/trainers/${trainerId}/attendance`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Classes & Schedules
  getClasses: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/classes${q ? `?${q}` : ''}`);
  },
  getClassDetails: (id) => request(`/classes/${id}`),
  getSchedules: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/classes/schedules${q ? `?${q}` : ''}`);
  },
  getCategories: () => request('/classes/categories'),

  // Bookings
  createHold: (memberId, scheduleId) => request('/bookings/hold', {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId, schedule_id: scheduleId })
  }),
  confirmBooking: (data) => request('/bookings/confirm', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  bookPT: (data) => request('/bookings/pt-book', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getMyBookings: (memberId = 1) => request(`/bookings/my-bookings?member_id=${memberId}`),
  cancelBooking: (registrationId, memberId = 1) => request(`/bookings/${registrationId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId })
  }),
  checkIn: (data) => request('/bookings/check-in', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Memberships & Plans
  getPlans: () => request('/memberships/plans'),
  getSubscriptions: (status = '') => request(`/memberships/subscriptions${status ? `?status=${status}` : ''}`),
  getMySubscription: (memberId = 1) => request(`/memberships/my-subscription?member_id=${memberId}`),
  purchaseMembership: (memberId, planId) => request('/memberships/purchase', {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId, plan_id: planId })
  }),

  // Payments
  createPaymentOrder: (data) => request('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getOrderStatus: (orderRef) => request(`/payments/orders/${orderRef}`),
  verifyPayment: (data) => request('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  testPaySimulate: (orderRef, vpa = 'member@oksbi') => request('/payments/test-pay', {
    method: 'POST',
    body: JSON.stringify({ order_ref: orderRef, vpa })
  }),
  cancelPayment: (orderRef) => request('/payments/cancel', {
    method: 'POST',
    body: JSON.stringify({ order_ref: orderRef })
  }),
  getPaymentHistory: (memberId = null) => request(`/payments/history${memberId ? `?member_id=${memberId}` : ''}`),

  // Equipment & Resource Scheduling
  getEquipment: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/equipment${q ? `?${q}` : ''}`);
  },
  getRealtimeEquipment: () => request('/equipment/realtime'),
  checkEquipmentAvailability: (data) => request('/equipment/check-availability', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Maintenance
  getMaintenance: (status = '') => request(`/maintenance${status ? `?status=${status}` : ''}`),
  createMaintenance: (data) => request('/maintenance', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateMaintenanceStatus: (recordId, status) => request(`/maintenance/${recordId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  }),

  // Reports
  getReportsCatalog: () => request('/reports'),
  getReportData: (key) => request(`/reports/${key}`),

  // Analytics & Insights
  getDashboardStats: () => request('/analytics/dashboard-stats'),
  getOccupancyTrend: () => request('/analytics/occupancy-trend'),
  getCategoryDistribution: () => request('/analytics/category-distribution'),
  getAuditLogs: () => request('/admin/audit-logs'),
  overrideCapacity: (data) => request('/admin/override-capacity', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getDatabaseInsights: () => request('/admin/database-insights'),
  getUserAccounts: () => request('/admin/user-accounts'),

  // Assessments
  getAssessments: () => request('/assessments'),
  addAssessment: (data) => request('/assessments', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
