import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Clock, X } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { getCompanyWorkShifts, createWorkShift, updateWorkShift, deleteWorkShift, toggleWorkShiftStatus } from "../services/workShiftService";
import { fetchAllCompaniesList } from "../../company/services/companyService";
import { toast } from "react-toastify";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EMPTY_FORM = { name: "", startTime: "", endTime: "", gracePeriod: 0, lateThreshold: 30, earlyLeaveThreshold: 30, weekOff: [0, 6], companyId: "", status: true };

const Field = ({ label, children }) => (
    <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const ShiftDrawer = ({ isOpen, onClose, initial, companies, isSuperAdmin, onSubmit, loading }) => {
    const [form, setForm] = useState(EMPTY_FORM);

    useEffect(() => {
        setForm(initial
            ? { ...initial, companyId: initial.companyId?._id || initial.companyId || "", weekOff: initial.weekOff ?? [0, 6] }
            : EMPTY_FORM
        );
    }, [initial, isOpen]);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const toggleDay = (d) => setForm(p => ({
        ...p,
        weekOff: p.weekOff.includes(d) ? p.weekOff.filter(x => x !== d) : [...p.weekOff, d],
    }));

    const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{initial ? "Edit Shift" : "Add Shift"}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Configure shift timings and thresholds</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <Field label="Shift Name">
                        <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Morning Shift" required />
                    </Field>

                    {isSuperAdmin && (
                        <Field label="Company">
                            <select className={inputCls} value={form.companyId} onChange={e => set("companyId", e.target.value)} required>
                                <option value="">Select company</option>
                                {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </Field>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Start Time">
                            <input type="time" className={inputCls} value={form.startTime} onChange={e => set("startTime", e.target.value)} required />
                        </Field>
                        <Field label="End Time">
                            <input type="time" className={inputCls} value={form.endTime} onChange={e => set("endTime", e.target.value)} required />
                        </Field>
                    </div>

                    <Field label="Week Off Days">
                        <div className="flex flex-wrap gap-2 mt-1">
                            {DAY_LABELS.map((d, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => toggleDay(i)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                        form.weekOff.includes(i)
                                            ? "bg-red-500 text-white border-red-500"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Selected days will be marked as week off on the attendance calendar.</p>
                    </Field>

                    <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Attendance Thresholds</p>
                        <Field label="Grace Period (minutes) — allowed late without penalty">
                            <input type="number" min={0} max={60} className={inputCls} value={form.gracePeriod} onChange={e => set("gracePeriod", +e.target.value)} />
                        </Field>
                        <Field label="Late Threshold (minutes) — after grace, mark as Late">
                            <input type="number" min={1} max={120} className={inputCls} value={form.lateThreshold} onChange={e => set("lateThreshold", +e.target.value)} />
                        </Field>
                        <Field label="Early Leave Threshold (minutes) — before end time, mark Early Leave">
                            <input type="number" min={1} max={120} className={inputCls} value={form.earlyLeaveThreshold} onChange={e => set("earlyLeaveThreshold", +e.target.value)} />
                        </Field>
                    </div>

                    {form.startTime && form.endTime && (
                        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
                            <p className="font-semibold text-gray-700 mb-2">Shift Preview</p>
                            <p>✅ On time: before <strong>{form.startTime}</strong> + {form.gracePeriod}min grace</p>
                            <p>⚠️ Late: after <strong>{form.startTime}</strong> + {form.gracePeriod + form.lateThreshold}min</p>
                            <p>🚪 Early leave: checkout before <strong>{form.endTime}</strong> - {form.earlyLeaveThreshold}min</p>
                            <p>🏖️ Week off: <strong>{form.weekOff.sort().map(d => DAY_LABELS[d]).join(", ") || "None"}</strong></p>
                        </div>
                    )}
                </form>

                <div className="px-6 py-4 border-t flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {loading ? "Saving..." : initial ? "Update Shift" : "Create Shift"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const WorkShift = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";

    const [shifts, setShifts] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        try {
            const res = await getCompanyWorkShifts();
            setShifts(res.data || []);
        } catch { toast.error("Failed to load shifts"); }
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
            if (selected) await updateWorkShift(selected._id, data);
            else await createWorkShift(data);
            toast.success(selected ? "Shift updated" : "Shift created");
            setOpen(false); setSelected(null); load();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to save shift");
        } finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        try { await deleteWorkShift(id); toast.success("Shift deleted"); load(); }
        catch { toast.error("Failed to delete shift"); }
    };

    const handleToggle = async (id) => {
        try { await toggleWorkShiftStatus(id); load(); }
        catch { toast.error("Failed to toggle status"); }
    };

    const fmt12 = (t) => {
        if (!t) return "—";
        const [h, m] = t.split(":").map(Number);
        return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
    };

    const colSpan = isSuperAdmin ? 8 : 7;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Work Shifts</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage shift timings, week off days and attendance thresholds.</p>
                </div>
                <button
                    onClick={() => { setSelected(null); setOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                    <Plus size={16} /> Add Shift
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Shift</th>
                            {isSuperAdmin && <th className="px-4 py-3 text-left">Company</th>}
                            <th className="px-4 py-3 text-left">Timing</th>
                            <th className="px-4 py-3 text-left">Week Off</th>
                            <th className="px-4 py-3 text-left">Thresholds</th>
                            <th className="px-4 py-3 text-left">Created By</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {shifts.length === 0 ? (
                            <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-gray-400">No shifts found. Create one to get started.</td></tr>
                        ) : shifts.map(s => (
                            <tr key={s._id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <Clock size={16} />
                                        </div>
                                        <p className="font-medium text-gray-800">{s.name}</p>
                                    </div>
                                </td>
                                {isSuperAdmin && <td className="px-4 py-3 text-gray-600">{s.companyId?.name || "—"}</td>}
                                <td className="px-4 py-3">
                                    <p className="text-gray-800 font-medium">{fmt12(s.startTime)} – {fmt12(s.endTime)}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {(s.weekOff?.length ? [...s.weekOff].sort() : []).map(d => (
                                            <span key={d} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-100">
                                                {DAY_LABELS[d]}
                                            </span>
                                        ))}
                                        {!s.weekOff?.length && <span className="text-xs text-gray-400">—</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500 space-y-0.5">
                                    <p>Grace: <span className="font-medium text-gray-700">{s.gracePeriod}m</span></p>
                                    <p>Late after: <span className="font-medium text-yellow-600">{s.gracePeriod + s.lateThreshold}m</span></p>
                                    <p>Early leave: <span className="font-medium text-orange-600">{s.earlyLeaveThreshold}m before end</span></p>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-xs">
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
                                            className={`p-2 rounded-lg transition ${s.status ? "bg-red-50 hover:bg-red-100 text-red-500" : "bg-green-50 hover:bg-green-100 text-green-600"}`}
                                            title={s.status ? "Deactivate" : "Activate"}>
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

            <ShiftDrawer
                isOpen={open}
                onClose={() => { setOpen(false); setSelected(null); }}
                initial={selected}
                companies={companies}
                isSuperAdmin={isSuperAdmin}
                onSubmit={handleSubmit}
                loading={loading}
            />
        </div>
    );
};

export default WorkShift;
