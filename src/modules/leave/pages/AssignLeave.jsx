import { useState, useEffect } from "react";
import { Users, UserCheck, ChevronDown } from "lucide-react";
import { toast } from "react-toastify";
import { useStore } from "../../../context/StoreContext";
import {
    getLeaveTypes, assignLeaveBalance, bulkAssignLeaveBalance, getUserBalance,
} from "../services/leaveService";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const AssignLeave = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const canAssign     = isSuperAdmin || permissions.includes("ASSIGN_LEAVE");
    const canBulkAssign = isSuperAdmin || permissions.includes("BULK_ASSIGN_LEAVE");

    const [tab, setTab]             = useState("individual");
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [employees, setEmployees]   = useState([]);
    const [loading, setLoading]       = useState(false);

    // Individual form
    const [indForm, setIndForm] = useState({ userId: "", leaveTypeId: "", allocated: "", year: new Date().getFullYear() });
    const [userBalance, setUserBalance] = useState([]);

    // Bulk form
    const [bulkForm, setBulkForm] = useState({ leaveTypeId: "", allocated: "", year: new Date().getFullYear() });

    useEffect(() => {
        getLeaveTypes().then(d => setLeaveTypes(d.leaveTypes || [])).catch(() => {});
        api.get(ENDPOINTS.USER.GET_ALL).then(r => setEmployees(r.data.users || [])).catch(() => {});
    }, []);

    const setInd = (k, v) => setIndForm(f => ({ ...f, [k]: v }));
    const setBulk = (k, v) => setBulkForm(f => ({ ...f, [k]: v }));

    const loadUserBalance = async (userId) => {
        if (!userId) return setUserBalance([]);
        try {
            const d = await getUserBalance(userId, { year: indForm.year });
            setUserBalance(d.balances || []);
        } catch { setUserBalance([]); }
    };

    const handleIndividual = async (e) => {
        e.preventDefault();
        if (!indForm.userId || !indForm.leaveTypeId || !indForm.allocated)
            return toast.error("All fields are required");
        try {
            setLoading(true);
            await assignLeaveBalance({ ...indForm, allocated: Number(indForm.allocated) });
            toast.success("Leave balance assigned successfully");
            loadUserBalance(indForm.userId);
        } catch (err) {
            toast.error(err?.message || "Failed to assign leave");
        } finally { setLoading(false); }
    };

    const handleBulk = async (e) => {
        e.preventDefault();
        if (!bulkForm.leaveTypeId || !bulkForm.allocated)
            return toast.error("All fields are required");
        if (!window.confirm(`Assign ${bulkForm.allocated} days to ALL active employees?`)) return;
        try {
            setLoading(true);
            const res = await bulkAssignLeaveBalance({ ...bulkForm, allocated: Number(bulkForm.allocated) });
            toast.success(res.message || "Bulk assignment done");
        } catch (err) {
            toast.error(err?.message || "Failed to bulk assign");
        } finally { setLoading(false); }
    };

    if (!canAssign && !canBulkAssign)
        return (
            <div className="p-6 text-center text-gray-400 text-sm">
                You don't have permission to assign leave.
            </div>
        );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Assign Leave</h1>
                <p className="text-sm text-gray-500 mt-1">Allocate leave balance to employees</p>
            </div>

            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl mb-6 p-1 flex gap-1 w-fit">
                {canAssign && (
                    <button onClick={() => setTab("individual")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                            ${tab === "individual" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}>
                        <UserCheck size={15} /> Individual
                    </button>
                )}
                {canBulkAssign && (
                    <button onClick={() => setTab("bulk")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                            ${tab === "bulk" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}>
                        <Users size={15} /> Bulk Assign
                    </button>
                )}
            </div>

            {/* Individual */}
            {tab === "individual" && canAssign && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Assign to Employee</h2>
                        <form onSubmit={handleIndividual} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Employee</label>
                                <select value={indForm.userId}
                                    onChange={e => { setInd("userId", e.target.value); loadUserBalance(e.target.value); }}
                                    className={inputCls}>
                                    <option value="">Select employee</option>
                                    {employees.map(emp => (
                                        <option key={emp._id} value={emp._id}>
                                            {emp.firstName} {emp.lastName} {emp.employeeCode ? `(${emp.employeeCode})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Leave Type</label>
                                <select value={indForm.leaveTypeId} onChange={e => setInd("leaveTypeId", e.target.value)} className={inputCls}>
                                    <option value="">Select leave type</option>
                                    {leaveTypes.map(lt => (
                                        <option key={lt._id} value={lt._id}>{lt.name} ({lt.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Days Allocated</label>
                                    <input type="number" min="0" value={indForm.allocated}
                                        onChange={e => setInd("allocated", e.target.value)}
                                        placeholder="e.g. 12" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                                    <input type="number" value={indForm.year}
                                        onChange={e => setInd("year", e.target.value)}
                                        className={inputCls} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                                {loading ? "Assigning..." : "Assign Leave Balance"}
                            </button>
                        </form>
                    </div>

                    {/* Current balance preview */}
                    {indForm.userId && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <h2 className="text-base font-semibold text-gray-900 mb-4">Current Balance ({indForm.year})</h2>
                            {userBalance.length === 0 ? (
                                <p className="text-sm text-gray-400">No balance records found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {userBalance.map(b => {
                                        const avail = b.allocated + b.carried - b.used - b.pending;
                                        return (
                                            <div key={b._id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg text-sm">
                                                <span className="font-medium text-gray-700">{b.leaveTypeId?.name}</span>
                                                <div className="flex gap-3 text-xs text-gray-500">
                                                    <span>Alloc: <strong>{b.allocated}</strong></span>
                                                    <span>Used: <strong className="text-red-600">{b.used}</strong></span>
                                                    <span>Avail: <strong className="text-green-600">{avail}</strong></span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Bulk */}
            {tab === "bulk" && canBulkAssign && (
                <div className="max-w-lg">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-1">Bulk Assign to All Employees</h2>
                        <p className="text-xs text-gray-400 mb-4">This will assign leave balance to all active employees in your company.</p>
                        <form onSubmit={handleBulk} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Leave Type</label>
                                <select value={bulkForm.leaveTypeId} onChange={e => setBulk("leaveTypeId", e.target.value)} className={inputCls}>
                                    <option value="">Select leave type</option>
                                    {leaveTypes.map(lt => (
                                        <option key={lt._id} value={lt._id}>{lt.name} ({lt.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Days Allocated</label>
                                    <input type="number" min="0" value={bulkForm.allocated}
                                        onChange={e => setBulk("allocated", e.target.value)}
                                        placeholder="e.g. 12" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                                    <input type="number" value={bulkForm.year}
                                        onChange={e => setBulk("year", e.target.value)}
                                        className={inputCls} />
                                </div>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                                ⚠ This will overwrite existing allocations for the selected leave type and year.
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                                {loading ? "Assigning..." : "Bulk Assign to All Employees"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignLeave;
