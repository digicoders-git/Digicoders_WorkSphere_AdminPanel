import { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import { Calendar, Clock, FileText, Users, TrendingUp, Plus, Check, XCircle, ChevronDown } from "lucide-react";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    getMyLeaves, applyLeave, getMyBalance, getCompanyLeaves,
    approveLeave, rejectLeave, cancelLeave, getLeaveTypes, getHolidays,
} from "../modules/leave/services/leaveService";

const STATUS_COLORS = {
    pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
    approved:  "bg-green-50 text-green-700 border-green-200",
    rejected:  "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const LeaveManagement = () => {
    const { user } = useStore();
    const isAdmin = ["admin", "super_admin"].includes(user?.role?.name);
    const permissions = user?.role?.permissions || [];
    const canApprove = isAdmin || permissions.includes("APPROVE_LEAVE");
    const canReject  = isAdmin || permissions.includes("REJECT_LEAVE");
    const showTeamTab = canApprove || canReject;
    const [activeTab, setActiveTab] = useState("my-leaves");
    const year = new Date().getFullYear();

    const tabs = [
        { id: "my-leaves",   label: "My Leaves",   icon: FileText },
        { id: "apply",       label: "Apply Leave",  icon: Plus },
        { id: "balance",     label: "Balance",      icon: TrendingUp },
        ...(showTeamTab ? [{ id: "team-leaves", label: isAdmin ? "Team Leaves" : "My Team", icon: Users }] : []),
    ];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your leave applications and balance</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl mb-6 p-1 flex gap-1 overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap
                            ${activeTab === tab.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}>
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "my-leaves"   && <MyLeavesTab year={year} />}
            {activeTab === "apply"       && <ApplyLeaveTab onApplied={() => setActiveTab("my-leaves")} />}
            {activeTab === "balance"     && <BalanceTab year={year} />}
            {activeTab === "team-leaves" && showTeamTab && <TeamLeavesTab year={year} isAdmin={isAdmin} canApprove={canApprove} canReject={canReject} />}
        </div>
    );
};

