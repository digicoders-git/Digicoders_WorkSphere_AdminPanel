import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

export const getCompanyWorkShifts = async () => {
    const res = await api.get(ENDPOINTS.WORKSHIFT.GET_COMPANY);
    return res.data;
};

export const getShiftsByCompany = async (companyId) => {
    const res = await api.get(ENDPOINTS.WORKSHIFT.GET_BY_COMPANY(companyId));
    return res.data;
};

export const createWorkShift = async (data) => {
    const res = await api.post(ENDPOINTS.WORKSHIFT.CREATE, data);
    return res.data;
};

export const updateWorkShift = async (id, data) => {
    const res = await api.put(ENDPOINTS.WORKSHIFT.UPDATE(id), data);
    return res.data;
};

export const deleteWorkShift = async (id) => {
    const res = await api.delete(ENDPOINTS.WORKSHIFT.DELETE(id));
    return res.data;
};

export const toggleWorkShiftStatus = async (id) => {
    const res = await api.patch(ENDPOINTS.WORKSHIFT.TOGGLE(id));
    return res.data;
};
