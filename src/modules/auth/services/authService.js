import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

export const login = async (credentials) => {
  try {
    const response = await api.post(ENDPOINTS.AUTH.LOGIN, credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Login failed", success: false };
  }
};

export const forgotPassword = async (data) => {
  try {
    const response = await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to send OTP", success: false };
  }
};

export const resetPassword = async (data) => {
  try {
    const response = await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to reset password", success: false };
  }
};

export const authlogout = async () => {
  try {
    const response = await api.get(ENDPOINTS.AUTH.LOGOUT);
    return response.data;
  } catch {
    throw new Error("Logout failed");
  }
};

export const getProfile = async () => {
  try {
    const response = await api.get(ENDPOINTS.AUTH.PROFILE);
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to fetch profile");
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put(ENDPOINTS.AUTH.PROFILE, profileData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to update profile");
  }
};

export const changePassword = async (data) => {
  try {
    const response = await api.patch("/api/user/change-password", data);
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to change password");
  }
};

export const adminChangePassword = async (userId, newPassword) => {
  try {
    const response = await api.patch(ENDPOINTS.USER.ADMIN_CHANGE_PASSWORD(userId), { newPassword });
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to change password");
  }
};

export const verifyToken = async () => {
  try {
    const response = await api.get(ENDPOINTS.AUTH.VERIFY_TOKEN);
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Failed to verify token");
  }
};
