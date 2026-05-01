import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

// Holidays
export const getHolidays = (params) => api.get(ENDPOINTS.HOLIDAY.GET_ALL, { params }).then(r => r.data);
export const createHoliday = (data) => api.post(ENDPOINTS.HOLIDAY.CREATE, data).then(r => r.data);
export const bulkCreateHolidays = (data) => api.post(ENDPOINTS.HOLIDAY.BULK, data).then(r => r.data);
export const csvUploadHolidays = (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(ENDPOINTS.HOLIDAY.CSV_UPLOAD, form).then(r => r.data);
};
export const updateHoliday = (id, data) => api.put(ENDPOINTS.HOLIDAY.UPDATE(id), data).then(r => r.data);
export const deleteHoliday = (id) => api.delete(ENDPOINTS.HOLIDAY.DELETE(id)).then(r => r.data);

// Leave Types
export const getLeaveTypes = () => api.get(ENDPOINTS.LEAVE_TYPE.GET_ALL).then(r => r.data);
export const getLeaveTypesByCompany = (companyId) => api.get(ENDPOINTS.LEAVE_TYPE.GET_BY_COMPANY(companyId)).then(r => r.data);
export const createLeaveType = (data) => api.post(ENDPOINTS.LEAVE_TYPE.CREATE, data).then(r => r.data);
export const updateLeaveType = (id, data) => api.put(ENDPOINTS.LEAVE_TYPE.UPDATE(id), data).then(r => r.data);
export const deleteLeaveType = (id) => api.delete(ENDPOINTS.LEAVE_TYPE.DELETE(id)).then(r => r.data);

// Leave Balance
export const getMyBalance = (params) => api.get(ENDPOINTS.LEAVE.MY_BALANCE, { params }).then(r => r.data);
export const getUserBalance = (userId, params) => api.get(ENDPOINTS.LEAVE.USER_BALANCE(userId), { params }).then(r => r.data);
export const assignLeaveBalance = (data) => api.post(ENDPOINTS.LEAVE.ASSIGN, data).then(r => r.data);
export const bulkAssignLeaveBalance = (data) => api.post(ENDPOINTS.LEAVE.BULK_ASSIGN, data).then(r => r.data);

// Leave Applications
export const applyLeave = (data) => api.post(ENDPOINTS.LEAVE.APPLY, data).then(r => r.data);
export const getMyLeaves = (params) => api.get(ENDPOINTS.LEAVE.MY, { params }).then(r => r.data);
export const getCompanyLeaves = (params) => api.get(ENDPOINTS.LEAVE.COMPANY, { params }).then(r => r.data);
export const approveLeave = (id) => api.patch(ENDPOINTS.LEAVE.APPROVE(id)).then(r => r.data);
export const rejectLeave = (id, data) => api.patch(ENDPOINTS.LEAVE.REJECT(id), data).then(r => r.data);
export const cancelLeave = (id) => api.patch(ENDPOINTS.LEAVE.CANCEL(id)).then(r => r.data);
