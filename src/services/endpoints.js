
export const ENDPOINTS = {
  AUTH: {
    SIGNUP: `/api/user/signup`,
    LOGIN: `/api/user/login`,
    FORGOT_PASSWORD: `/api/user/forgot-password`,
    RESET_PASSWORD: `/api/user/reset-password`,
    PROFILE: `/api/user/profile`,
    ALL_USERS: `/api/user/all`,
    VERIFY_TOKEN: `/api/user/me`,
    LOGOUT: `/api/user/logout`,
  },

  USER: {
    GET_ALL: `/api/user/all`,
    GET_ALL_BY_COMPANY: (companyId) => `/api/company/${companyId}/users`,
    UPDATE_USER: (id) => `/api/user/${id}`,
    TOGGLE_STATUS: (id) => `/api/user/${id}/toggle-status`,
    ADMIN_CHANGE_PASSWORD: (id) => `/api/user/${id}/change-password`,
  },

  COMPANY: {
    CREATE: `/api/company`,
    GET_ALL: `/api/company`,
    CREATE_WITH_ADMIN: `/api/company/with-admin`,
    UPDATE_COMPANY: (companyId) => `/api/company/${companyId}`,
    UPDATE_COMPANY_WITH_ADMIN: (companyId) => `/api/company/${companyId}/with-admin`,
    GET_ALL_MY_COMPANIES: `/api/company/`,
    GET_ALL_COMPANIES: `/api/company/all`,
    GET_COMPANY_BY_ID: (companyId) => `/api/company/${companyId}`,
    DELETE_COMPANY: (companyId) => `/api/company/${companyId}`,
    TOGGLE_COMPANY_STATUS: (companyId) => `/api/company/${companyId}/status`,
    UPLOAD_ICON: (companyId) => `/api/company/${companyId}/icon`,
  },

  DEPARTMENT: {
    CREATE: `/api/department/`,
    GET_ALL_ACTIVE: `/api/department/`,
    GET_ALL: `/api/department/all`,
    GET_ALL_COMPANY_DEPARTMENTS: `/api/department/company`,
    GET_BY_COMPANY: (companyId) => `/api/department/by-company/${companyId}`,
    GET_BY_ID: (id) => `/api/department/${id}`,
    UPDATE: (id) => `/api/department/${id}`,
    DELETE: (id) => `/api/department/${id}`,
    RESTORE: (id) => `/api/department/restore/${id}`,
    TOGGLE_STATUS: (id) => `/api/department/toggle-status/${id}`,
  },

  DESIGNATION: {
    CREATE: `/api/designation`,
    GET_ALL: `/api/designation`,
  },

  ROLE: {
    CREATE: `/api/role/create`,
    GET_ALL: `/api/role/all`,
    Get_Role_By_Company: (companyId) => `/api/role/all/${companyId}`,
    GET_ALL_COMPANY_ROLES: `/api/role/allroles`,

    RESTORE_ROLE: (roleId) => `/api/role/restore/${roleId}`,
    UPDATE_ROLE: (roleId) => `/api/role/update/${roleId}`,
    DELETE_ROLE: (roleId) => `/api/role/delete/${roleId}`,
  },

  WORKSHIFT: {
    CREATE: `/api/workshift`,
    GET_COMPANY: `/api/workshift/company`,
    GET_BY_COMPANY: (companyId) => `/api/workshift/by-company/${companyId}`,
    UPDATE: (id) => `/api/workshift/${id}`,
    DELETE: (id) => `/api/workshift/${id}`,
    TOGGLE: (id) => `/api/workshift/${id}/toggle`,
  },

    ATTENDANCE: {
    CHECK_IN: `/api/attendance/checkin`,
    CHECK_OUT: `/api/attendance/checkout`,
    TODAY: `/api/attendance/today`,
    MY: `/api/attendance/my`,
    SUMMARY: `/api/attendance/summary`,
    TEAM: `/api/attendance/team`,
    COMPANY: `/api/attendance/company`,
    MANUAL_PUNCH: (id) => `/api/attendance/${id}/manual-punch`,
    ADMIN_PUNCH: `/api/attendance/admin-punch`,
  },

  EMPLOYMENT_STATUS: {
    CREATE: `/api/employment-status`,
    GET_COMPANY: `/api/employment-status/company`,
    GET_BY_COMPANY: (companyId) => `/api/employment-status/by-company/${companyId}`,
    UPDATE: (id) => `/api/employment-status/${id}`,
    DELETE: (id) => `/api/employment-status/${id}`,
    TOGGLE: (id) => `/api/employment-status/${id}/toggle`,
  },

  NOTIFICATION: {
    GET_ALL: `/api/notifications`,
    UNREAD_COUNT: `/api/notifications/unread-count`,
    MARK_READ: (id) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: `/api/notifications/read-all`,
    MARK_PROJECT_READ: (projectId) => `/api/notifications/mark-project-read/${projectId}`,
    DELETE: (id) => `/api/notifications/${id}`,
    CLEAR_ALL: `/api/notifications/clear-all`,
  },

  HOLIDAY: {
    GET_ALL: `/api/holidays`,
    CREATE: `/api/holidays`,
    BULK: `/api/holidays/bulk`,
    CSV_UPLOAD: `/api/holidays/csv-upload`,
    UPDATE: (id) => `/api/holidays/${id}`,
    DELETE: (id) => `/api/holidays/${id}`,
  },

  LEAVE_TYPE: {
    GET_ALL: `/api/leave-types`,
    GET_BY_COMPANY: (companyId) => `/api/leave-types/by-company/${companyId}`,
    CREATE: `/api/leave-types`,
    UPDATE: (id) => `/api/leave-types/${id}`,
    DELETE: (id) => `/api/leave-types/${id}`,
  },

  LEAVE: {
    MY_BALANCE: `/api/leaves/balance`,
    USER_BALANCE: (userId) => `/api/leaves/balance/user/${userId}`,
    ASSIGN: `/api/leaves/balance/assign`,
    BULK_ASSIGN: `/api/leaves/balance/bulk-assign`,
    APPLY: `/api/leaves/apply`,
    MY: `/api/leaves/my`,
    COMPANY: `/api/leaves/company`,
    APPROVE: (id) => `/api/leaves/${id}/approve`,
    REJECT: (id) => `/api/leaves/${id}/reject`,
    CANCEL: (id) => `/api/leaves/${id}/cancel`,
  },

  REGULARIZATION: {
    REQUEST: `/api/regularization`,
    MY: `/api/regularization/my`,
    TEAM: `/api/regularization/team`,
    COMPANY: `/api/regularization/company`,
    APPROVE: (id) => `/api/regularization/${id}/approve`,
    REJECT: (id) => `/api/regularization/${id}/reject`,
  },

  PAYROLL: {
    SALARY_STRUCTURE:          `/api/payroll/salary-structure`,
    SALARY_STRUCTURE_COMPANY:  `/api/payroll/salary-structure/company`,
    SALARY_STRUCTURE_USER: (userId) => `/api/payroll/salary-structure/user/${userId}`,
    SALARY_STRUCTURE_UPDATE: (id) => `/api/payroll/salary-structure/${id}`,
    SALARY_STRUCTURE_DELETE: (id) => `/api/payroll/salary-structure/${id}`,
    RUN:              `/api/payroll/run`,
    RUN_APPROVE: (id) => `/api/payroll/run/${id}/approve`,
    RUN_MARK_PAID: (id) => `/api/payroll/run/${id}/mark-paid`,
    RUN_DELETE: (id) => `/api/payroll/run/${id}`,
    BULK_APPROVE:     `/api/payroll/run/bulk-approve`,
    BULK_MARK_PAID:   `/api/payroll/run/bulk-mark-paid`,
    SUMMARY:          `/api/payroll/summary`,
    MY:               `/api/payroll/my`,
  },

    PROJECT: {
    CREATE: `/api/projects`,
    GET_ALL: `/api/projects`,
    GET_BY_ID: (id) => `/api/projects/${id}`,
    UPDATE: (id) => `/api/projects/${id}`,
    DELETE: (id) => `/api/projects/${id}`,
    GET_BUNDLES: (id) => `/api/projects/${id}/bundles`,
    CREATE_BUNDLE: (id) => `/api/projects/${id}/bundles`,
    UPDATE_BUNDLE: (id, bid) => `/api/projects/${id}/bundles/${bid}`,
    DELETE_BUNDLE: (id, bid) => `/api/projects/${id}/bundles/${bid}`,
    UPDATE_BUNDLE_ACCESS: (id, bid) => `/api/projects/${id}/bundles/${bid}/access`,
    DOWNLOAD: `/api/projects/download-proxy`,
  },

  TASK: {
    CREATE: `/api/tasks`,
    MY_HISTORY: `/api/tasks/my-history`,
    BY_PROJECT: (projectId) => `/api/tasks/project/${projectId}`,
    GET_BY_ID: (id) => `/api/tasks/${id}`,
    UPDATE: (id) => `/api/tasks/${id}`,
    DELETE: (id) => `/api/tasks/${id}`,
    ADD_COMMENT: (id) => `/api/tasks/${id}/comments`,
    DELETE_COMMENT: (id, commentId) => `/api/tasks/${id}/comments/${commentId}`,
    ADD_ATTACHMENT: (id) => `/api/tasks/${id}/attachments`,
    DELETE_ATTACHMENT: (id, attId) => `/api/tasks/${id}/attachments/${attId}`,
  },
};