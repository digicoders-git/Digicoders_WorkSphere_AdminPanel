import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Briefcase, X, Check } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { getCompanyEmploymentStatuses, createEmploymentStatus, updateEmploymentStatus, deleteEmploymentStatus, toggleEmploymentStatus } from "../services/employmentStatusService";
import { fetchAllCompaniesList } from "../../company/services/companyService";
import { toast } from "react-toastify";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const EMPTY = { name: "", description: "", companyId: "" };

const StatusDrawer = ({ isOpen, onClose, initial, companies, isSuperAdmin, onSubmit, loading }) => {
    const [form, setForm] = useState(EMPTY);

    useEffect(() => {
        setForm(initial ? { name: initial.name || "", description: initial.description || "", companyId: initial.companyId?._id || initial.companyId || "" } : EMPTY);
    }, [initial, isOpen]);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{initial ? "Edit Status" : "Add Employment Status"}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Define employment types for your organization</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {isSuperAdmin && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Company</label>
                            <select className={inputCls} value={form.companyId} onChange={e => set("companyId", e.target.value)} required>
                                <option value="">Select company</option>
                                {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status Name</label>
                        <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Full-time, Part-time, Contract" required />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description (optional)</label>
                        <textarea className={inputCls} rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description..." />
                    </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={() => onSubmit(form)} disabled={loading || !form.name}
                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {loading ? "Saving..." : initial ? "Update" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EmploymentStatusPage = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const [statuses, setStatuses] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        try {
            const res = await getCompanyEmploymentStatuses();
            setStatuses(res.employmentStatuses || []);
        } catch { toast.error("Failed to load employment statuses"); }
    };

    useEffect(() => {
        load();
        if (isSuperAdmin) fetchAllCompaniesList().then(d => setCompanies(d.companies || [])).catch(() => {});
    }, []);

    const handleSubmit = async (form) => {
        try {
            setLoading(true);
            const data = { ...form };
            if (!isSuperAdmin) data.companyId = user?.companyId?._id || user?.companyId;
            if (selected) await updateEmploymentStatus(selected._id, data);
            else await createEmploymentStatus(data);
            toast.success(selected ? "Status updated" : "Status created");
            setOpen(false); setSelected(null); load();
        } catch (e) { toast.error(e?.response?.data?.message || "Failed to save"); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        try { await deleteEmploymentStatus(id); toast.success("Deleted"); load(); }
        catch { toast.error("Failed to delete"); }
    };

    const handleToggle = async (id) => {
        try { await toggleEmploymentStatus(id); load(); }
        catch { toast.error("Failed to toggle"); }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Employment Status</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage employment types like Full-time, Part-time, Contract, etc.</p>
                </div>
                <button onClick={() => { setSelected(null); setOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                    <Plus size={16} /> Add Status
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Name</th>
                            {isSuperAdmin && <th className="px-4 py-3 text-left">Company</th>}
                            <th className="px-4 py-3 text-left">Description</th>
                            <th className="px-4 py-3 text-left">Created By</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {statuses.length === 0 ? (
                            <tr><td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-10 text-center text-gray-400">No employment statuses found.</td></tr>
                        ) : statuses.map(s => (
                            <tr key={s._id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                            <Briefcase size={16} />
                                        </div>
                                        <p className="font-medium text-gray-800">{s.name}</p>
                                    </div>
                                </td>
                                {isSuperAdmin && <td className="px-4 py-3 text-gray-600">{s.companyId?.name || "—"}</td>}
                                <td className="px-4 py-3 text-gray-500">{s.description || "—"}</td>
                                <td className="px-4 py-3 text-xs">
                                    <div>
                                        <p className="font-medium text-gray-700">
                                            {s.createdBy ? `${s.createdBy.firstName} ${s.createdBy.lastName}` : "System"}
                                        </p>
                                        <p className="text-gray-400">
                                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                        </p>
                                        {s.updatedBy && <p className="text-gray-400 mt-0.5">Upd: {s.updatedBy.firstName} {s.updatedBy.lastName}</p>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${s.status ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                                        {s.status ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => handleToggle(s._id)}
                                            className={`p-2 rounded-lg transition ${s.status ? "bg-red-50 hover:bg-red-100 text-red-500" : "bg-green-50 hover:bg-green-100 text-green-600"}`}>
                                            {s.status ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                        </button>
                                        <button onClick={() => { setSelected(s); setOpen(true); }}
                                            className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition">
                                            <Pencil size={15} />
                                        </button>
                                        <button onClick={() => handleDelete(s._id)}
                                            className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <StatusDrawer isOpen={open} onClose={() => { setOpen(false); setSelected(null); }}
                initial={selected} companies={companies} isSuperAdmin={isSuperAdmin}
                onSubmit={handleSubmit} loading={loading} />
        </div>
    );
};

export default EmploymentStatusPage;
