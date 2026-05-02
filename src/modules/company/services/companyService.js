import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

// 🔹 Get all companies (paginated or default list)
export const fetchAllCompanies = async () => {
  try {
    const response = await api.get(ENDPOINTS.COMPANY.GET_ALL);
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to fetch companies");
  }
};

// 🔹 Get all companies (explicit /all route)
export const fetchAllCompaniesList = async () => {
  try {
    const response = await api.get(ENDPOINTS.COMPANY.GET_ALL_MY_COMPANIES);
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to fetch companies");
  }
};
export const fetchAllCompaniesForSuperAdmin = async () => {
  try {
    const response = await api.get(ENDPOINTS.COMPANY.GET_ALL_COMPANIES);
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to fetch companies");
  }
};


// 🔹 Get company by ID
export const fetchCompanyById = async (companyId) => {
  try {
    const response = await api.get(
      ENDPOINTS.COMPANY.GET_COMPANY_BY_ID(companyId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to fetch company");
  }
};


// 🔹 Create company along with Admin user
export const createCompanyWithAdmin = async (companyData) => {
  try {
    const response = await api.post(
      ENDPOINTS.COMPANY.CREATE_WITH_ADMIN,
      companyData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to create company with admin");
  }
};


export const updateCompanyWithAdmin = async (companyId, companyData) => {
  try {
    const response = await api.put(
      ENDPOINTS.COMPANY.UPDATE_WITH_ADMIN(companyId),
      companyData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to update company with admin");
   }
};


// 🔹 Update company
export const updateCompany = async (companyId, companyData) => {
  try {
    const response = await api.put(
      ENDPOINTS.COMPANY.UPDATE_COMPANY(companyId),
      companyData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to update company");
  }
};

// 🔹 Delete company
export const deleteCompany = async (companyId) => {
  try {
    const response = await api.delete(
      ENDPOINTS.COMPANY.DELETE_COMPANY(companyId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to delete company");
  }
};

// 🔹 Toggle company status
export const toggleCompanyStatus = async (companyId) => {
  try {
    const response = await api.patch(
      ENDPOINTS.COMPANY.TOGGLE_COMPANY_STATUS(companyId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to toggle company status");
  }
};

// 🔹 Upload company icon
export const uploadCompanyIcon = async (companyId, file) => {
  try {
    const form = new FormData();
    form.append("icon", file);
    const response = await api.patch(ENDPOINTS.COMPANY.UPLOAD_ICON(companyId), form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to upload company icon");
  }
};