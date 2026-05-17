import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, X, Pencil, Trash2, Eye, User, Send, MessageSquare, ChevronLeft, ChevronRight, Upload, Settings } from "lucide-react";
import { toast } from "react-toastify";
import { useStore } from "../../../context/StoreContext";
import { fetchUsers } from "../../employee/services/UserService.jsx";
import { getLeads, getLeadById, createLead, updateLead, deleteLead, addCommunication, getFieldConfig } from "../services/leadService";
import LeadCommunication from "../components/LeadCommunication.jsx";
import LeadHistory from "../components/LeadHistory.jsx";
import LeadImport from "../components/LeadImport.jsx";
import LeadFieldManager from "../components/LeadFieldManager.jsx";

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtUS = (raw = "") => {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};
const digits = (v = "") => v.replace(/\D/g, "");
const extractPhone = (raw) => digits(raw).slice(-10);

const PAGE_SIZE = 20;

const STATUSES = ["New Lead", "Contacted", "Meeting Scheduled", "Proposal Sent",
    "Sent to Project Team", "Project Done", "On Hold", "Cancelled"];

const STATUS_COLORS = {
    "New Lead":             "bg-blue-50 text-blue-700 border-blue-200",
    "Contacted":            "bg-yellow-50 text-yellow-700 border-yellow-200",
    "Meeting Scheduled":    "bg-purple-50 text-purple-700 border-purple-200",
    "Proposal Sent":        "bg-indigo-50 text-indigo-700 border-indigo-200",
    "Sent to Project Team": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Project Done":         "bg-green-50 text-green-700 border-green-200",
    "On Hold":              "bg-orange-50 text-orange-700 border-orange-200",
    "Cancelled":            "bg-red-50 text-red-700 border-red-200",
};

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

