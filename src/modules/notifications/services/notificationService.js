import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

export const getNotifications = async (params = {}) => {
    const res = await api.get(ENDPOINTS.NOTIFICATION.GET_ALL, { params });
    return res.data;
};

export const getUnreadCount = async () => {
    const res = await api.get(ENDPOINTS.NOTIFICATION.UNREAD_COUNT);
    return res.data;
};

export const markAsRead = async (id) => {
    const res = await api.patch(ENDPOINTS.NOTIFICATION.MARK_READ(id));
    return res.data;
};

export const markAllAsRead = async () => {
    const res = await api.patch(ENDPOINTS.NOTIFICATION.MARK_ALL_READ);
    return res.data;
};

export const markProjectNotificationsRead = async (projectId) => {
    const res = await api.patch(ENDPOINTS.NOTIFICATION.MARK_PROJECT_READ(projectId));
    return res.data;
};

export const deleteNotification = async (id) => {
    const res = await api.delete(ENDPOINTS.NOTIFICATION.DELETE(id));
    return res.data;
};

export const clearAllNotifications = async () => {
    const res = await api.delete(ENDPOINTS.NOTIFICATION.CLEAR_ALL);
    return res.data;
};
