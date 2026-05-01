import { useState, useEffect } from "react";
import { Plus, Trash2, X, Pencil } from "lucide-react";
import { toast } from "react-toastify";
import {
    getCompanyStructures, createSalaryStructure,
    updateSalaryStructure, deleteSalaryStructure,
} from "../services/payrollService";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const EMPTY_COMPONENT = { name: "", type: "earning", calcType: "fixed", value: "" };

const SalaryModal = ({ initial, employees, onClose, onSaved }) => {
    const editing = !!initial;
    const [form, setForm] = useState(
        initial
            ? { userId: initial.userId?._id || "", effectiveFrom: initial.effectiveFrom, ctc: initial.ctc, basic: initial.basic, components: initial.components || [] }
            : { userId: "", effectiveFrom: "", ctc: "", basic: "", components: [] }
    );
    const [saving, setSaving] = useState(false);

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const setComp = (i, k, v) =>
        setForm(f => ({ ...f, components: f.components.map((c, idx) => idx === i ? { ...c, [k]: v } : c) }));

    const addComp = () => setForm(f => ({ ...f, components: [...f.components, { ...EMPTY_COMPONENT }] }));
    const removeComp = (i) => setForm(f => ({ ...f, components: f.components.filter((_, idx) => idx !== i) }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const payload = { ...form, ctc: Number(form.ctc), basic: Number(form.basic), components: form.components.map(c => ({ ...c, value: Number(c.value) })) };
            if (editing) await updateSalaryStructure(initial._id, payload);
            else await createSalaryStructure(payload);
            toast.success(editing ? "Salary structure updated" : "Salary structure created");
            onSaved();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-gray-900">{editing ? "Edit" : "Define"} Salary Structure</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {!editing && (
                        <div>
                            <label className="text-xs font-medium text-gray-600">Employee</label>
                            <select required value={form.userId} onChange={e => setField("userId", e.target.value)}
                                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select employee</option>
                                {employees.map(u => (
                                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName} {u.employeeCode ? `(${u.employeeCode})` : ""}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-600">Effective From</label>
                            <input required type="date" value={form.effectiveFrom} onChange={e => setField("effectiveFrom", e.target.value)}
                                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Annual CTC (₹)</label>
                            <input required type="number" min="0" value={form.ctc} onChange={e => setField("ctc", e.target.value)}
                                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Monthly Basic (₹)</label>
                            <input required type="number" min="0" value={form.basic} onChange={e => setField("basic", e.target.value)}
                                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    {/* Components */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Components</p>
                            <button type="button" onClick={addComp}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                                <Plus size={13} /> Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {form.components.map((c, i) => (
                                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
                                    <input placeholder="Name (e.g. HRA)" value={c.name} onChange={e => setComp(i, "name", e.target.value)}
                                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <select value={c.type} onChange={e => setComp(i, "type", e.target.value)}
                                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="earning">Earning</option>
                                        <option value="deduction">Deduction</option>
                                    </select>
                                    <select value={c.calcType} onChange={e => setComp(i, "calcType", e.target.value)}
                                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="fixed">Fixed</option>
                                        <option value="percentage">% of Basic</option>
                                    </select>
                                    <input type="number" min="0" placeholder={c.calcType === "percentage" ? "%" : "₹"} value={c.value} onChange={e => setComp(i, "value", e.target.value)}
                                        className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <button type="button" onClick={() => removeComp(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 transition">
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DefineSalary = () => {
    const [structures, setStructures] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(null); // null | "create" | structure object

    const load = async () => {
        try {
            setLoading(true);
            const [sRes, uRes] = await Promise.all([
                getCompanyStructures(),
                api.get(ENDPOINTS.USER.GET_ALL).then(r => r.data),
            ]);
            setStructures(sRes.structures || []);
            setEmployees(uRes.users || uRes.data || []);
        } catch { toast.error("Failed to load salary structures"); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this salary structure?")) return;
        try { await deleteSalaryStructure(id); toast.success("Deleted"); load(); }
        catch (e) { toast.error(e?.response?.data?.message || "Failed"); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Active salary structures for all employees</p>
                <button onClick={() => setModal("create")}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                    <Plus size={14} /> Define Salary
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Employee</th>
                            <th className="px-4 py-3 text-left">Effective From</th>
                            <th className="px-4 py-3 text-right">Annual CTC</th>
                            <th className="px-4 py-3 text-right">Monthly Basic</th>
                            <th className="px-4 py-3 text-right">Gross</th>
                            <th className="px-4 py-3 text-right">Net</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
                        ) : structures.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-14 text-center text-gray-400 text-sm">
                                    No salary structures defined yet.
                                </td>
                            </tr>
                        ) : structures.map(s => (
                            <tr key={s._id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {s.userId?.profilePic?.url
                                            ? <img src={s.userId.profilePic.url} className="w-7 h-7 rounded-full object-cover" alt="" />
                                            : <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                {s.userId?.firstName?.[0]}{s.userId?.lastName?.[0]}
                                              </div>}
                                        <div>
                                            <p className="font-medium text-gray-800">{s.userId?.firstName} {s.userId?.lastName}</p>
                                            <p className="text-xs text-gray-400">{s.userId?.employeeCode}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{s.effectiveFrom}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{fmt(s.ctc)}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{fmt(s.basic)}</td>
                                <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(s.grossEarnings)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(s.netSalary)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button onClick={() => setModal(s)}
                                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition" title="Edit">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(s._id)}
                                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <SalaryModal
                    initial={modal === "create" ? null : modal}
                    employees={employees}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
        </div>
    );
};

export default DefineSalary;