// ─── Inline communication form for new lead ───────────────────────────────────
const NewLeadCommForm = ({ comm, onChange }) => (
    <div>
        <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={14} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-800">Add Communication</span>
            <span className="text-[10px] text-gray-400">(optional)</span>
        </div>
        <div className="space-y-2">
            <input
                value={comm.subject}
                onChange={e => onChange({ ...comm, subject: e.target.value })}
                placeholder="Subject (optional)"
                className={inp}
            />
            <textarea
                value={comm.description}
                onChange={e => onChange({ ...comm, description: e.target.value })}
                placeholder="Description…"
                rows={4}
                className={inp}
            />
        </div>
    </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
const LeadModal = ({ isOpen, onClose, initial, onSubmit, saving, users, currentUserId, onLeadUpdate, customFields }) => {
    const emptyForm = useCallback(() => {
        const base = {
            contactNumber: "", orgName: "", address: "", contactPerson: "",
            email: "", status: "New Lead", assignedTo: currentUserId || "",
        };
        customFields.forEach(f => { base[f.key] = ""; });
        return base;
    }, [currentUserId, customFields]);

    const [form, setForm] = useState(emptyForm);
    const [viewMode, setViewMode] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [matchedLead, setMatchedLead] = useState(null);
    const [fullLead, setFullLead] = useState(null);
    const [newComm, setNewComm] = useState({ subject: "", description: "" });
    const debounceRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) { setMatchedLead(null); setFullLead(null); return; }
        if (initial) {
            setViewMode(true);
            setFullLead(null);
            getLeadById(initial._id)
                .then(r => {
                    const lead = r.lead || null;
                    setFullLead(lead);
                    if (lead) {
                        const formData = {
                            contactNumber: fmtUS(lead.contactNumber || ""),
                            orgName:       lead.orgName || "",
                            address:       lead.address || "",
                            contactPerson: lead.contactPerson || "",
                            email:         lead.email || "",
                            status:        lead.status || "New Lead",
                            assignedTo:    lead.assignedTo?._id || lead.assignedTo || "",
                        };
                        // Add custom fields
                        customFields.forEach(f => {
                            formData[f.key] = lead.customFields?.get?.(f.key) || lead.customFields?.[f.key] || "";
                        });
                        setForm(formData);
                    }
                })
                .catch(() => {});
        } else {
            setForm(emptyForm());
            setNewComm({ subject: "", description: "" });
            setViewMode(false);
            setMatchedLead(null);
            setFullLead(null);
        }
    }, [isOpen, initial, emptyForm, customFields]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleContactNumber = (raw) => {
        const d = extractPhone(raw);
        set("contactNumber", fmtUS(d));
        if (d.length === 10 && !initial) {
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => autoPopulate(d), 400);
        }
    };

    const autoPopulate = async (d) => {
        try {
            setLookupLoading(true);
            const res = await getLeads({ search: d, limit: 1 });
            const leads = res?.leads || [];
            const match = leads.find(l => digits(l.contactNumber || "") === d);
            if (match) {
                setMatchedLead(match);
                const formData = {
                    contactNumber: fmtUS(match.contactNumber || ""),
                    orgName:       match.orgName || "",
                    address:       match.address || "",
                    contactPerson: match.contactPerson || "",
                    email:         match.email || "",
                    status:        match.status || "New Lead",
                    assignedTo:    match.assignedTo?._id || match.assignedTo || "",
                };
                setForm(formData);
                getLeadById(match._id).then(r => setFullLead(r.lead || null)).catch(() => {});
                toast.info("Existing lead found — will update on save");
            } else {
                setMatchedLead(null);
                setFullLead(null);
            }
        } catch { /* silent */ } finally { setLookupLoading(false); }
    };

    const handleSubmit = () => {
        if (!digits(form.contactNumber)) return toast.error("Contact number is required");
        if (!form.orgName.trim()) return toast.error("Organisation name is required");
        
        const payload = {
            contactNumber: digits(form.contactNumber),
            orgName:       form.orgName.trim(),
            address:       form.address,
            contactPerson: form.contactPerson,
            email:         form.email,
            status:        form.status,
            assignedTo:    form.assignedTo || null,
            customFields:  {},
        };
        customFields.forEach(f => { payload.customFields[f.key] = form[f.key] || ""; });
        onSubmit(payload, matchedLead?._id || null, newComm);
    };

    const handleCommAdded = useCallback((comm) => {
        setFullLead(prev => prev
            ? { ...prev, communications: [...(prev.communications || []), comm] }
            : prev
        );
        onLeadUpdate?.();
    }, [onLeadUpdate]);

    if (!isOpen) return null;

    const isEdit = !!initial;
    const isExisting = isEdit || !!matchedLead;
    const activeLead = fullLead || initial || matchedLead;
    const communications = fullLead?.communications || [];
    const history = fullLead?.history || [];
    const activeLeadId = initial?._id || matchedLead?._id;

    // Render custom field based on type
    const renderCustomField = (field, isViewMode = false) => {
        const value = isViewMode 
            ? (activeLead?.customFields?.get?.(field.key) || activeLead?.customFields?.[field.key] || "")
            : (form[field.key] || "");
        
        if (isViewMode) {
            return (
                <div key={field.key}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{field.label}</p>
                    <p className="text-sm text-gray-800">{value || <span className="text-gray-300">—</span>}</p>
                </div>
            );
        }

        return (
            <div key={field.key} className={field.type === "date" ? "" : "sm:col-span-1"}>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === "text" && (
                    <input value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)}
                        placeholder={field.label} className={inp} />
                )}
                {field.type === "number" && (
                    <input type="number" value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)}
                        placeholder={field.label} className={inp} />
                )}
                {field.type === "date" && (
                    <input type="date" value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)} className={inp} />
                )}
                {field.type === "dropdown" && (
                    <select value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)} className={inp}>
                        <option value="">— Select —</option>
                        {(field.options || []).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-[calc(100vw-32px)] h-[calc(100vh-32px)] max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-base font-semibold text-gray-900">
                            {viewMode ? (activeLead?.orgName || "Lead Details") : isEdit ? "Edit Lead" : "New Lead"}
                        </h2>
                        {isExisting && activeLead?.status && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[activeLead.status] || ""}`}>
                                {activeLead.status}
                            </span>
                        )}
                        {matchedLead && !isEdit && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-amber-50 text-amber-700 border-amber-200">
                                Existing — will update
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isEdit && viewMode && (
                            <button onClick={() => setViewMode(false)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium">
                                <Pencil size={12} /> Edit
                            </button>
                        )}
                        {isEdit && !viewMode && (
                            <button onClick={() => setViewMode(true)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium">
                                <Eye size={12} /> View
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Close (Esc)">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

                    {/* LEFT */}
                    <div className="flex flex-col w-full lg:w-1/2 lg:border-r overflow-y-auto">
                        <div className="flex-1 px-6 py-5">
                            {viewMode ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                    {[
                                        { label: "Contact Number",    value: fmtUS(activeLead?.contactNumber || "") },
                                        { label: "Organisation Name", value: activeLead?.orgName },
                                        { label: "Address",           value: activeLead?.address },
                                        { label: "Contact Person",    value: activeLead?.contactPerson },
                                        { label: "Email",             value: activeLead?.email },
                                        { label: "Status",            value: activeLead?.status },
                                        {
                                            label: "Assigned To",
                                            value: activeLead?.assignedTo
                                                ? `${activeLead.assignedTo.firstName} ${activeLead.assignedTo.lastName}`
                                                : null,
                                        },
                                    ].map(({ label, value }) => (
                                        <div key={label}>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                                            <p className="text-sm text-gray-800">{value || <span className="text-gray-300">—</span>}</p>
                                        </div>
                                    ))}
                                    {/* Render custom fields in view mode */}
                                    {customFields.map(field => renderCustomField(field, true))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Contact Number <span className="text-red-500">*</span>
                                            {lookupLoading && <span className="text-blue-500 ml-1 font-normal">looking up…</span>}
                                        </label>
                                        <input value={form.contactNumber} onChange={e => handleContactNumber(e.target.value)}
                                            placeholder="10-digit number" className={inp} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Organisation Name <span className="text-red-500">*</span>
                                        </label>
                                        <input value={form.orgName} onChange={e => set("orgName", e.target.value)}
                                            placeholder="Company / org name" className={inp} />
                                    </div>
                                   
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Legal Name</label>
                                        <input value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)}
                                            placeholder="Name of contact" className={inp} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                                        <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                                            placeholder="email@example.com" className={inp} />
                                    </div>
                                     <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                                        <input value={form.address} onChange={e => set("address", e.target.value)}
                                            placeholder="Full address" className={inp} />
                                    </div>
                                    {/* Render custom fields in edit mode */}
                                    {customFields.map(field => renderCustomField(field, false))}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                        <select value={form.status} onChange={e => set("status", e.target.value)} className={inp}>
                                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
                                        <select value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} className={inp}>
                                            <option value="">— Unassigned —</option>
                                            {users.map(u => (
                                                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                </div>
                            )}
                        </div>

                        {!viewMode && (
                            <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0">
                                <button onClick={onClose}
                                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button onClick={handleSubmit} disabled={saving}
                                    className="flex items-center gap-1.5 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                                    {saving ? "Saving…" : isExisting ? "Update Lead" : "Create Lead"}
                                    {!isExisting && newComm.description && <Send size={13} />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT */}
                    <div className="flex flex-col w-full lg:w-1/2 overflow-y-auto border-t lg:border-t-0">
                        {isExisting ? (
                            <>
                                <div className="px-6 py-5 border-b">
                                    <LeadCommunication
                                        leadId={activeLeadId}
                                        communications={communications}
                                        onAdded={handleCommAdded}
                                    />
                                </div>
                                <div className="px-6 py-5">
                                    <LeadHistory history={history} users={users} />
                                </div>
                            </>
                        ) : (
                            <div className="px-6 py-5">
                                <NewLeadCommForm comm={newComm} onChange={setNewComm} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Pagination bar ───────────────────────────────────────────────────────────
const Pagination = ({ page, total, limit, onChange }) => {
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) return null;
    const from = (page - 1) * limit + 1;
    const to   = Math.min(page * limit, total);
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white rounded-b-xl">
            <span className="text-xs text-gray-500">{from}–{to} of {total.toLocaleString()} leads</span>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(page - 1)} disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-600">
                    <ChevronLeft size={15} />
                </button>
                <span className="text-xs text-gray-600 px-2">{page} / {totalPages}</span>
                <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-600">
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const Leads = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin;
    const canWrite = isAdmin || user?.role?.permissions?.some(p => ["CREATE_LEAD", "UPDATE_LEAD"].includes(p));
    const canDelete = isAdmin || user?.role?.permissions?.some(p => p === "DELETE_LEAD");

    const [leads, setLeads]       = useState([]);
    const [total, setTotal]       = useState(0);
    const [page, setPage]         = useState(1);
    const [search, setSearch]     = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [users, setUsers]       = useState([]);
    const [saving, setSaving]     = useState(false);
    const [loading, setLoading]   = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [customFields, setCustomFields] = useState([]);
    const [fieldManagerOpen, setFieldManagerOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterAssignedTo, setFilterAssignedTo] = useState("");
    const searchDebounce          = useRef(null);

    const load = useCallback(async (pg, q, status, assignedTo) => {
        try {
            setLoading(true);
            const params = { page: pg, limit: PAGE_SIZE };
            if (q) params.search = q;
            if (status) params.status = status;
            if (assignedTo) params.assignedTo = assignedTo;
            const res = await getLeads(params);
            setLeads(res?.leads || []);
            setTotal(res?.total || 0);
        } catch { toast.error("Failed to load leads"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(page, search, filterStatus, filterAssignedTo); }, [page, search, filterStatus, filterAssignedTo]); // eslint-disable-line

    useEffect(() => {
        fetchUsers().then(r => setUsers(r.users || [])).catch(() => {});
        getFieldConfig().then(r => setCustomFields(r.fields || [])).catch(() => {});
    }, []);

    const handleSearchInput = (val) => {
        setSearchInput(val);
        clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            setPage(1);
            setSearch(val);
        }, 400);
    };

    const handlePageChange = (pg) => { setPage(pg); };

    const handleFilterChange = (status, assignedTo) => {
        setFilterStatus(status);
        setFilterAssignedTo(assignedTo);
        setPage(1);
    };

    const openNew  = () => { setSelected(null); setModalOpen(true); };
    const openView = (lead) => { setSelected(lead); setModalOpen(true); };
    const close    = () => { setModalOpen(false); setSelected(null); };

    const handleSubmit = async (form, matchedId, newComm) => {
        try {
            setSaving(true);
            const existingId = selected?._id || matchedId;
            if (existingId) {
                await updateLead(existingId, form);
                toast.success("Lead updated");
            } else {
                const res = await createLead(form);
                const createdId = res.lead?._id;
                if (createdId && newComm?.description?.trim()) {
                    await addCommunication(createdId, {
                        subject:     newComm.subject?.trim() || "Note",
                        description: newComm.description.trim(),
                    });
                }
                toast.success("Lead created");
            }
            close();
            load(page, search, filterStatus, filterAssignedTo);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save lead");
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this lead?")) return;
        try {
            await deleteLead(id);
            toast.success("Lead deleted");
            const newPage = leads.length === 1 && page > 1 ? page - 1 : page;
            setPage(newPage);
            load(newPage, search, filterStatus, filterAssignedTo);
        } catch { toast.error("Failed to delete lead"); }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {total > 0 ? `${total.toLocaleString()} total leads` : "Track and manage sales leads"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            value={searchInput}
                            onChange={e => handleSearchInput(e.target.value)}
                            placeholder="Search leads…"
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                        />
                        {isAdmin && (
                            <button onClick={() => setFieldManagerOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium transition">
                                <Settings size={15} /> Manage Fields
                            </button>
                        )}
                        {canWrite && (
                            <button onClick={() => setImportOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium transition">
                                <Upload size={15} /> Import CSV
                            </button>
                        )}
                        {canWrite && (
                            <button onClick={openNew}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                                <Plus size={15} /> New Lead
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Filters:</span>
                    <select
                        value={filterStatus}
                        onChange={e => handleFilterChange(e.target.value, filterAssignedTo)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="">All Statuses</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        value={filterAssignedTo}
                        onChange={e => handleFilterChange(filterStatus, e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="">All Assigned To</option>
                        {users.map(u => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
                    </select>
                    {(filterStatus || filterAssignedTo) && (
                        <button
                            onClick={() => handleFilterChange("", "")}
                            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium transition"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <User size={48} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">{search ? "No leads match your search" : "No leads yet"}</p>
                    {!search && <p className="text-gray-400 text-sm mt-1">Add your first lead to get started</p>}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {["Contact Number", "Organisation", "Contact Person", "Status", "Assigned To", ""].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leads.map(lead => (
                                <tr key={lead._id} className="hover:bg-gray-50 transition group">
                                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{fmtUS(lead.contactNumber || "")}</td>
                                    <td className="px-4 py-3 text-gray-700">{lead.orgName}</td>
                                    <td className="px-4 py-3 text-gray-600">{lead.contactPerson || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${STATUS_COLORS[lead.status] || ""}`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {lead.assignedTo && typeof lead.assignedTo === "object"
                                            ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                                            : lead.assignedTo
                                                ? (users.find(u => u._id === lead.assignedTo?.toString())
                                                    ? `${users.find(u => u._id === lead.assignedTo?.toString()).firstName} ${users.find(u => u._id === lead.assignedTo?.toString()).lastName}`
                                                    : <span className="text-gray-300">—</span>)
                                                : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                                            <button onClick={() => openView(lead)}
                                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg">
                                                <Eye size={13} />
                                            </button>
                                            {canWrite && (
                                                <button onClick={() => { setSelected(lead); setModalOpen(true); }}
                                                    className="p-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg">
                                                    <Pencil size={13} />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button onClick={() => handleDelete(lead._id)}
                                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg">
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination page={page} total={total} limit={PAGE_SIZE} onChange={handlePageChange} />
                </div>
            )}

            <LeadModal
                isOpen={modalOpen}
                onClose={close}
                initial={selected}
                onSubmit={handleSubmit}
                saving={saving}
                users={users}
                currentUserId={user?._id}
                onLeadUpdate={() => load(page, search, filterStatus, filterAssignedTo)}
                customFields={customFields}
            />

            <LeadFieldManager
                isOpen={fieldManagerOpen}
                onClose={() => setFieldManagerOpen(false)}
                onSave={() => {
                    getFieldConfig().then(r => setCustomFields(r.fields || [])).catch(() => {});
                    load(page, search, filterStatus, filterAssignedTo);
                }}
            />

            <LeadImport
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                onDone={() => { setPage(1); load(1, search, filterStatus, filterAssignedTo); }}
                customFields={customFields}
            />
        </div>
    );
};

export default Leads;
