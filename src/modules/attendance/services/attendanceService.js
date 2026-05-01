import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

export const checkIn = async (locationData) => {
    const res = await api.post(ENDPOINTS.ATTENDANCE.CHECK_IN, locationData);
    return res.data;
};

export const checkOut = async (locationData) => {
    const res = await api.patch(ENDPOINTS.ATTENDANCE.CHECK_OUT, locationData);
    return res.data;
};

export const getTodayAttendance = async () => {
    const res = await api.get(ENDPOINTS.ATTENDANCE.TODAY);
    return res.data;
};

export const getMyAttendance = async (month) => {
    const res = await api.get(ENDPOINTS.ATTENDANCE.MY, { params: { month } });
    return res.data;
};

export const getAttendanceSummary = async (month) => {
    const res = await api.get(ENDPOINTS.ATTENDANCE.SUMMARY, { params: { month } });
    return res.data;
};

export const getCompanyAttendance = async (params = {}) => {
    const res = await api.get(ENDPOINTS.ATTENDANCE.COMPANY, { params });
    return res.data;
};

export const getTeamAttendance = async (params = {}) => {
    const res = await api.get(ENDPOINTS.ATTENDANCE.TEAM, { params });
    return res.data;
};

export const manualPunch = async (id, data) => {
    const res = await api.patch(ENDPOINTS.ATTENDANCE.MANUAL_PUNCH(id), data);
    return res.data;
};

export const adminCreatePunch = async (data) => {
    const res = await api.post(ENDPOINTS.ATTENDANCE.ADMIN_PUNCH, data);
    return res.data;
};

// Regularization
export const requestRegularization = async (data) => {
    const res = await api.post(ENDPOINTS.REGULARIZATION.REQUEST, data);
    return res.data;
};

export const getMyRegularizations = async () => {
    const res = await api.get(ENDPOINTS.REGULARIZATION.MY);
    return res.data;
};

export const getCompanyRegularizations = async (params = {}) => {
    const res = await api.get(ENDPOINTS.REGULARIZATION.COMPANY, { params });
    return res.data;
};

export const getTeamRegularizations = async (params = {}) => {
    const res = await api.get(ENDPOINTS.REGULARIZATION.TEAM, { params });
    return res.data;
};

export const approveRegularization = async (id) => {
    const res = await api.patch(ENDPOINTS.REGULARIZATION.APPROVE(id));
    return res.data;
};

export const rejectRegularization = async (id, data) => {
    const res = await api.patch(ENDPOINTS.REGULARIZATION.REJECT(id), data);
    return res.data;
};