// ─── My Leaves ────────────────────────────────────────────────────────────────
const MyLeavesTab = ({ year }) => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        getMyLeaves({ year })
            .then(d => setLeaves(d.leaves || []))
            .catch(e => toast.error(e.response?.data?.message || "Failed to load leaves"))
            .finally(() => setLoading(false));
    }, [year]);

    const handleCancel = async (id) => {
        if (!window.confirm("Cancel this leave application?")) return;
        try {
            await cancelLeave(id);
            toast.success("Leave cancelled");
            setLeaves(prev => prev.map(l => l._id === id ? { ...l, status: "cancelled" } : l));
        } catch (e) { toast.error(e.response?.data?.message || "Failed to cancel"); }
    };

    const filtered = filter === "all" ? leaves : leaves.filter(l => l.status === filter);

    if (loading) return <Loader />;

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-4">
                {["all", "pending", "approved", "rejected", "cancelled"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition
                            ${filter === f ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"}`}>
                        {f}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <Empty icon={FileText} text="No leave applications found" />
            ) : (
                <div className="space-y-3">
                    {filtered.map(leave => (
                        <div key={leave._id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="font-semibold text-gray-900">{leave.leaveTypeId?.name}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[leave.status]}`}>
                                            {leave.status}
                                        </span>
                                        {leave.isHalfDay && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600 border border-purple-200">
                                                Half Day · {leave.halfDayType === "first_half" ? "1st" : "2nd"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-1">
                                        <span className="flex items-center gap-1"><Calendar size={13} /> {leave.fromDate} → {leave.toDate}</span>
                                        <span className="flex items-center gap-1"><Clock size={13} /> {leave.days} day{leave.days !== 1 ? "s" : ""}</span>
                                    </div>
                                    <p className="text-sm text-gray-500">{leave.reason}</p>
                                    {leave.rejectionReason && (
                                        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                                            Rejected: {leave.rejectionReason}
                                        </p>
                                    )}
                                    {leave.approvedBy && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            {leave.status === "approved" ? "Approved" : "Actioned"} by {leave.approvedBy.firstName} {leave.approvedBy.lastName}
                                        </p>
                                    )}
                                </div>
                                {["pending", "approved"].includes(leave.status) && (
                                    <button onClick={() => handleCancel(leave._id)}
                                        className="shrink-0 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Apply Leave ──────────────────────────────────────────────────────────────
const ApplyLeaveTab = ({ onApplied }) => {
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [myLeaves, setMyLeaves] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [balances, setBalances] = useState([]);
    const [form, setForm] = useState({ leaveTypeId: "", fromDate: null, toDate: null, reason: "", isHalfDay: false, halfDayType: "first_half" });
    const [loading, setLoading] = useState(false);
    const [dayCount, setDayCount] = useState(null);
    const [breakdown, setBreakdown] = useState(null);

    useEffect(() => {
        const year = new Date().getFullYear();
        Promise.all([
            getLeaveTypes(),
            getMyLeaves({ year }),
            getHolidays({ year }),
            getMyBalance({ year }),
        ]).then(([lt, lv, hol, bal]) => {
            setLeaveTypes(lt.leaveTypes || []);
            setMyLeaves(lv.leaves || []);
            setHolidays(hol.holidays || []);
            setBalances(bal.balances || []);
        }).catch(() => {});
    }, []);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // #9 — get balance for selected leave type
    const selectedBalance = balances.find(b => b.leaveTypeId?._id === form.leaveTypeId || b.leaveTypeId === form.leaveTypeId);
    const available = selectedBalance
        ? selectedBalance.allocated + selectedBalance.carried - selectedBalance.used - selectedBalance.pending
        : null;

    const toLocalDateStr = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const excludedDates = new Set();
    myLeaves.filter(l => ["pending", "approved"].includes(l.status)).forEach(l => {
        const cur = new Date(l.fromDate + "T00:00:00");
        const to  = new Date(l.toDate   + "T00:00:00");
        while (cur <= to) { excludedDates.add(toLocalDateStr(cur)); cur.setDate(cur.getDate() + 1); }
    });
    holidays.forEach(h => excludedDates.add(h.date));

    const filterDate = (date) => !excludedDates.has(toLocalDateStr(date));
    const dayClassName = (date) => {
        const ds = toLocalDateStr(date);
        if (holidays.some(h => h.date === ds)) return "react-datepicker__day--highlighted-holiday";
        if (myLeaves.some(l => ["pending", "approved"].includes(l.status) && ds >= l.fromDate && ds <= l.toDate))
            return "react-datepicker__day--highlighted-leave";
        return undefined;
    };

    useEffect(() => {
        if (form.isHalfDay) { setDayCount(0.5); setBreakdown(null); return; }
        if (!form.fromDate || !form.toDate) { setDayCount(null); setBreakdown(null); return; }
        const from = new Date(form.fromDate.getFullYear(), form.fromDate.getMonth(), form.fromDate.getDate());
        const to   = new Date(form.toDate.getFullYear(),   form.toDate.getMonth(),   form.toDate.getDate());
        if (to < from) { setDayCount(0); setBreakdown(null); return; }
        let total = 0, working = 0, weekends = 0, holidayDays = 0;
        const cur = new Date(from);
        while (cur <= to) {
            total++;
            const d = cur.getDay(), ds = toLocalDateStr(cur);
            if (d === 0 || d === 6) weekends++;
            else if (holidays.some(h => h.date === ds)) holidayDays++;
            else working++;
            cur.setDate(cur.getDate() + 1);
        }
        setDayCount(working);
        setBreakdown({ total, working, weekends, holidayDays });
    }, [form.fromDate, form.toDate, form.isHalfDay, holidays]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.leaveTypeId || !form.fromDate || !form.toDate || !form.reason.trim())
            return toast.error("Please fill all required fields");
        try {
            setLoading(true);
            await applyLeave({ ...form, fromDate: toLocalDateStr(form.fromDate), toDate: toLocalDateStr(form.toDate) });
            toast.success("Leave applied successfully!");
            onApplied();
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to apply leave");
        } finally { setLoading(false); }
    };

    const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

    return (
        <div className="max-w-2xl">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-5">Apply for Leave</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type <span className="text-red-500">*</span></label>
                        <select value={form.leaveTypeId} onChange={e => set("leaveTypeId", e.target.value)} className={inputCls}>
                            <option value="">Select leave type</option>
                            {leaveTypes.map(lt => (
                                <option key={lt._id} value={lt._id}>{lt.name} ({lt.code}) — {lt.isPaid ? "Paid" : "Unpaid"}</option>
                            ))}
                        </select>
                        {/* #9 — Balance indicator */}
                        {form.leaveTypeId && (
                            <div className={`mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-xs border ${
                                available === null ? "bg-gray-50 border-gray-200 text-gray-500"
                                : available <= 0   ? "bg-red-50 border-red-200 text-red-600"
                                : available <= 2   ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                                : "bg-green-50 border-green-200 text-green-700"
                            }`}>
                                <TrendingUp size={13} />
                                {available === null ? "No balance record found" : (
                                    <span>
                                        Balance: <strong>{available} day{available !== 1 ? "s" : ""} available</strong>
                                        {selectedBalance && (
                                            <span className="ml-2 opacity-70">
                                                (Allocated: {selectedBalance.allocated} · Used: {selectedBalance.used} · Pending: {selectedBalance.pending})
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="halfDay" checked={form.isHalfDay} onChange={e => set("isHalfDay", e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                        <label htmlFor="halfDay" className="text-sm text-gray-700">Half Day Leave</label>
                    </div>

                    {form.isHalfDay && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Half Day Type</label>
                            <select value={form.halfDayType} onChange={e => set("halfDayType", e.target.value)} className={inputCls}>
                                <option value="first_half">First Half</option>
                                <option value="second_half">Second Half</option>
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Date <span className="text-red-500">*</span></label>
                            <DatePicker selected={form.fromDate}
                                onChange={d => { set("fromDate", d); if (form.toDate && d > form.toDate) set("toDate", null); }}
                                className={inputCls} dateFormat="yyyy-MM-dd" placeholderText="Select date"
                                minDate={new Date()} filterDate={filterDate} dayClassName={dayClassName} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Date <span className="text-red-500">*</span></label>
                            <DatePicker selected={form.toDate} onChange={d => set("toDate", d)}
                                className={inputCls} dateFormat="yyyy-MM-dd" placeholderText="Select date"
                                minDate={form.fromDate || new Date()} disabled={form.isHalfDay}
                                filterDate={filterDate} dayClassName={dayClassName} />
                        </div>
                    </div>

                    {dayCount !== null && (
                        <div className={`rounded-lg border px-4 py-3 text-sm ${
                            dayCount === 0 ? "bg-red-50 border-red-200 text-red-600" : "bg-blue-50 border-blue-200 text-blue-700"
                        }`}>
                            {dayCount === 0 ? (
                                <p className="font-medium">No working days in selected range</p>
                            ) : (
                                <>
                                    <p className="font-semibold">{dayCount} working day{dayCount !== 1 ? "s" : ""} will be deducted</p>
                                    {breakdown && breakdown.total > breakdown.working && (
                                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-600/80">
                                            <span>📅 {breakdown.total} calendar day{breakdown.total !== 1 ? "s" : ""} selected</span>
                                            {breakdown.weekends > 0 && <span>🏖️ {breakdown.weekends} week off excluded</span>}
                                            {breakdown.holidayDays > 0 && <span>🎉 {breakdown.holidayDays} holiday excluded</span>}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
                        <textarea value={form.reason} onChange={e => set("reason", e.target.value)} rows={3}
                            className={inputCls} placeholder="Enter reason for leave" />
                    </div>

                    <button type="submit" disabled={loading || available === 0}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                        {loading ? "Submitting..." : "Submit Leave Application"}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ─── Balance ──────────────────────────────────────────────────────────────────
const BalanceTab = ({ year }) => {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMyBalance({ year })
            .then(d => setBalances(d.balances || []))
            .catch(e => toast.error(e.response?.data?.message || "Failed to load balance"))
            .finally(() => setLoading(false));
    }, [year]);

    if (loading) return <Loader />;
    if (!balances.length) return <Empty icon={TrendingUp} text="No leave balance assigned yet" />;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.map(bal => {
                const total     = bal.allocated + bal.carried;
                const available = total - bal.used - bal.pending;
                const usedPct   = total > 0 ? (bal.used   / total) * 100 : 0;
                const pendPct   = total > 0 ? (bal.pending / total) * 100 : 0;

                return (
                    <div key={bal._id} className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">{bal.leaveTypeId?.name}</h3>
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">{bal.leaveTypeId?.code}</span>
                        </div>
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Available: <strong className="text-gray-800">{available}</strong> days</span>
                                <span>Total: {total}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                <div className="bg-red-400 transition-all" style={{ width: `${usedPct}%` }} />
                                <div className="bg-yellow-400 transition-all" style={{ width: `${pendPct}%` }} />
                            </div>
                            <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Used</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Pending</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {[
                                { label: "Allocated", value: bal.allocated, cls: "bg-gray-50 text-gray-700" },
                                { label: "Carried",   value: bal.carried,   cls: "bg-gray-50 text-gray-700" },
                                { label: "Used",      value: bal.used,      cls: "bg-red-50 text-red-700" },
                                { label: "Pending",   value: bal.pending,   cls: "bg-yellow-50 text-yellow-700" },
                            ].map(({ label, value, cls }) => (
                                <div key={label} className={`rounded-lg p-2 ${cls}`}>
                                    <p className="text-xs opacity-70">{label}</p>
                                    <p className="font-bold">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Team Leaves (Admin/Manager) ────────────────────────────────────────────
const TeamLeavesTab = ({ year, isAdmin }) => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("pending");
    const [rejectModal, setRejectModal] = useState(null); // leave id
    const [rejectReason, setRejectReason] = useState("");

    useEffect(() => {
        getCompanyLeaves({ year })
            .then(d => setLeaves(d.leaves || []))
            .catch(e => toast.error(e.response?.data?.message || "Failed to load team leaves"))
            .finally(() => setLoading(false));
    }, [year]);

    const handleApprove = async (id) => {
        try {
            await approveLeave(id);
            toast.success("Leave approved");
            setLeaves(prev => prev.map(l => l._id === id ? { ...l, status: "approved" } : l));
        } catch (e) { toast.error(e.response?.data?.message || "Failed to approve"); }
    };

    const handleRejectSubmit = async () => {
        if (!rejectReason.trim()) return toast.error("Enter a rejection reason");
        try {
            await rejectLeave(rejectModal, { rejectionReason: rejectReason });
            toast.success("Leave rejected");
            setLeaves(prev => prev.map(l => l._id === rejectModal ? { ...l, status: "rejected", rejectionReason: rejectReason } : l));
            setRejectModal(null);
            setRejectReason("");
        } catch (e) { toast.error(e.response?.data?.message || "Failed to reject"); }
    };

    const filtered = filter === "all" ? leaves : leaves.filter(l => l.status === filter);

    if (loading) return <Loader />;

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-4">
                {["all", "pending", "approved", "rejected"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition
                            ${filter === f ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"}`}>
                        {f}
                        {f === "pending" && leaves.filter(l => l.status === "pending").length > 0 && (
                            <span className="ml-1.5 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {leaves.filter(l => l.status === "pending").length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <Empty icon={Users} text="No team leave applications found" />
            ) : (
                <div className="space-y-3">
                    {filtered.map(leave => (
                        <div key={leave._id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition">
                            <div className="flex items-start gap-4">
                                {leave.userId?.profilePic?.url ? (
                                    <img src={leave.userId.profilePic.url} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                                        {leave.userId?.firstName?.[0]}{leave.userId?.lastName?.[0]}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-900">{leave.userId?.firstName} {leave.userId?.lastName}</span>
                                        {leave.userId?.employeeCode && <span className="text-xs text-gray-400">({leave.userId.employeeCode})</span>}
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[leave.status]}`}>
                                            {leave.status}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-blue-600">{leave.leaveTypeId?.name}</span>
                                        {leave.isHalfDay && (
                                            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600 border border-purple-200">
                                                Half Day
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-1">
                                        <span className="flex items-center gap-1"><Calendar size={13} /> {leave.fromDate} → {leave.toDate}</span>
                                        <span className="flex items-center gap-1"><Clock size={13} /> {leave.days} working day{leave.days !== 1 ? "s" : ""}</span>
                                        {(() => {
                                            const from = new Date(leave.fromDate + "T00:00:00");
                                            const to   = new Date(leave.toDate   + "T00:00:00");
                                            let total = 0;
                                            const cur = new Date(from);
                                            while (cur <= to) { total++; cur.setDate(cur.getDate() + 1); }
                                            const skipped = total - leave.days;
                                            return skipped > 0 ? (
                                                <span className="text-xs text-gray-400">({total} calendar days · {skipped} weekend/holiday excluded)</span>
                                            ) : null;
                                        })()}
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">{leave.reason}</p>
                                    {leave.rejectionReason && (
                                        <p className="mt-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                                            Rejected: {leave.rejectionReason}
                                        </p>
                                    )}
                                </div>
                                {leave.status === "pending" && (
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => handleApprove(leave._id)}
                                            className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition flex items-center gap-1">
                                            <Check size={13} /> Approve
                                        </button>
                                        <button onClick={() => { setRejectModal(leave._id); setRejectReason(""); }}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition flex items-center gap-1">
                                            <XCircle size={13} /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Reject Leave</h3>
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none mb-4"
                            placeholder="Enter rejection reason..." />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setRejectModal(null)}
                                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button onClick={handleRejectSubmit}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                                Reject Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Shared helpers ───────────────────────────────────────────────────────────
const Loader = () => <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>;
const Empty = ({ icon: Icon, text }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-14 text-center">
        <Icon size={44} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-400 text-sm">{text}</p>
    </div>
);

export default LeaveManagement;
