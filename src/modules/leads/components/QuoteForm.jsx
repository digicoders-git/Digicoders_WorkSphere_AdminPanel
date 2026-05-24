import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, Eye, Pencil, X, ChevronDown, ChevronUp, FileText, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import { createQuote, updateQuote, deleteQuote, getQuotesByLead } from "../services/quoteService";
import { listQuoteProfiles } from "../services/quoteProfileService";
import {
    PROPOSED_SYSTEM_OPTIONS,
    OTHER_REQ_PRICE_TYPES,
    emptyQuoteForm,
    calcQuoteTotals,
    formToPayload,
    quoteToForm,
} from "./quoteFormUtils";
import { CRM_WEB_QUOTE_TEMPLATE } from "./quoteCrmTemplate";
import { getFieldConfig } from "../services/leadService";
import QuotePlaceholderPicker from "./QuotePlaceholderPicker";
import {
    buildAllQuotePlaceholders,
    insertPlaceholderAtCursor,
    buildClientPlaceholderContext,
    resolveQuoteText,
} from "./quoteEmailUtils";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const btnPrimary = "px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60";
const btnSecondary = "px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors";
const btnDanger = "p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors";
const btnGhost = "px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1";

const Section = ({ title, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</span>
                {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
            </button>
            {open && <div className="p-4 space-y-3 bg-white">{children}</div>}
        </div>
    );
};

const DeleteConfirm = ({ onConfirm, onCancel }) => (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle size={14} className="text-red-500 shrink-0" />
        <span className="text-xs text-red-700 flex-1">Delete this quote?</span>
        <button type="button" onClick={onConfirm} className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
    </div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        draft: "bg-gray-100 text-gray-600",
        sent: "bg-blue-100 text-blue-700",
        accepted: "bg-emerald-100 text-emerald-700",
        rejected: "bg-red-100 text-red-600",
    };
    return (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${styles[status] || styles.draft}`}>
            {status}
        </span>
    );
};

export default function QuoteForm({ leadId, lead, companyId, onOpenPreview, editQuote, onEditConsumed }) {
    const [form, setForm] = useState(() => emptyQuoteForm());
    const [editingQuoteId, setEditingQuoteId] = useState(null);
    const [quotes, setQuotes] = useState([]);
    const [quoteProfiles, setQuoteProfiles] = useState([]);
    const [activeTab, setActiveTab] = useState("form");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [leadFieldConfig, setLeadFieldConfig] = useState([]);
    const activeFieldRef = useRef(null);

    const placeholders = useMemo(
        () => buildAllQuotePlaceholders(leadFieldConfig),
        [leadFieldConfig]
    );

    useEffect(() => {
        getFieldConfig()
            .then((r) => setLeadFieldConfig(r.fields || []))
            .catch(() => {});
    }, []);

    useEffect(() => { if (leadId && companyId) loadQuotes(); }, [leadId, companyId]);

    useEffect(() => {
        if (!editQuote?._id) return;
        setForm(quoteToForm(editQuote));
        setEditingQuoteId(editQuote._id);
        setActiveTab("form");
        onEditConsumed?.();
    }, [editQuote?._id]);

    useEffect(() => {
        if (!companyId) return;
        listQuoteProfiles()
            .then((list) => {
                setQuoteProfiles(list);
                const defaultP = list.find((p) => p.isDefault);
                if (defaultP) setForm((prev) => (prev.quoteProfileId ? prev : { ...prev, quoteProfileId: defaultP._id }));
            })
            .catch(() => {});
    }, [companyId]);

    const loadQuotes = async () => {
        try {
            setLoading(true);
            const data = await getQuotesByLead(leadId, companyId);
            setQuotes(Array.isArray(data) ? data : []);
        } catch { toast.error("Failed to load quotes"); }
        finally { setLoading(false); }
    };

    const { totalPages, totalReqs, grandTotal } = calcQuoteTotals(form);

    const placeholderPreviewCtx = useMemo(
        () => buildClientPlaceholderContext(
            { ...form, grandTotal, totalPagesCost: totalPages, totalRequirementsCost: totalReqs },
            lead,
            leadFieldConfig
        ),
        [form, lead, leadFieldConfig, grandTotal, totalPages, totalReqs]
    );

    const registerPlaceholderField = (getValue, setValue) => (e) => {
        activeFieldRef.current = { el: e.target, getValue, setValue };
    };

    const handleInsertPlaceholder = (key) => {
        const active = activeFieldRef.current;
        if (!active?.el) {
            toast.info(`Click a text field first, then insert {{${key}}}`);
            return;
        }
        const value = active.getValue() ?? "";
        const { value: next, cursor } = insertPlaceholderAtCursor(
            value,
            active.el.selectionStart,
            active.el.selectionEnd,
            key
        );
        active.setValue(next);
        requestAnimationFrame(() => {
            active.el.focus();
            active.el.setSelectionRange(cursor, cursor);
        });
    };

    const resetForm = () => {
        const defaultP = quoteProfiles.find((p) => p.isDefault);
        setForm(defaultP ? { ...emptyQuoteForm(), quoteProfileId: defaultP._id } : emptyQuoteForm());
    };

    const handleSubmit = async () => {
        if (!form.systemName?.trim()) return toast.error("System name is required");
        if (!form.quoteProfileId && quoteProfiles.length > 0)
            return toast.error("Select a branding profile (payment & company details come from the profile)");
        if (form.proposedSystemCategory === "Other" && !form.proposedSystemOther?.trim())
            return toast.error("Please specify the proposed system type");
        try {
            setSaving(true);
            if (editingQuoteId) {
                const res = await updateQuote(editingQuoteId, formToPayload(form, leadId, companyId));
                const q = res.quote ?? res;
                toast.success("Quote updated");
                resetForm(); setEditingQuoteId(null);
                await loadQuotes();
                if (onOpenPreview && q) onOpenPreview(q);
            } else {
                const result = await createQuote(formToPayload(form, leadId, companyId));
                toast.success("Quote created");
                resetForm();
                await loadQuotes();
                if (onOpenPreview && result.quote) onOpenPreview(result.quote);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save quote");
        } finally { setSaving(false); }
    };

    const handleDelete = async (quoteId) => {
        try {
            await deleteQuote(quoteId);
            toast.success("Quote deleted");
            setDeleteConfirmId(null);
            if (editingQuoteId === quoteId) { setEditingQuoteId(null); resetForm(); }
            await loadQuotes();
        } catch { toast.error("Failed to delete quote"); }
    };

    const updatePage = (idx, field, value) =>
        setForm((prev) => ({ ...prev, pages: prev.pages.map((p, i) => (i === idx ? { ...p, [field]: value } : p)) }));

    const updatePageDesc = (pageIdx, descIdx, value) =>
        setForm((prev) => ({
            ...prev,
            pages: prev.pages.map((p, i) =>
                i === pageIdx ? { ...p, descriptions: p.descriptions.map((d, di) => (di === descIdx ? value : d)) } : p
            ),
        }));

    const cancelEdit = () => {
        setEditingQuoteId(null);
        resetForm();
    };

    const updateReq = (idx, field, value) =>
        setForm((p) => ({
            ...p,
            otherRequirements: p.otherRequirements.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
        }));

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {[
                    { key: "form", label: editingQuoteId ? "✏️ Editing Draft" : "➕ New Quote" },
                    { key: "list", label: `📋 Saved (${quotes.length})` },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === key ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {activeTab === "form" ? (
                <div className="space-y-4">
                    {/* Edit banner */}
                    {editingQuoteId && (
                        <div className="flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Pencil size={14} className="text-amber-600" />
                                <p className="text-xs font-semibold text-amber-900">Editing draft quote</p>
                            </div>
                            <button type="button" onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50">
                                <X size={12} /> Discard
                            </button>
                        </div>
                    )}

                    {/* CRM template loader */}
                    {!editingQuoteId && (
                        <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                            <p className="text-xs text-blue-700">
                                <span className="font-semibold">Quick start:</span> Load a sample CRM template
                            </p>
                            <button
                                type="button"
                                onClick={() => { setForm({ ...CRM_WEB_QUOTE_TEMPLATE }); toast.info("CRM template loaded"); }}
                                className="shrink-0 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Load Template
                            </button>
                        </div>
                    )}

                    {/* Lead info */}
                    {lead && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-blue-600">{(lead.orgName || "?")[0].toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{lead.orgName}</p>
                                <p className="text-xs text-gray-500 truncate">{[lead.contactPerson, lead.email].filter(Boolean).join(" · ")}</p>
                            </div>
                        </div>
                    )}

                    {/* Section 1: Basic Info */}
                    <Section title="1. Quote Details">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Quote Title</label>
                            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={inp} placeholder="e.g. Project Quote" />
                        </div>
                        {quoteProfiles.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Branding Profile
                                    <span className="ml-1 font-normal text-gray-400">(logo, company name, payment details on PDF)</span>
                                </label>
                                <select className={inp} value={form.quoteProfileId} onChange={(e) => setForm((p) => ({ ...p, quoteProfileId: e.target.value }))}>
                                    <option value="">— Company default —</option>
                                    {quoteProfiles.map((p) => (
                                        <option key={p._id} value={p._id}>{p.name}{p.isDefault ? " (default)" : ""}</option>
                                    ))}
                                </select>
                                {/* Show selected profile's payment summary */}
                                {(() => {
                                    const sel = quoteProfiles.find(p => p._id === form.quoteProfileId);
                                    if (!sel) return null;
                                    const hasPmt = sel.paymentBankDetails || sel.paymentTerms || sel.paymentQr?.url;
                                    return (
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                {sel.logo?.url && <img src={sel.logo.url} alt="" className="h-6 object-contain" />}
                                                <p className="text-xs font-semibold text-gray-700">{sel.companyName}</p>
                                                {sel.paymentQr?.url && (
                                                    <span className="ml-auto text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                                                        ✓ QR set
                                                    </span>
                                                )}
                                            </div>
                                            {sel.paymentBankDetails && (
                                                <p className="text-[10px] text-gray-500 font-mono truncate">{sel.paymentBankDetails.split("\n")[0]}</p>
                                            )}
                                            {!hasPmt && (
                                                <p className="text-[10px] text-amber-600">⚠ No payment details set on this profile — add them in Payment Accounts.</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </Section>

                    {/* Section 2: System */}
                    <Section title="2. Proposed System">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">System Type</label>
                            <div className="flex flex-wrap gap-2">
                                {PROPOSED_SYSTEM_OPTIONS.map((opt) => (
                                    <label key={opt} className={`px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                                        form.proposedSystemCategory === opt
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                                    }`}>
                                        <input type="radio" className="sr-only" checked={form.proposedSystemCategory === opt}
                                            onChange={() => setForm((p) => ({ ...p, proposedSystemCategory: opt }))} />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {form.proposedSystemCategory === "Other" && (
                            <input value={form.proposedSystemOther} onChange={(e) => setForm((p) => ({ ...p, proposedSystemOther: e.target.value }))}
                                className={inp} placeholder="Specify system type…" />
                        )}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">System Name <span className="text-red-500">*</span></label>
                            <input value={form.systemName} onChange={(e) => setForm((p) => ({ ...p, systemName: e.target.value }))}
                                className={inp} placeholder="e.g. CRM Web Based" />
                        </div>
                    </Section>

                    {/* Section 3: Pages */}
                    <Section title="3. Pages & Features">
                        <QuotePlaceholderPicker
                            placeholders={placeholders}
                            onInsert={handleInsertPlaceholder}
                            compact
                        />
                        <div className="space-y-3">
                            {form.pages.map((page, idx) => (
                                <div key={idx} className="p-3 border border-gray-200 rounded-xl space-y-3 bg-gray-50/50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500 uppercase">Page {String.fromCharCode(65 + idx)}</span>
                                        {form.pages.length > 1 && (
                                            <button type="button" onClick={() => setForm((p) => ({ ...p, pages: p.pages.filter((_, i) => i !== idx) }))} className={btnDanger}>
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <input value={page.name} onChange={(e) => updatePage(idx, "name", e.target.value)}
                                            onFocus={registerPlaceholderField(() => page.name, (v) => updatePage(idx, "name", v))}
                                            className={inp} placeholder="Page name (e.g. Dashboard for {{orgName}})" />
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
                                            <input type="number" min="0" value={page.cost || ""} onChange={(e) => updatePage(idx, "cost", parseFloat(e.target.value) || 0)}
                                                className={`${inp} pl-7`} placeholder="Cost" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 pl-3 border-l-2 border-blue-100">
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Features / Descriptions</p>
                                        {page.descriptions.map((desc, descIdx) => (
                                            <div key={descIdx} className="flex gap-2 items-center">
                                                <span className="text-[10px] text-gray-400 w-5 shrink-0 text-right">{descIdx + 1}.</span>
                                                <input value={desc} onChange={(e) => updatePageDesc(idx, descIdx, e.target.value)}
                                                    onFocus={registerPlaceholderField(() => desc, (v) => updatePageDesc(idx, descIdx, v))}
                                                    className={`${inp} flex-1`} placeholder="Feature (e.g. Login for {{contactPerson}})" />
                                                {page.descriptions.length > 1 && (
                                                    <button type="button" onClick={() =>
                                                        setForm((p) => ({ ...p, pages: p.pages.map((pg, pi) => pi === idx ? { ...pg, descriptions: pg.descriptions.filter((_, di) => di !== descIdx) } : pg) }))
                                                    } className={btnDanger}><Trash2 size={12} /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() =>
                                            setForm((p) => ({ ...p, pages: p.pages.map((pg, pi) => pi === idx ? { ...pg, descriptions: [...pg.descriptions, ""] } : pg) }))
                                        } className={btnGhost}>+ Add feature</button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => setForm((p) => ({ ...p, pages: [...p.pages, { name: "", cost: 0, descriptions: [""] }] }))} className={btnGhost}>
                                <Plus size={13} className="inline mr-1" /> Add page
                            </button>
                        </div>
                    </Section>

                    {/* Section 4: Tech Stack */}
                    <Section title="4. Tech Stack" defaultOpen={false}>
                        <div className="flex flex-wrap gap-2">
                            {form.techStack.map((tech, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                                    <input value={tech.label} onChange={(e) => setForm((p) => ({ ...p, techStack: p.techStack.map((t, i) => i === idx ? { ...t, label: e.target.value } : t) }))}
                                        className="bg-transparent text-xs text-blue-800 outline-none w-28 placeholder:text-blue-300" placeholder="e.g. React" />
                                    {form.techStack.length > 1 && (
                                        <button type="button" onClick={() => setForm((p) => ({ ...p, techStack: p.techStack.filter((_, i) => i !== idx) }))}
                                            className="text-blue-400 hover:text-red-500 transition-colors"><X size={12} /></button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={() => setForm((p) => ({ ...p, techStack: [...p.techStack, { label: "" }] }))} className={btnGhost}>
                                <Plus size={12} className="inline mr-1" /> Add tech
                            </button>
                        </div>
                    </Section>

                    {/* Section 4.5: Lead Fields to Display */}
                    {leadFieldConfig.length > 0 && (
                        <Section title="4.5 Add Fields from Lead" defaultOpen={false}>
                            <p className="text-[11px] text-gray-400 mb-3">
                                Select which lead details to show in the quote document:
                            </p>
                            <div className="space-y-2">
                                {/* Standard lead fields */}
                                {[
                                    { key: "contactNumber", label: "Contact Number", icon: "📞" },
                                    { key: "address", label: "Address", icon: "📍" },
                                    { key: "status", label: "Lead Status", icon: "🎯" },
                                ].map((field) => (
                                    <label key={field.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={form.leadFieldsToDisplay?.includes(field.key) || false}
                                            onChange={(e) => {
                                                const updated = e.target.checked
                                                    ? [...(form.leadFieldsToDisplay || []), field.key]
                                                    : (form.leadFieldsToDisplay || []).filter(k => k !== field.key);
                                                setForm(p => ({ ...p, leadFieldsToDisplay: updated }));
                                            }}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{field.icon} {field.label}</span>
                                    </label>
                                ))}
                                
                                {/* Custom lead fields */}
                                {leadFieldConfig.length > 0 && (
                                    <>
                                        <div className="border-t border-gray-200 pt-2 mt-2">
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Custom Fields</p>
                                        </div>
                                        {leadFieldConfig.map((field) => (
                                            <label key={field.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={form.leadFieldsToDisplay?.includes(field.key) || false}
                                                    onChange={(e) => {
                                                        const updated = e.target.checked
                                                            ? [...(form.leadFieldsToDisplay || []), field.key]
                                                            : (form.leadFieldsToDisplay || []).filter(k => k !== field.key);
                                                        setForm(p => ({ ...p, leadFieldsToDisplay: updated }));
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{field.label}</span>
                                                <span className="text-[10px] text-gray-400 ml-auto">{field.type}</span>
                                            </label>
                                        ))}
                                    </>
                                )}
                            </div>
                        </Section>
                    )}

                    {/* Section 5: Other Requirements */}
                    <Section title="5. Other Requirements" defaultOpen={false}>
                        <div className="space-y-3">
                            {form.otherRequirements.map((req, idx) => (
                                <div key={idx} className="p-3 border border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500">Requirement {idx + 1}</span>
                                        {form.otherRequirements.length > 1 && (
                                            <button type="button" onClick={() => setForm((p) => ({ ...p, otherRequirements: p.otherRequirements.filter((_, i) => i !== idx) }))} className={btnDanger}>
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <input className={inp} value={req.requirement} onChange={(e) => updateReq(idx, "requirement", e.target.value)} placeholder="e.g. Domain & Hosting" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input className={inp} value={req.term} onChange={(e) => updateReq(idx, "term", e.target.value)} placeholder="Term (e.g. 1 Year)" />
                                        <select className={inp} value={req.priceType || "amount"} onChange={(e) => updateReq(idx, "priceType", e.target.value)}>
                                            {OTHER_REQ_PRICE_TYPES.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    {(req.priceType || "amount") === "amount" && (
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
                                            <input type="number" min="0" className={`${inp} pl-7`} value={req.price === 0 ? "" : req.price}
                                                onChange={(e) => updateReq(idx, "price", parseFloat(e.target.value) || 0)} placeholder="Amount" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={() => setForm((p) => ({ ...p, otherRequirements: [...p.otherRequirements, { requirement: "", term: "", price: 0, priceType: "amount" }] }))} className={btnGhost}>
                                <Plus size={13} className="inline mr-1" /> Add requirement
                            </button>
                        </div>
                    </Section>

                    {/* Section 6: Notes */}
                    <Section title="6. Notes & Terms" defaultOpen={false}>
                        <p className="text-[11px] text-gray-400 -mt-1">
                            Use {`{{orgName}}`}, {`{{contactPerson}}`}, or any custom lead field key. Bank details come from the branding profile automatically.
                        </p>
                        <QuotePlaceholderPicker
                            placeholders={placeholders}
                            onInsert={handleInsertPlaceholder}
                            compact
                        />
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                            onFocus={registerPlaceholderField(() => form.notes, (v) => setForm((p) => ({ ...p, notes: v })))}
                            placeholder="Dear {{contactPerson}}, payment terms for {{orgName}}…"
                            rows={4}
                            className={`${inp} resize-none`}
                        />
                        {form.notes?.includes("{{") && (
                            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5 whitespace-pre-wrap">
                                Preview: {resolveQuoteText(form.notes, placeholderPreviewCtx)}
                            </p>
                        )}
                    </Section>

                    {/* Cost Summary */}
                    <div className="p-4 bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2">
                        <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Cost Summary</p>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Pages subtotal</span>
                                <span className="font-medium">₹{totalPages.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Requirements subtotal</span>
                                <span className="font-medium">₹{totalReqs.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="border-t border-blue-200 pt-2 flex justify-between">
                                <span className="font-bold text-blue-900">Grand Total</span>
                                <span className="font-bold text-blue-700 text-lg">₹{grandTotal.toLocaleString("en-IN")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-1">
                        {editingQuoteId && (
                            <button type="button" onClick={cancelEdit} className={btnSecondary}>Discard</button>
                        )}
                        <button type="button" onClick={handleSubmit} disabled={saving} className={btnPrimary}>
                            {saving ? "Saving…" : editingQuoteId ? "Update & Preview" : "Save & Preview"}
                        </button>
                    </div>
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : quotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText size={40} className="text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-gray-500">No quotes yet</p>
                    <p className="text-xs text-gray-400 mt-1">Create one from the New Quote tab</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {quotes.map((quote) => (
                        <div key={quote._id}>
                            {deleteConfirmId === quote._id ? (
                                <DeleteConfirm onConfirm={() => handleDelete(quote._id)} onCancel={() => setDeleteConfirmId(null)} />
                            ) : (
                                <div className="p-3 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-gray-900 text-sm truncate">{quote.title}</p>
                                            <StatusBadge status={quote.status} />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                                            {quote.systemName} · <span className="font-medium text-gray-700">₹{(quote.grandTotal || 0).toLocaleString("en-IN")}</span>
                                            {(quote.sendCount || 0) > 0 && ` · Sent ${quote.sendCount}×`}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button type="button" onClick={() => onOpenPreview?.(quote)}
                                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors" title="Edit quote">
                                            <Pencil size={14} />
                                        </button>
                                        <button type="button" onClick={() => setDeleteConfirmId(quote._id)}
                                            className={btnDanger} title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
