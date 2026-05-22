import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const P = ENDPOINTS.QUOTE_PROFILE;

export const listQuoteProfiles = () => api.get(P.LIST).then((r) => r.data.profiles ?? []);

export const getQuoteProfileDefaults = () => api.get(P.DEFAULTS).then((r) => r.data.defaults);

export const listQuoteProfilesAdmin = () => api.get(P.LIST_ADMIN).then((r) => r.data.profiles ?? []);

export const getQuoteProfileHistory = (id) =>
    api.get(P.HISTORY(id)).then((r) => ({ history: r.data.history ?? [], profileName: r.data.profileName }));

export const createQuoteProfile = (data) => api.post(P.CREATE, data).then((r) => r.data.profile);

export const updateQuoteProfile = (id, data) => api.patch(P.UPDATE(id), data).then((r) => r.data.profile);

export const deleteQuoteProfile = (id) => api.delete(P.DELETE(id)).then((r) => r.data);

export const uploadQuoteProfileLogo = (id, file) => {
    const fd = new FormData();
    fd.append("logo", file);
    return api.post(P.LOGO(id), fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.profile);
};

export const uploadQuoteProfilePaymentQr = (id, file) => {
    const fd = new FormData();
    fd.append("paymentQr", file);
    return api
        .post(P.PAYMENT_QR(id), fd, { headers: { "Content-Type": "multipart/form-data" } })
        .then((r) => r.data.profile);
};
