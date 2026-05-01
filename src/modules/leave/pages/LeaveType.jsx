import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, FileText, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "react-toastify";
import { useStore } from "../../../context/StoreContext";
import {
    getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType,
} from "../services/leaveService";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const EMPTY = {
    name: "", code: "", description: "",
    defaultDays: 0, isPaid: true,
    carryForward: false, maxCarryForward: 0,
};

// ── Drawer ─────────────────────────────────────────────────────────────────────
const LeaveTypeDrawer = ({ isOpen, onClose, initial, onSubmit, loading }) => {
    const [form, setForm] = useState(EMPTY);

    useEffect(() => {
        setForm(initial ? {
            name: initial.name,
            code: initial.code,
            description: initial.description || "",
            defaultDays: initial.defaultDays ?? 0,
            isPaid: initial.isPaid ?? true,
            carryForward: initial.carryForward ?? false,
            maxCarryForward: initial.maxCarryForward ?? 0,
        } : EMPTY);
    }, [isOpen, initial]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = () => {
        if (!form.name.trim()) return toast.error("Name is required");
        if (!form.code.trim()) return toast.error("Code is required");
        onSubmit(form);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {initial ? "Edit Leave Type" : "Add Leave Type"}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">Configure leave type details</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 no-scrollbar">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input value={form.name} onChange={e => set("name", e.target.value)}
                                placeholder="e.g. Casual Leave" className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Code <span className="text-red-500">*</span>
                            </label>
                            <input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())}
                                placeholder="e.g. CL" maxLength={10} className={inputCls} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                        <textarea value={form.description} onChange={e => set("description", e.target.value)}
                            rows={2} placeholder="Optional description" className={inputCls} />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Default Days / Year</label>
                        <input type="number" min="0" value={form.defaultDays}
                            onChange={e => set("defaultDays", Number(e.target.value))} className={inputCls} />
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3 pt-1">
                        <Toggle
                            label="Paid Leave"
                            sub="Employees are paid during this leave"
                            value={form.isPaid}
                            onChange={v => set("isPaid", v)}
                        />
                        <Toggle
                            label="Carry Forward"
                            sub="Unused balance carries to next year"
                            value={form.carryForward}
                            onChange={v => set("carryForward", v)}
                        />
                    </div>

                    {form.carryForward && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Max Carry Forward Days</label>
                            <input type="number" min="0" value={form.maxCarryForward}
                                onChange={e => set("maxCarryForward", Number(e.target.value))} className={inputCls} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex justify-end gap-3">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {loading ? "Saving..." : initial ? "Update" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Toggle = ({ label, sub, value, onChange }) => (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
        <div>
            <p className="text-sm font-medium text-gray-700">{label}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
        <button type="button" onClick={() => onChange(!value)}
            className={`transition-colors ${value ? "text-blue-600" : "text-gray-300"}`}>
            {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
        </button>
    </div>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
const LeaveType = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const can = (p) => isSuperAdmin || permissions.includes(p);

    const [types, setTypes]       = useState([]);
    const [loading, setLoading]   = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    const load = () =>
        getLeaveTypes()
            .then(d => setTypes(d.leaveTypes || []))
            .catch(() => toast.error("Failed to load leave types"));

    useEffect(() => { load(); }, []);

    const handleCreate = async (data) => {
        try {
            setLoading(true);
            await createLeaveType(data);
            toast.success("Leave type created");
            setDrawerOpen(false);
            load();
        } catch (err) { toast.error(err?.message || "Failed to create"); }
        finally { setLoading(false); }
    };

    const handleUpdate = async (data) => {
        try {
            setLoading(true);
            await updateLeaveType(selected._id, data);
            toast.success("Leave type updated");
            setDrawerOpen(false);
            load();
        } catch (err) { toast.error(err?.message || "Failed to update"); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this leave type?")) return;
        try {
            await deleteLeaveType(id);
            toast.success("Leave type deleted");
            load();
        } catch { toast.error("Failed to delete"); }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leave Types</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Configure leave categories for your company</p>
                </div>
                {can("Create_LEAVE_TYPE") && (
                    <button onClick={() => { setSelected(null); setDrawerOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                        <Plus size={15} /> Add Leave Type
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Leave Type</th>
                            <th className="px-4 py-3 text-left">Code</th>
                            <th className="px-4 py-3 text-left">Default Days</th>
                            <th className="px-4 py-3 text-left">Paid</th>
                            <th className="px-4 py-3 text-left">Carry Forward</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            {(can("UPDATE_LEAVE_TYPE") || can("DELETE_LEAVE_TYPE")) && (
                                <th className="px-4 py-3 text-center">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {types.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-14 text-center">
                                    <FileText size={36} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-gray-400 text-sm">No leave types found. Add one to get started.</p>
                                </td>
                            </tr>
                        ) : types.map(lt => (
                            <tr key={lt._id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                            <FileText size={14} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{lt.name}</p>
                                            {lt.description && (
                                                <p className="text-xs text-gray-400 truncate max-w-[180px]">{lt.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-semibold">
                                        {lt.code}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{lt.defaultDays} days</td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${lt.isPaid ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                        {lt.isPaid ? "Paid" : "Unpaid"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {lt.carryForward ? (
                                        <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                            Yes {lt.maxCarryForward > 0 ? `(max ${lt.maxCarryForward})` : ""}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">No</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lt.status ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                                        {lt.status ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                {(can("UPDATE_LEAVE_TYPE") || can("DELETE_LEAVE_TYPE")) && (
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            {can("UPDATE_LEAVE_TYPE") && (
                                                <button onClick={() => { setSelected(lt); setDrawerOpen(true); }}
                                                    className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition">
                                                    <Pencil size={14} />
                                                </button>
                                            )}
                                            {can("DELETE_LEAVE_TYPE") && (
                                                <button onClick={() => handleDelete(lt._id)}
                                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <LeaveTypeDrawer
                isOpen={drawerOpen}
                onClose={() => { setDrawerOpen(false); setSelected(null); }}
                initial={selected}
                onSubmit={selected ? handleUpdate : handleCreate}
                loading={loading}
            />
        </div>
    );
};

export default LeaveType;
