import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const L = ENDPOINTS.LEAD;

export const getLeads         = (params, signal) => api.get(L.GET_ALL, { params, signal }).then(r => r.data);
export const getLeadById      = (id, signal)     => api.get(L.GET_BY_ID(id), { signal }).then(r => r.data);
export const createLead       = (data)           => api.post(L.CREATE, data).then(r => r.data);
export const updateLead       = (id, data)       => api.patch(L.UPDATE(id), data).then(r => r.data);
export const deleteLead       = (id)             => api.delete(L.DELETE(id)).then(r => r.data);
export const addCommunication = (id, data)       => api.post(L.ADD_COMMUNICATION(id), data).then(r => r.data);
export const findByContact    = (contact)        => api.get(L.GET_ALL, { params: { search: contact } }).then(r => r.data);
export const importLeadsCsv   = (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(L.IMPORT_CSV, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,   // 5 min — large CSV files take time
        onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    }).then(r => r.data);
};
