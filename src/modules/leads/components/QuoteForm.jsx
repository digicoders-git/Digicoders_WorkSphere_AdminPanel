import { useState, useEffect } from "react";
import { Plus, Trash2, Eye, Pencil, X } from "lucide-react";
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

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const btn = "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors";
const btnPrimary = `${btn} bg-blue-600 hover:bg-blue-700 text-white`;
const btnSecondary = `${btn} bg-gray-100 hover:bg-gray-200 text-gray-700`;
const btnDanger = `${btn} bg-red-50 hover:bg-red-100 text-red-600`;

export default function QuoteForm({ leadId, lead, companyId, onOpenPreview, editQuote, onEditConsumed }) {
    const [form, setForm] = useState(emptyQuoteForm);
    const [editingQuoteId, setEditingQuoteId] = useState(null);
    const [quotes, setQuotes] = useState([]);
    const [quoteProfiles, setQuoteProfiles] = useState([]);
    const [activeTab, setActiveTab] = useState("form");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (leadId && companyId) loadQuotes();
    }, [leadId, companyId]);

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
                if (defaultP) {
                    setForm((prev) => (prev.quoteProfileId ? prev : { ...prev, quoteProfileId: defaultP._id }));
                }
            })
            .catch(() => {});
    }, [companyId]);

    const loadQuotes = async () => {
        try {
            setLoading(true);
            const data = await getQuotesByLead(leadId, companyId);
            setQuotes(Array.isArray(data) ? data : []);
        } catch {
            toast.error("Failed to load quotes");
        } finally {
            setLoading(false);
        }
    };

    const { totalPages, totalReqs, grandTotal } = calcQuoteTotals(form);
    const proposedLabel =
        form.proposedSystemCategory === "Other"
            ? form.proposedSystemOther || "Other"
            : form.proposedSystemCategory;

    const handleSubmit = async () => {
        if (!form.systemName?.trim()) {
            toast.error("System name is required (e.g. CRM Web Based)");
            return;
        }
        if (form.proposedSystemCategory === "Other" && !form.proposedSystemOther?.trim()) {
            toast.error("Please specify the proposed system type");
            return;
        }

        try {
            setSaving(true);
            if (editingQuoteId) {
                const res = await updateQuote(editingQuoteId, formToPayload(form, leadId, companyId));
                const q = res.quote ?? res;
                toast.success("Draft quote updated");
                setForm(emptyQuoteForm());
                setEditingQuoteId(null);
                await loadQuotes();
                if (onOpenPreview && q) onOpenPreview(q);
            } else {
                const result = await createQuote(formToPayload(form, leadId, companyId));
                toast.success("Quote created — opening preview");
                setForm(emptyQuoteForm());
                await loadQuotes();
                if (onOpenPreview && result.quote) onOpenPreview(result.quote);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create quote");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (quoteId) => {
        if (!window.confirm("Delete this quote?")) return;
        try {
            await deleteQuote(quoteId);
            toast.success("Quote deleted");
            await loadQuotes();
        } catch {
            toast.error("Failed to delete quote");
        }
    };

    const updatePage = (idx, field, value) => {
        setForm((prev) => ({
            ...prev,
            pages: prev.pages.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
        }));
    };

    const startEditDraft = (quote) => {
        if (quote.status !== "draft") {
            toast.info("Only draft quotes can be fully edited");
            return;
        }
        setForm(quoteToForm(quote));
        setEditingQuoteId(quote._id);
        setActiveTab("form");
    };

    const cancelEdit = () => {
        setForm(emptyQuoteForm());
        setEditingQuoteId(null);
        listQuoteProfiles()
            .then((list) => {
                const defaultP = list.find((p) => p.isDefault);
                if (defaultP) setForm((prev) => ({ ...emptyQuoteForm(), quoteProfileId: defaultP._id }));
            })
            .catch(() => setForm(emptyQuoteForm()));
    };

    const updatePageDesc = (pageIdx, descIdx, value) => {
        setForm((prev) => ({
            ...prev,
            pages: prev.pages.map((p, i) =>
                i === pageIdx
                    ? {
                          ...p,
                          descriptions: p.descriptions.map((d, di) => (di === descIdx ? value : d)),
                      }
                    : p
            ),
        }));
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2 border-b">
                <button
                    type="button"
                    onClick={() => setActiveTab("form")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "form" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600"
                    }`}
                >
                    {editingQuoteId ? "Edit draft" : "Create Quote"}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("list")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "list" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600"
                    }`}
                >
                    Saved Quotes ({quotes.length})
                </button>
            </div>

            {activeTab === "form" ? (
                <div className="space-y-5 text-sm">
                    {editingQuoteId && (
                        <div className="flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs font-semibold text-amber-900">
                                Editing draft — all fields (pages, requirements, costs) can be changed
                            </p>
                            <button type="button" onClick={cancelEdit} className={`${btnSecondary} flex items-center gap-1`}>
                                <X size={14} /> Cancel edit
                            </button>
                        </div>
                    )}
                    {!editingQuoteId && (
                    <div className="flex flex-wrap gap-2 items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-600">
                            Matches <span className="font-medium">public/Sample Quote.pdf</span> (CRM Web Based)
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setForm({ ...CRM_WEB_QUOTE_TEMPLATE });
                                toast.info("CRM template loaded — edit costs & features as needed");
                            }}
                            className={`${btnSecondary} border border-blue-200 text-blue-700`}
                        >
                            Load CRM sample template
                        </button>
                    </div>
                    )}
                    {lead && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-800">
                            <span className="font-semibold">{lead.orgName}</span>
                            {lead.contactPerson && <> · {lead.contactPerson}</>}
                            {lead.email && <> · {lead.email}</>}
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Quote title</label>
                        <input
                            value={form.title}
                            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                            className={inp}
                            placeholder="Project Quote"
                        />
                    </div>

                    {quoteProfiles.length > 0 && (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">
                                Quote branding profile
                            </label>
                            <select
                                className={inp}
                                value={form.quoteProfileId}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, quoteProfileId: e.target.value }))
                                }
                            >
                                <option value="">— Company default —</option>
                                {quoteProfiles.map((p) => (
                                    <option key={p._id} value={p._id}>
                                        {p.name}
                                        {p.isDefault ? " (default)" : ""}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-500">
                                Controls logo, address, payment block, and footer on PDF/email. Manage under Quote Profiles (admin).
                            </p>
                        </div>
                    )}

                    <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                            Proposed System for &rarr;
                        </p>
                        <div className="flex flex-wrap gap-2 items-center">
                            {PROPOSED_SYSTEM_OPTIONS.map((opt) => (
                                <label
                                    key={opt}
                                    className={`px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition ${
                                        form.proposedSystemCategory === opt
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        className="sr-only"
                                        checked={form.proposedSystemCategory === opt}
                                        onChange={() =>
                                            setForm((p) => ({ ...p, proposedSystemCategory: opt }))
                                        }
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                        {form.proposedSystemCategory === "Other" && (
                            <input
                                value={form.proposedSystemOther}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, proposedSystemOther: e.target.value }))
                                }
                                className={inp}
                                placeholder="Specify system type…"
                            />
                        )}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                1. System Name
                            </label>
                            <input
                                value={form.systemName}
                                onChange={(e) => setForm((p) => ({ ...p, systemName: e.target.value }))}
                                className={inp}
                                placeholder="e.g. CRM Web Based"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-700 uppercase">
                                Pages &amp; features ({form.systemName || "System"})
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    setForm((p) => ({
                                        ...p,
                                        pages: [...p.pages, { name: "", cost: 0, descriptions: [""] }],
                                    }))
                                }
                                className={btnPrimary}
                            >
                                <Plus size={14} className="inline mr-1" /> Add page
                            </button>
                        </div>
                        {form.pages.map((page, idx) => (
                            <div key={idx} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-white">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-gray-500">
                                        {String.fromCharCode(97 + idx)}. Page
                                    </span>
                                    {form.pages.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setForm((p) => ({
                                                    ...p,
                                                    pages: p.pages.filter((_, i) => i !== idx),
                                                }))
                                            }
                                            className={btnDanger}
                                        >
                                            <Trash2 size={12} className="inline" /> Remove
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        value={page.name}
                                        onChange={(e) => updatePage(idx, "name", e.target.value)}
                                        className={inp}
                                        placeholder="Page name"
                                    />
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 shrink-0">Cost: ₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={page.cost}
                                            onChange={(e) =>
                                                updatePage(idx, "cost", parseFloat(e.target.value) || 0)
                                            }
                                            className={inp}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 pl-2 border-l-2 border-blue-100">
                                    {page.descriptions.map((desc, descIdx) => (
                                        <div key={descIdx} className="flex gap-2 items-center">
                                            <span className="text-[10px] text-gray-400 w-6 shrink-0">
                                                {descIdx + 1}.
                                            </span>
                                            <input
                                                value={desc}
                                                onChange={(e) => updatePageDesc(idx, descIdx, e.target.value)}
                                                className={`${inp} flex-1`}
                                                placeholder="Description"
                                            />
                                            {page.descriptions.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setForm((p) => ({
                                                            ...p,
                                                            pages: p.pages.map((pg, pi) =>
                                                                pi === idx
                                                                    ? {
                                                                          ...pg,
                                                                          descriptions: pg.descriptions.filter(
                                                                              (_, di) => di !== descIdx
                                                                          ),
                                                                      }
                                                                    : pg
                                                            ),
                                                        }))
                                                    }
                                                    className={btnDanger}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm((p) => ({
                                                ...p,
                                                pages: p.pages.map((pg, pi) =>
                                                    pi === idx
                                                        ? { ...pg, descriptions: [...pg.descriptions, ""] }
                                                        : pg
                                                ),
                                            }))
                                        }
                                        className="text-xs text-blue-600 font-medium"
                                    >
                                        + Add description
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-700 uppercase">Tech stack — labels</p>
                            <button
                                type="button"
                                onClick={() =>
                                    setForm((p) => ({ ...p, techStack: [...p.techStack, { label: "" }] }))
                                }
                                className={btnPrimary}
                            >
                                <Plus size={14} className="inline mr-1" /> Add row
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {form.techStack.map((tech, idx) => (
                                <div key={idx} className="flex gap-1 items-center">
                                    <input
                                        value={tech.label}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                techStack: p.techStack.map((t, i) =>
                                                    i === idx ? { ...t, label: e.target.value } : t
                                                ),
                                            }))
                                        }
                                        className={`${inp} w-40`}
                                        placeholder="e.g. React, Node.js"
                                    />
                                    {form.techStack.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setForm((p) => ({
                                                    ...p,
                                                    techStack: p.techStack.filter((_, i) => i !== idx),
                                                }))
                                            }
                                            className={btnDanger}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase">
                            Other requirement for &rarr; {form.systemName || proposedLabel || "…"}
                        </p>
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-500 uppercase px-1">
                            <div className="col-span-5">Requirement</div>
                            <div className="col-span-3">Term</div>
                            <div className="col-span-4">Price</div>
                            <div className="col-span-1" />
                        </div>
                        {form.otherRequirements.map((req, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                                <input
                                    className={`${inp} col-span-5`}
                                    value={req.requirement}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            otherRequirements: p.otherRequirements.map((r, i) =>
                                                i === idx ? { ...r, requirement: e.target.value } : r
                                            ),
                                        }))
                                    }
                                    placeholder="Requirement"
                                />
                                <input
                                    className={`${inp} col-span-3`}
                                    value={req.term}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            otherRequirements: p.otherRequirements.map((r, i) =>
                                                i === idx ? { ...r, term: e.target.value } : r
                                            ),
                                        }))
                                    }
                                    placeholder="Term"
                                />
                                <div className="col-span-4 space-y-1 min-w-0">
                                    <select
                                        className={inp}
                                        value={req.priceType || "amount"}
                                        onChange={(e) => {
                                            const priceType = e.target.value;
                                            setForm((p) => ({
                                                ...p,
                                                otherRequirements: p.otherRequirements.map((r, i) =>
                                                    i === idx
                                                        ? {
                                                              ...r,
                                                              priceType,
                                                              price:
                                                                  priceType === "client_side"
                                                                      ? 0
                                                                      : r.price,
                                                          }
                                                        : r
                                                ),
                                            }));
                                        }}
                                    >
                                        {OTHER_REQ_PRICE_TYPES.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    {(req.priceType || "amount") === "amount" && (
                                        <input
                                            type="number"
                                            min="0"
                                            className={inp}
                                            value={req.price === 0 ? "" : req.price}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    otherRequirements: p.otherRequirements.map((r, i) =>
                                                        i === idx
                                                            ? {
                                                                  ...r,
                                                                  price: parseFloat(e.target.value) || 0,
                                                              }
                                                            : r
                                                    ),
                                                }))
                                            }
                                            placeholder="Enter amount (₹)"
                                        />
                                    )}
                                </div>
                                {form.otherRequirements.length > 1 && (
                                    <button
                                        type="button"
                                        className={`${btnDanger} col-span-1`}
                                        onClick={() =>
                                            setForm((p) => ({
                                                ...p,
                                                otherRequirements: p.otherRequirements.filter(
                                                    (_, i) => i !== idx
                                                ),
                                            }))
                                        }
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() =>
                                setForm((p) => ({
                                    ...p,
                                    otherRequirements: [
                                        ...p.otherRequirements,
                                        { requirement: "", term: "", price: 0, priceType: "amount" },
                                    ],
                                }))
                            }
                            className={btnPrimary}
                        >
                            <Plus size={14} className="inline mr-1" /> Add requirement
                        </button>
                    </div>

                    <textarea
                        value={form.notes}
                        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Notes / terms…"
                        rows={3}
                        className={`${inp} resize-none`}
                    />

                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Pages subtotal</span>
                            <span className="font-semibold">₹{totalPages.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Requirements subtotal</span>
                            <span className="font-semibold">₹{totalReqs.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between text-base font-bold text-blue-600">
                            <span>Grand total</span>
                            <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        {editingQuoteId && (
                            <button type="button" onClick={cancelEdit} className={btnSecondary}>
                                Cancel
                            </button>
                        )}
                        <button type="button" onClick={handleSubmit} disabled={saving} className={btnPrimary}>
                            {saving ? "Saving…" : editingQuoteId ? "Update draft & preview" : "Save & preview quote"}
                        </button>
                    </div>
                </div>
            ) : loading ? (
                <p className="text-center py-8 text-gray-500">Loading quotes…</p>
            ) : quotes.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No quotes yet. Create one from the form tab.</p>
            ) : (
                <div className="space-y-2">
                    {quotes.map((quote) => (
                        <div
                            key={quote._id}
                            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{quote.title}</p>
                                <p className="text-xs text-gray-500">
                                    {quote.systemName} · ₹{(quote.grandTotal || 0).toLocaleString("en-IN")} ·{" "}
                                    <span className="capitalize">{quote.status}</span>
                                    {(quote.sendCount || 0) > 0 && (
                                        <> · Sent {quote.sendCount}×</>
                                    )}
                                    {(quote.followUps || []).filter((f) => f.status === "pending").length > 0 && (
                                        <> · {quote.followUps.filter((f) => f.status === "pending").length} follow-up</>
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                {quote.status === "draft" && (
                                    <button
                                        type="button"
                                        onClick={() => startEditDraft(quote)}
                                        className={btnSecondary}
                                    >
                                        <Pencil size={14} className="inline mr-1" /> Edit
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onOpenPreview?.(quote)}
                                    className={btnPrimary}
                                >
                                    <Eye size={14} className="inline mr-1" /> Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(quote._id)}
                                    className={btnDanger}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
