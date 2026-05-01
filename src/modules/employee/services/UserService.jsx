import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

export const fetchUsers = async () => {
    const res = await api.get(ENDPOINTS.AUTH.ALL_USERS);
    return res.data;
};

export const createUser = async (data) => {
    const res = await api.post("/api/user/create", data);
    return res.data;
};

export const updateUser = async (data) => {
    const res = await api.put(ENDPOINTS.USER.UPDATE_USER(data._id), data);
    return res.data;
};

export const toggleUserStatus = async (id) => {
    const res = await api.patch(ENDPOINTS.USER.TOGGLE_STATUS(id));
    return res.data;
};

export const fetchProfile = async () => {
    const res = await api.get(ENDPOINTS.AUTH.PROFILE);
    return res.data;
};

export const verifyToken = async () => {
    const res = await api.get(ENDPOINTS.AUTH.VERIFY_TOKEN);
    return res.data;
};
