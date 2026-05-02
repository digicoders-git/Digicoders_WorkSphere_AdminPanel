import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

export const getProjects = () => api.get(ENDPOINTS.PROJECT.GET_ALL);
export const getProjectById = (id) => api.get(ENDPOINTS.PROJECT.GET_BY_ID(id));
export const createProject = (data) => api.post(ENDPOINTS.PROJECT.CREATE, data);
export const updateProject = (id, data) => api.put(ENDPOINTS.PROJECT.UPDATE(id), data);
export const deleteProject = (id) => api.delete(ENDPOINTS.PROJECT.DELETE(id));

export const getTasksByProject = (projectId) => api.get(ENDPOINTS.TASK.BY_PROJECT(projectId));
export const getTaskById = (id) => api.get(ENDPOINTS.TASK.GET_BY_ID(id));
export const createTask = (formData) => api.post(ENDPOINTS.TASK.CREATE, formData, { headers: { "Content-Type": "multipart/form-data" } });
export const updateTask = (id, data) => api.put(ENDPOINTS.TASK.UPDATE(id), data);
export const deleteTask = (id) => api.delete(ENDPOINTS.TASK.DELETE(id));

export const addComment = (id, formData) => api.post(ENDPOINTS.TASK.ADD_COMMENT(id), formData, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteComment = (id, commentId) => api.delete(ENDPOINTS.TASK.DELETE_COMMENT(id, commentId));
export const addAttachment = (id, formData) => api.post(ENDPOINTS.TASK.ADD_ATTACHMENT(id), formData, { headers: { "Content-Type": "multipart/form-data" } });
export const getMyTaskHistory = () => api.get(ENDPOINTS.TASK.MY_HISTORY);
export const deleteAttachment = (id, attId) => api.delete(ENDPOINTS.TASK.DELETE_ATTACHMENT(id, attId));
