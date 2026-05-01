import { useState, useEffect } from "react";
import { IndianRupee, Play, CheckCheck, Banknote, Trash2, X, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { toast } from "react-toastify";
import { useStore } from "../../../context/StoreContext";
import DefineSalary from "./DefineSalary";
import {
    getPayrollRuns, getPayrollSummary, generatePayroll,
    approvePayroll, markPayrollPaid, deletePayrollRun,
    bulkApprovePayroll, bulkMarkPaid, getMyPayslips,
} from "../services/payrollService";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const STATUS_CLS = {
    draft:    "bg-yellow-50 text-yellow-700 border-yellow-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    paid:     "bg-green-50 text-green-700 border-green-200",
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// ── Payslip Detail Modal ──────────────────────────────────────────────────────
const PayslipModal = ({ run, onClose }) => {
    if (!run) return null;
    const earnings   = run.components?.filter(c => c.type === "earning")  || [];
    const deductions = run.components?.filter(c => c.type === "deduction") || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Payslip — {run.month}</h2>
                        {run.userId && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {run.userId.firstName} {run.userId.lastName}
                                {run.userId.employeeCode ? ` · ${run.userId.employeeCode}` : ""}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Attendance summary */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                            { label: "Working Days", value: run.totalWorkingDays },
                            { label: "Present",      value: run.presentDays },
                            { label: "Absent",       value: run.absentDays },
                            { label: "Half Days",    value: run.halfDays },
                            { label: "Paid Leave",   value: run.paidLeaveDays },
                            { label: "LOP Days",     value: run.lopDays },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-gray-50 rounded-xl p-3">
                                <p className="text-lg font-bold text-gray-800">{value}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Earnings */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Earnings</p>
                        <div className="space-y-1.5">
                            {earnings.map((c, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-600">{c.name}</span>
                                    <span className="font-medium text-gray-800">{fmt(c.amount)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm font-semibold border-t pt-1.5 mt-1">
                                <span>Gross Earnings</span>
                                <span className="text-green-600">{fmt(run.grossEarnings)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Deductions */}
                    {deductions.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Deductions</p>
                            <div className="space-y-1.5">
                                {deductions.map((c, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-gray-600">{c.name}</span>
                                        <span className="font-medium text-red-500">- {fmt(c.amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-semibold border-t pt-1.5 mt-1">
                                    <span>Total Deductions</span>
                                    <span className="text-red-500">- {fmt(run.totalDeductions)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Net */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex justify-between items-center">
                        <span className="font-semibold text-blue-800">Net Salary</span>
                        <span className="text-xl font-bold text-blue-700">{fmt(run.netSalary)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="capitalize">
                            Status: <span className={`px-2 py-0.5 rounded-full border font-medium ${STATUS_CLS[run.status]}`}>{run.status}</span>
                        </span>
                        {run.approvedBy && (
                            <span>Approved by {run.approvedBy.firstName} {run.approvedBy.lastName}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Summary Cards ─────────────────────────────────────────────────────────────
const SummaryCards = ({ summary }) => {
    if (!summary) return null;
    const cards = [
        { label: "Total",      value: summary.total,      color: "bg-gray-50 text-gray-700" },
        { label: "Draft",      value: summary.draft,      color: "bg-yellow-50 text-yellow-700" },
        { label: "Approved",   value: summary.approved,   color: "bg-blue-50 text-blue-700" },
        { label: "Paid",       value: summary.paid,       color: "bg-green-50 text-green-700" },
        { label: "Gross",      value: fmt(summary.totalGross),  color: "bg-purple-50 text-purple-700" },
        { label: "Net Payout", value: fmt(summary.totalNet),    color: "bg-indigo-50 text-indigo-700" },
    ];
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {cards.map(c => (
                <div key={c.label} className={`${c.color} rounded-xl p-4 border border-gray-100`}>
                    <p className="text-xs uppercase tracking-wide opacity-60 mb-1">{c.label}</p>
                    <p className="text-lg font-bold">{c.value}</p>
                </div>
            ))}
        </div>
    );
};

// ── Admin View ────────────────────────────────────────────────────────────────
const AdminPayroll = ({ can }) => {
    const [month, setMonth]       = useState(currentMonth());
    const [runs, setRuns]         = useState([]);
    const [summary, setSummary]   = useState(null);
    const [loading, setLoading]   = useState(false);
    const [generating, setGenerating] = useState(false);
    const [selected, setSelected] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    const load = async (m = month) => {
        try {
            setLoading(true);
            const [r, s] = await Promise.all([
                getPayrollRuns({ month: m }),
                getPayrollSummary({ month: m }),
            ]);
            setRuns(r.runs || []);
            setSummary(s.summary || null);
        } catch { toast.error("Failed to load payroll"); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [month]);

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const res = await generatePayroll({ month });
            toast.success(res.message || "Payroll generated");
            load();
        } catch (e) { toast.error(e?.response?.data?.message || "Failed to generate"); }
        finally { setGenerating(false); }
    };

    const handleApprove = async (id) => {
        try { await approvePayroll(id); toast.success("Approved"); load(); }
        catch (e) { toast.error(e?.response?.data?.message || "Failed"); }
    };

    const handleMarkPaid = async (id) => {
        try { await markPayrollPaid(id); toast.success("Marked as paid"); load(); }
        catch (e) { toast.error(e?.response?.data?.message || "Failed"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this draft payroll?")) return;
        try { await deletePayrollRun(id); toast.success("Deleted"); load(); }
        catch (e) { toast.error(e?.response?.data?.message || "Failed"); }
    };

    const handleBulkApprove = async () => {
        if (!window.confirm(`Approve all draft payrolls for ${month}?`)) return;
        try { const r = await bulkApprovePayroll(month); toast.success(r.message); load(); }
        catch (e) { toast.error(e?.response?.data?.message || "Failed"); }
    };

    const handleBulkPaid = async () => {
        if (!window.confirm(`Mark all approved payrolls as paid for ${month}?`)) return;
        try { const r = await bulkMarkPaid(month); toast.success(r.message); load(); }
        catch (e) { toast.error(e?.response?.data?.message || "Failed"); }
    };

    const hasDrafts    = runs.some(r => r.status === "draft");
    const hasApproved  = runs.some(r => r.status === "approved");

    return (
        <div>
            {/* Controls */}
            <div className="flex flex-wrap gap-3 items-center mb-5">
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

                {can("MANAGE_PAYROLL") && (
                    <button onClick={handleGenerate} disabled={generating}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition">
                        <Play size={14} /> {generating ? "Generating..." : "Generate Payroll"}
                    </button>
                )}
                {can("APPROVE_PAYROLL") && hasDrafts && (
                    <button onClick={handleBulkApprove}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                        <CheckCheck size={14} /> Bulk Approve
                    </button>
                )}
                {can("APPROVE_PAYROLL") && hasApproved && (
                    <button onClick={handleBulkPaid}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                        <Banknote size={14} /> Bulk Mark Paid
                    </button>
                )}
            </div>

            <SummaryCards summary={summary} />

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Employee</th>
                            <th className="px-4 py-3 text-left">Month</th>
                            <th className="px-4 py-3 text-right">Gross</th>
                            <th className="px-4 py-3 text-right">Deductions</th>
                            <th className="px-4 py-3 text-right">Net</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
                        ) : runs.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-14 text-center">
                                    <IndianRupee size={36} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-gray-400 text-sm">No payroll records. Click "Generate Payroll" to start.</p>
                                </td>
                            </tr>
                        ) : runs.map(run => (
                            <>
                                <tr key={run._id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {run.userId?.profilePic?.url
                                                ? <img src={run.userId.profilePic.url} className="w-7 h-7 rounded-full object-cover" alt="" />
                                                : <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                    {run.userId?.firstName?.[0]}{run.userId?.lastName?.[0]}
                                                  </div>}
                                            <div>
                                                <p className="font-medium text-gray-800">{run.userId?.firstName} {run.userId?.lastName}</p>
                                                <p className="text-xs text-gray-400">{run.userId?.employeeCode}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{run.month}</td>
                                    <td className="px-4 py-3 text-right text-gray-700">{fmt(run.grossEarnings)}</td>
                                    <td className="px-4 py-3 text-right text-red-500">- {fmt(run.totalDeductions)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(run.netSalary)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_CLS[run.status]}`}>
                                            {run.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button onClick={() => setExpandedId(expandedId === run._id ? null : run._id)}
                                                className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg transition" title="View details">
                                                {expandedId === run._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                            <button onClick={() => setSelected(run)}
                                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition" title="Payslip">
                                                <FileText size={14} />
                                            </button>
                                            {can("APPROVE_PAYROLL") && run.status === "draft" && (
                                                <button onClick={() => handleApprove(run._id)}
                                                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition" title="Approve">
                                                    <CheckCheck size={14} />
                                                </button>
                                            )}
                                            {can("APPROVE_PAYROLL") && run.status === "approved" && (
                                                <button onClick={() => handleMarkPaid(run._id)}
                                                    className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition" title="Mark Paid">
                                                    <Banknote size={14} />
                                                </button>
                                            )}
                                            {can("MANAGE_PAYROLL") && run.status === "draft" && (
                                                <button onClick={() => handleDelete(run._id)}
                                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedId === run._id && (
                                    <tr key={`${run._id}-exp`} className="bg-gray-50">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center text-xs">
                                                {[
                                                    { label: "Working Days", value: run.totalWorkingDays },
                                                    { label: "Present",      value: run.presentDays },
                                                    { label: "Absent",       value: run.absentDays },
                                                    { label: "Half Days",    value: run.halfDays },
                                                    { label: "Paid Leave",   value: run.paidLeaveDays },
                                                    { label: "LOP Days",     value: run.lopDays },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="bg-white border border-gray-200 rounded-lg p-2">
                                                        <p className="font-bold text-gray-800 text-sm">{value}</p>
                                                        <p className="text-gray-400 mt-0.5">{label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            <PayslipModal run={selected} onClose={() => setSelected(null)} />
        </div>
    );
};

// ── Employee View (My Payslips) ───────────────────────────────────────────────
const MyPayslips = () => {
    const [runs, setRuns]     = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        setLoading(true);
        getMyPayslips()
            .then(d => setRuns(d.runs || []))
            .catch(() => toast.error("Failed to load payslips"))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Month</th>
                            <th className="px-4 py-3 text-right">Gross</th>
                            <th className="px-4 py-3 text-right">Deductions</th>
                            <th className="px-4 py-3 text-right">Net Salary</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Payslip</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
                        ) : runs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-14 text-center">
                                    <IndianRupee size={36} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-gray-400 text-sm">No payslips available yet.</p>
                                </td>
                            </tr>
                        ) : runs.map(run => (
                            <tr key={run._id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3 font-medium text-gray-800">{run.month}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{fmt(run.grossEarnings)}</td>
                                <td className="px-4 py-3 text-right text-red-500">- {fmt(run.totalDeductions)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(run.netSalary)}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_CLS[run.status]}`}>
                                        {run.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => setSelected(run)}
                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition">
                                        <FileText size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PayslipModal run={selected} onClose={() => setSelected(null)} />
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const Payroll = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin      = user?.role?.name === "admin" || isSuperAdmin;
    const permissions  = user?.role?.permissions || [];
    const can = (p) => isSuperAdmin || isAdmin || permissions.includes(p);

    const showAdmin = can("MANAGE_PAYROLL") || can("APPROVE_PAYROLL");
    const [tab, setTab] = useState(showAdmin ? "admin" : "my");

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage salary runs and payslips</p>
                </div>
            </div>

            {showAdmin && (
                <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
                    <button onClick={() => setTab("admin")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "admin" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                        Payroll Runs
                    </button>
                    <button onClick={() => setTab("salary")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "salary" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                        Define Salary
                    </button>
                    <button onClick={() => setTab("my")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "my" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                        My Payslips
                    </button>
                </div>
            )}

            {tab === "admin"  && showAdmin && <AdminPayroll can={can} />}
            {tab === "salary" && showAdmin && <DefineSalary />}
            {tab === "my"     && <MyPayslips />}
        </div>
    );
};

export default Payroll;
