import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const P = ENDPOINTS.PAYROLL;

// Salary Structure
export const createSalaryStructure  = (data)     => api.post(P.SALARY_STRUCTURE, data).then(r => r.data);
export const updateSalaryStructure  = (id, data) => api.put(P.SALARY_STRUCTURE_UPDATE(id), data).then(r => r.data);
export const deleteSalaryStructure  = (id)       => api.delete(P.SALARY_STRUCTURE_DELETE(id)).then(r => r.data);
export const getCompanyStructures   = ()          => api.get(P.SALARY_STRUCTURE_COMPANY).then(r => r.data);
export const getUserStructures      = (userId)    => api.get(P.SALARY_STRUCTURE_USER(userId)).then(r => r.data);

// Payroll Run
export const generatePayroll    = (data)          => api.post(P.RUN, data).then(r => r.data);
export const getPayrollRuns     = (params, signal) => api.get(P.RUN, { params, signal }).then(r => r.data);
export const getPayrollSummary  = (params, signal) => api.get(P.SUMMARY, { params, signal }).then(r => r.data);
export const approvePayroll     = (id)             => api.patch(P.RUN_APPROVE(id)).then(r => r.data);
export const markPayrollPaid    = (id)             => api.patch(P.RUN_MARK_PAID(id)).then(r => r.data);
export const deletePayrollRun   = (id)             => api.delete(P.RUN_DELETE(id)).then(r => r.data);
export const bulkApprovePayroll = (month)          => api.patch(P.BULK_APPROVE, { month }).then(r => r.data);
export const bulkMarkPaid       = (month)          => api.patch(P.BULK_MARK_PAID, { month }).then(r => r.data);

// Employee
export const getMyPayslips = (signal) => api.get(P.MY, { signal }).then(r => r.data);
