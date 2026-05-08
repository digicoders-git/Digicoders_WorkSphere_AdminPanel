import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Search, X, Pencil, Trash2, Phone, Mail, Building2, User, ChevronDown, MessageSquare, Clock, Send, Eye } from "lucide-react";
import { toast } from "react-toastify";
import { useStore } from "../../../context/StoreContext";
import { getLeads, getLeadById, createLead, updateLead, deleteLead, addCommunication } from "../services/leadService";
import { fetchUsers } from "../../employee/services/UserService";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const STATUSES = ["New Lead", "Contacted", "Meeting Scheduled", "Proposal Sent", "Sent to Project Team", "Project Done", "On Hold", "Cancelled"];

const STATUS_COLORS = {
    "New Lead":              "bg-blue-50 text-blue-700 border-blue-200",
    "Contacted":             "bg-purple-50 text-purple-700 border-purple-200",
    "Meeting Scheduled":     "bg-yellow-50 text-yellow-700 border-yellow-200",
    "Proposal Sent":         "bg-orange-50 text-orange-700 border-orange-200",
    "Sent to Project Team":  "bg-indigo-50 text-indigo-700 border-indigo-200",
    "Project Done":          "bg-green-50 text-green-700 border-green-200",
    "On Hold":               "bg-gray-50 text-gray-600 border-gray-200",
    "Cancelled":             "bg-red-50 text-red-600 border-red-200",
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fullName = (u) => u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "—";

// ── Lead Drawer (Create / Edit) ───────────────────────────────────────────────
const EMPTY_FORM = { contactNumber: "", orgName: "", address: "", contactPerson: "", designation: "", cellNumber: "", email: "", status: "New Lead", assignedTo: "" };

const LeadDrawer = ({ isOpen, onClose, initial, onSubmit, loading, users }) => {
    const [form, setForm] = useState(EMPTY_FORM);

    useEffect(() => {
        if (initial) {
            setForm({
                contactNumber: initial.contactNumber || "",
                orgName:       initial.orgName || "",
                address:       initial.address || "",
                contactPerson: initial.contactPerson || "",
                designation:   initial.designation || "",
                cellNumber:    initial.cellNumber || "",
                email:         initial.email || "",
                status:        initial.status || "New Lead",
                assignedTo:    initial.assignedTo?._id || initial.assignedTo || "",
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [isOpen, initial]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = () => {
        if (!form.contactNumber.trim()) return toast.error("Contact number is required");
        if (!form.orgName.trim()) return toast.error("Organisation name is required");
        onSubmit(form);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-gray-900">{initial ? "Edit Lead" : "New Lead"}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {[
                        { label: "Contact Number", key: "contactNumber", required: true, placeholder: "10-digit number" },
                        { label: "Organisation Name", key: "orgName", required: true, placeholder: "Company / org name" },
                        { label: "Address", key: "address", placeholder: "Full address" },
                        { label: "Contact Person", key: "contactPerson", placeholder: "Name of contact" },
                        { label: "Designation", key: "designation", placeholder: "Their designation" },
                        { label: "Cell Number", key: "cellNumber", placeholder: "Alternate number" },
                        { label: "Email", key: "email", placeholder: "email@example.com" },
                    ].map(({ label, key, required, placeholder }) => (
                        <div key={key}>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                {label} {required && <span className="text-red-500">*</span>}
                            </label>
                            <input value={form[key]} onChange={e => set(key, e.target.value)}
                                placeholder={placeholder} className={inputCls} />
                        </div>
                    ))}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
                        <select value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} className={inputCls}>
                            <option value="">— Unassigned —</option>
                            {users.map(u => (
                                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {loading ? "Saving..." : initial ? "Update" : "Create Lead"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Lead Detail Modal ─────────────────────────────────────────────────────────
const LeadDetailModal = ({ leadId, onClose, onEdit }) => {
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("info");
    const [commForm, setCommForm] = useState({ subject: "", description: "" });
    const [commLoading, setCommLoading] = useState(false);

    const load = useCallback(async () => {
        if (!leadId) return;
        try {
            setLoading(true);
            const res = await getLeadById(leadId);
            setLead(res.lead);
        } catch { toast.error("Failed to load lead details"); }
        finally { setLoading(false); }
    }, [leadId]);

    useEffect(() => { load(); }, [load]);

    const handleAddComm = async () => {
        if (!commForm.subject.trim() || !commForm.description.trim())
            return toast.error("Subject and description are required");
        try {
            setCommLoading(true);
            await addCommunication(leadId, commForm);
            toast.success("Communication added");
            setCommForm({ subject: "", description: "" });
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to add communication");
        } finally { setCommLoading(false); }
    };

    if (!leadId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">{lead?.orgName || "Lead Details"}</h2>
                        {lead && (
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium border mt-1 ${STATUS_COLORS[lead.status]}`}>
                                {lead.status}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {lead && (
                            <button onClick={() => onEdit(lead)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg">
                                <Pencil size={12} /> Edit
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b px-6">
                    {["info", "communications", "history"].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                            {t}
                            {t === "communications" && lead?.communications?.length > 0 && (
                                <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{lead.communications.length}</span>
                            )}
                            {t === "history" && lead?.history?.length > 0 && (
                                <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{lead.history.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
                    ) : !lead ? (
                        <div className="text-center py-16 text-gray-400 text-sm">Lead not found</div>
                    ) : tab === "info" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { icon: Phone,     label: "Contact Number", value: lead.contactNumber },
                                { icon: Building2, label: "Organisation",   value: lead.orgName },
                                { icon: User,      label: "Contact Person", value: lead.contactPerson },
                                { icon: null,      label: "Designation",    value: lead.designation },
                                { icon: Phone,     label: "Cell Number",    value: lead.cellNumber },
                                { icon: Mail,      label: "Email",          value: lead.email },
                                { icon: null,      label: "Address",        value: lead.address },
                                { icon: User,      label: "Assigned To",    value: fullName(lead.assignedTo) },
                                { icon: null,      label: "Created By",     value: fullName(lead.createdBy) },
                                { icon: null,      label: "Created At",     value: fmt(lead.createdAt) },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="bg-gray-50 rounded-lg px-4 py-3">
                                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                                    <div className="flex items-center gap-1.5">
                                        {Icon && <Icon size={13} className="text-gray-400 shrink-0" />}
                                        <p className="text-sm text-gray-800 font-medium">{value || "—"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : tab === "communications" ? (
                        <div className="space-y-4">
                            {/* Add communication */}
                            <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                                <p className="text-xs font-semibold text-gray-600">Add Communication</p>
                                <input value={commForm.subject} onChange={e => setCommForm(f => ({ ...f, subject: e.target.value }))}
                                    placeholder="Subject" className={inputCls} />
                                <textarea value={commForm.description} onChange={e => setCommForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Description / notes..." rows={3} className={inputCls} />
                                <div className="flex justify-end">
                                    <button onClick={handleAddComm} disabled={commLoading}
                                        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60">
                                        <Send size={13} /> {commLoading ? "Adding..." : "Add"}
                                    </button>
                                </div>
                            </div>
                            {/* List */}
                            {lead.communications.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">No communications yet</div>
                            ) : (
                                [...lead.communications].reverse().map(c => (
                                    <div key={c._id} className="border border-gray-200 rounded-xl p-4">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <p className="text-sm font-semibold text-gray-800">{c.subject}</p>
                                            <span className="text-[10px] text-gray-400 shrink-0">{fmtTime(c.addedAt)}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.description}</p>
                                        {c.addedBy && (
                                            <p className="text-[10px] text-gray-400 mt-2">By {fullName(c.addedBy)}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        // History tab
                        <div className="space-y-3">
                            {lead.history.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">No history yet</div>
                            ) : (
                                [...lead.history].reverse().map((h, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                <Clock size={13} />
                                            </div>
                                            {i < lead.history.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                                        </div>
                                        <div className="pb-4 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium text-gray-700">{fullName(h.changedBy)}</span>
                                                <span className="text-[10px] text-gray-400">{fmtTime(h.changedAt)}</span>
                                            </div>
                                            <div className="space-y-1">
                                                {Object.entries(h.changes || {}).map(([field, { from, to }]) => (
                                                    <div key={field} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                                                        <span className="font-medium capitalize">{field.replace(/([A-Z])/g, " $1")}</span>
                                                        {from != null && <span className="text-red-500 line-through ml-2">{String(from)}</span>}
                                                        <span className="text-green-600 ml-2">→ {String(to)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const Leads = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const canManage = isSuperAdmin || user?.role?.permissions?.some(p => ["CREATE_LEAD", "UPDATE_LEAD"].includes(p));
    const canDelete = isSuperAdmin || user?.role?.permissions?.some(p => p === "DELETE_LEAD");

    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(null);
    const [detailId, setDetailId] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const LIMIT = 20;

    const searchTimer = useRef(null);

    const load = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            const res = await getLeads({ search, status: statusFilter, page, limit: LIMIT, ...params });
            setLeads(res.leads || []);
            setTotal(res.total || 0);
        } catch { toast.error("Failed to load leads"); }
        finally { setLoading(false); }
    }, [search, statusFilter, page]);

    useEffect(() => { load(); }, [statusFilter, page]);

    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => { setPage(1); load({ search, page: 1 }); }, 400);
        return () => clearTimeout(searchTimer.current);
    }, [search]);

    useEffect(() => {
        if (canManage) fetchUsers().then(r => setUsers(r.users || [])).catch(() => {});
    }, []);

    const handleSubmit = async (form) => {
        try {
            setSaving(true);
            if (selected) {
                await updateLead(selected._id, form);
                toast.success("Lead updated");
            } else {
                await createLead(form);
                toast.success("Lead created");
            }
            setDrawerOpen(false);
            setSelected(null);
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save lead");
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this lead?")) return;
        try {
            await deleteLead(id);
            toast.success("Lead deleted");
            load();
        } catch { toast.error("Failed to delete lead"); }
    };

    const openEdit = (lead) => {
        setDetailId(null);
        setSelected(lead);
        setDrawerOpen(true);
    };

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{total} lead{total !== 1 ? "s" : ""} found</p>
                </div>
                {canManage && (
                    <button onClick={() => { setSelected(null); setDrawerOpen(true); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                        <Plus size={15} /> New Lead
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1 max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by contact number..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="relative">
                    <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">All Statuses</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                {["Contact No.", "Organisation", "Contact Person", "Status", "Assigned To", "Created", "Actions"].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-16 text-gray-400">Loading...</td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-16 text-gray-400">No leads found</td></tr>
                            ) : leads.map(lead => (
                                <tr key={lead._id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{lead.contactNumber}</td>
                                    <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{lead.orgName}</td>
                                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.contactPerson || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${STATUS_COLORS[lead.status]}`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                        {lead.assignedTo ? fullName(lead.assignedTo) : <span className="text-gray-400">Unassigned</span>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(lead.createdAt)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => setDetailId(lead._id)}
                                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg" title="View details">
                                                <Eye size={13} />
                                            </button>
                                            {canManage && (
                                                <button onClick={() => openEdit(lead)}
                                                    className="p-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg" title="Edit">
                                                    <Pencil size={13} />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button onClick={() => handleDelete(lead._id)}
                                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg" title="Delete">
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
                        <div className="flex gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Prev</button>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Next</button>
                        </div>
                    </div>
                )}
            </div>

            <LeadDrawer
                isOpen={drawerOpen}
                onClose={() => { setDrawerOpen(false); setSelected(null); }}
                initial={selected}
                onSubmit={handleSubmit}
                loading={saving}
                users={users}
            />

            {detailId && (
                <LeadDetailModal
                    leadId={detailId}
                    onClose={() => setDetailId(null)}
                    onEdit={(lead) => { setDetailId(null); openEdit(lead); }}
                />
            )}
        </div>
    );
};

export default Leads;
