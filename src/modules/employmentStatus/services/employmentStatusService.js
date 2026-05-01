import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

export const getCompanyEmploymentStatuses = async () => {
    const res = await api.get(ENDPOINTS.EMPLOYMENT_STATUS.GET_COMPANY);
    return res.data;
};

export const getStatusesByCompany = async (companyId) => {
    const res = await api.get(ENDPOINTS.EMPLOYMENT_STATUS.GET_BY_COMPANY(companyId));
    return res.data;
};

export const createEmploymentStatus = async (data) => {
    const res = await api.post(ENDPOINTS.EMPLOYMENT_STATUS.CREATE, data);
    return res.data;
};

export const updateEmploymentStatus = async (id, data) => {
    const res = await api.put(ENDPOINTS.EMPLOYMENT_STATUS.UPDATE(id), data);
    return res.data;
};

export const deleteEmploymentStatus = async (id) => {
    const res = await api.delete(ENDPOINTS.EMPLOYMENT_STATUS.DELETE(id));
    return res.data;
};

export const toggleEmploymentStatus = async (id) => {
    const res = await api.patch(ENDPOINTS.EMPLOYMENT_STATUS.TOGGLE(id));
    return res.data;
};
