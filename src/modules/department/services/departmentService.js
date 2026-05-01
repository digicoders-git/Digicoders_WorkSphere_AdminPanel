import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

export const createDepartment = async (data) => {
  try {
    const res = await api.post(ENDPOINTS.DEPARTMENT.CREATE, data);
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to create department" };
  }
};

export const getActiveDepartments = async () => {
  try {
    const res = await api.get(ENDPOINTS.DEPARTMENT.GET_ALL_ACTIVE);
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch active departments" };
  }
};

export const getAllDepartments = async () => {
  try {
    const res = await api.get(ENDPOINTS.DEPARTMENT.GET_ALL);
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch departments" };
  }
};

export const getAllCompanyDepartments = async () => {
  try {
    const res = await api.get(ENDPOINTS.DEPARTMENT.GET_ALL_COMPANY_DEPARTMENTS);
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch company departments" };
  }
};

export const updateDepartment = async (id, data) => {
  try {
    const res = await api.put(ENDPOINTS.DEPARTMENT.UPDATE(id), data);
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update department" };
  }
};

export const deleteDepartment = async (id) => {
  try {
    const res = await api.delete(ENDPOINTS.DEPARTMENT.DELETE(id));
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to delete department" };
  }
};

export const restoreDepartment = async (id) => {
  try {
    const res = await api.post(ENDPOINTS.DEPARTMENT.RESTORE(id));
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to restore department" };
  }
};

export const toggleDepartmentStatus = async (id) => {
  try {
    const res = await api.patch(ENDPOINTS.DEPARTMENT.TOGGLE_STATUS(id));
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to toggle status" };
  }
};

export const getDepartmentsByCompany = async (companyId) => {
  try {
    const res = await api.get(ENDPOINTS.DEPARTMENT.GET_BY_COMPANY(companyId));
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch departments by company" };
  }
};
