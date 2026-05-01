import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";


export const fetchRoles = async () => {
    try {
        const response = await api.get(ENDPOINTS.ROLE.GET_ALL_COMPANY_ROLES);
        return response.data;
    } catch (error) {
        throw error.response?.data || new Error("Failed to fetch roles");
    }
};

export const createRole = async (roleData) => {
    try {
        const response = await api.post(ENDPOINTS.ROLE.CREATE, roleData);
        return response.data;
    } catch (error) {
        throw error.response?.data || new Error("Failed to create role");
    }
};

export const getRolesByCompany = async (companyId) => {
    try {
        const response = await api.get(ENDPOINTS.ROLE.Get_Role_By_Company(companyId));
        return response.data;
    } catch (error) {
        throw error.response?.data || new Error("Failed to fetch roles by company");
    }
};


export const updateRole = async (roleId, roleData) => {
    try {
        const response = await api.put(ENDPOINTS.ROLE.UPDATE_ROLE(roleId), roleData);
        return response.data;
    } catch (error) {
        throw error.response?.data || new Error("Failed to update role");
    }
};

export const deleteRole = async (roleId) => {
    try {
        await api.delete(ENDPOINTS.ROLE.DELETE_ROLE(roleId));
    } catch (error) {
        throw error.response?.data || new Error("Failed to delete role");
    }
};

export const restore_role= async (roleId) => {
    try {
        await api.post(ENDPOINTS.ROLE.RESTORE_ROLE(roleId));
    } catch (error) {
        throw error.response?.data || new Error("Failed to delete role");
    }
};


export const fetchPermissionGroups = async () => {
    try {
        const response = await api.get("/api/permissions");
        return response.data;
    } catch (error) {
        throw error.response?.data || new Error("Failed to fetch permission groups");
    }
};

export const getAllRoles = async () => {
    try {
        const response = await api.get(ENDPOINTS.ROLE.GET_ALL_COMPANY_ROLES);
        return response.data;
    } catch (error) {
        throw error.response?.data || new Error("Failed to fetch company roles");
    }
};

export const getAllRolesForAdmin = async () => {
    try {
        const response = await api.get(ENDPOINTS.ROLE.GET_ALL);
        return response.data;
    } catch (error) {
        throw error.response?.data || new Error("Failed to fetch roles");
    }
};