import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
    X, Plus, Trash2, Save, CheckCircle2,
    ChevronDown, ChevronUp, GripVertical, AlertTriangle, FileText, Pencil,
} from "lucide-react";
import { toast } from "react-toastify";
import { updateQuote } from "../services/quoteService";
import { listQuoteProfiles } from "../services/quoteProfileService";
import { buildProfilePaymentHtml, getQuoteProfile } from "./quotePaymentDisplay";
import { applyQuotePlaceholders, buildClientPlaceholderContext } from "./quoteEmailUtils";
import { PROPOSED_SYSTEM_OPTIONS, OTHER_REQ_PRICE_TYPES } from "./quoteFormUtils";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const btnGhost = "px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1";

// ── Build the exact same HTML the server sends to the customer ─────────────────
function buildPreviewHtml(fullQuote, pages, lead, totalPagesCost, totalReqsCost, grandTotal, phCtx) {
    const esc = (s) => String(s ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const ph = (text) => {
        if (text == null || text === "") return "";
        const resolved = phCtx ? applyQuotePlaceholders(String(text), phCtx) : String(text);
        return esc(resolved);
    };
    const fmt = (n) => `₹ ${(Number(n) || 0).toLocaleString("en-IN")} /-`;

    const leadData  = lead || fullQuote.leadId || {};
    const proposed  = fullQuote.proposedSystemCategory === "Other"
        ? (fullQuote.proposedSystemOther || "Other")
        : (fullQuote.proposedSystemCategory || fullQuote.proposedSystem || "Website");

    const currentDate = new Date(fullQuote.createdAt || Date.now()).toLocaleDateString("en-IN", {
        year: "numeric", month: "long", day: "numeric",
    });

    const filteredPages = pages.filter((p) => p.name?.trim());
    const tech  = (fullQuote.techStack || []).filter((t) => t.label);
    const reqs  = (fullQuote.otherRequirements || []).filter((r) => r.requirement);
    const notesTrimmed = (fullQuote.notes || "").trim();
    const profile = getQuoteProfile(fullQuote);

    const isClientSide = (r) => r.priceType === "client_side" ||
        ((r.term || "").trim().toLowerCase() === "client side" && !(Number(r.price) > 0));
    const fmtReq = (r) => isClientSide(r) ? "Client Side" : (Number(r.price) > 0 ? fmt(r.price) : "—");

    const moduleBlocks = filteredPages.map((p, i) => `
        <div class="module-card">
            <div class="module-head">
                <span class="module-letter">${String.fromCharCode(97 + i)}.</span>
                <span class="module-title">${ph(p.name)}</span>
                <span class="module-cost">[Cost: ${fmt(p.cost)}]</span>
            </div>
            ${(p.descriptions || []).filter(Boolean).length
                ? `<ul class="feature-list">${(p.descriptions || []).filter(Boolean).map((d) => `<li>${ph(d)}</li>`).join("")}</ul>`
                : ""}
        </div>`).join('<div style="page-break-before: always; margin-top: 20px;"></div>');

    const pagesRows = filteredPages.map((p, i) => `
        <tr>
            <td><strong>${String.fromCharCode(97 + i)}. ${ph(p.name)}</strong></td>
            <td>One Time</td>
            <td class="amount">${fmt(p.cost)}</td>
        </tr>`).join("");

    const paymentSectionHtml = buildProfilePaymentHtml(profile, esc);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
@page{size:A4 portrait;margin:12mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;width:210mm;max-width:210mm;color:#1e293b;background:#fff;font-size:12px;line-height:1.45;font-family:"Segoe UI",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:100%;max-width:186mm;margin:0 auto;padding:8mm 10mm 12mm}
.cover{text-align:center;padding-bottom:20px;border-bottom:3px solid #0d47a1;margin-bottom:24px}
.cover img{height:56px;margin-bottom:10px}
.cover h1{margin:0;font-size:20px;color:#0d47a1;font-weight:700}
.cover .company{font-size:14px;color:#334155;margin-top:6px;font-weight:600}
.cover .tag{font-size:12px;color:#64748b;margin-top:4px}
.salutation{background:#f8fafc;border-left:4px solid #0d47a1;padding:14px 16px;margin-bottom:22px;font-size:13px;color:#475569}
.salutation strong{color:#0f172a}
h2.section{font-size:14px;color:#0d47a1;margin:18px 0 10px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;break-after:avoid;page-break-after:avoid}
.client-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.label{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:700;margin-bottom:2px}
.value{font-size:13px;margin-bottom:10px}
.system-banner{background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border:1px solid #93c5fd;border-radius:8px;padding:14px 16px;margin-bottom:20px}
.system-banner .line1{font-size:12px;color:#1d4ed8;font-weight:600}
.system-banner .line2{font-size:18px;font-weight:700;color:#0d47a1;margin-top:4px}
.module-card{border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:10px;break-inside:avoid;page-break-inside:avoid}
thead{display:table-header-group}
tr{break-inside:avoid;page-break-inside:avoid}
.module-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin-bottom:8px}
.module-letter{font-weight:700;color:#0d47a1}
.module-title{font-weight:700;font-size:14px;flex:1}
.module-cost{font-weight:700;color:#0d47a1;font-size:12px}
.feature-list{margin:0;padding-left:20px;color:#475569}
.feature-list li{margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin:10px 0 16px}
th{background:#0d47a1;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase}
td{padding:10px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top}
.amount{text-align:right;white-space:nowrap;font-weight:600}
tr.subtotal td{background:#f1f5f9;font-weight:700}
tr.grand td{background:#0d47a1;color:#fff;font-size:15px;font-weight:700}
tr.gst td{background:#fef3c7;color:#92400e;font-size:12px}
.tech-line{padding:8px 12px;background:#f8fafc;border-left:3px solid #3b82f6;margin-bottom:8px;font-size:12px}
.notes{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;white-space:pre-wrap;font-size:12px;color:#78350f;margin-bottom:10px}
.pay-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#0d47a1;font-weight:700;margin:14px 0 6px}
.payment-qr-wrap{text-align:center;margin:16px 0 8px}
.payment-qr{max-width:168px;height:auto;border:1px solid #e2e8f0;border-radius:8px;padding:6px;background:#fff}
.footer{margin-top:28px;padding-top:16px;border-top:2px solid #e2e8f0;font-size:11px;color:#64748b}
.sign-row{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}
.sign-box{border-top:1px solid #94a3b8;padding-top:8px;min-height:48px;font-size:11px;color:#64748b}
</style>
</head>
<body>
<div class="page">
    <div class="cover">
        <img src="/logo.png" alt="logo" onerror="this.style.display='none'"/>
        <h1>Proposal For ${esc(proposed)}</h1>
        <p class="company">${esc(fullQuote.systemName)}</p>
        <p class="tag">${currentDate}</p>
    </div>

    <div class="salutation">
        <strong>Hello ${esc(leadData.contactPerson || "Sir/Ma'am")},</strong><br/>
        As per your requirements, we have prepared this proposal for
        <strong>${esc(leadData.orgName || "your organization")}</strong>.
        Please review the scope, costing, and terms below.
    </div>

    <div class="client-grid">
        <div>
            <div class="label">Prepared for</div>
            <div class="value"><strong>${esc(leadData.orgName || "—")}</strong></div>
            <div class="label">Contact</div>
            <div class="value">${esc(leadData.contactPerson || "—")}</div>
            <div class="label">Email / Phone</div>
            <div class="value">${esc(leadData.email || "—")} · ${esc(leadData.contactNumber || "—")}</div>
        </div>
        <div>
            <div class="label">Quote date</div>
            <div class="value">${currentDate}</div>
        </div>
    </div>

    <div class="system-banner">
        <div class="line1">Proposed System for → ${esc(proposed)}</div>
        <div class="line2">1. System Name → ${ph(fullQuote.systemName)}</div>
    </div>

    ${filteredPages.length ? `<h2 class="section">Modules &amp; features</h2>${moduleBlocks}` : ""}

    ${tech.length ? `<h2 class="section">Tech Stack</h2>${tech.map((t) => `<div class="tech-line">${ph(t.label)}${t.value ? ` — ${ph(t.value)}` : ""}</div>`).join("")}` : ""}

    ${reqs.length ? `
    <h2 class="section">Other Requirements for → ${ph(fullQuote.systemName)}</h2>
    <table>
        <thead><tr><th>Requirement</th><th>Term</th><th class="amount">Price</th></tr></thead>
        <tbody>${reqs.map((r) => `<tr><td>${ph(r.requirement)}</td><td>${ph(r.term || "—")}</td><td class="amount">${fmtReq(r)}</td></tr>`).join("")}</tbody>
    </table>` : ""}

    ${filteredPages.length ? `
    <h2 class="section">Costing for development</h2>
    <table>
        <thead><tr><th>Module / Page</th><th>Term</th><th class="amount">Price</th></tr></thead>
        <tbody>
            ${pagesRows}
            <tr class="subtotal"><td colspan="2">Sub Total</td><td class="amount">${fmt(totalPagesCost)}</td></tr>
            ${totalReqsCost > 0 ? `<tr class="subtotal"><td colspan="2">Other requirements</td><td class="amount">${fmt(totalReqsCost)}</td></tr>` : ""}
            <tr class="gst"><td colspan="2">18% GST (Tax) — Excluded</td><td class="amount">—</td></tr>
            <tr class="grand"><td colspan="2">Offered Price / Net Amount</td><td class="amount">${fmt(grandTotal)}</td></tr>
        </tbody>
    </table>` : `<table><tbody><tr class="grand"><td colspan="2">Offered Price / Net Amount</td><td class="amount">${fmt(grandTotal)}</td></tr></tbody></table>`}

    ${notesTrimmed ? `<h2 class="section">Notes &amp; Terms</h2><div class="notes">${ph(notesTrimmed)}</div>` : ""}

    <h2 class="section">Payment method &amp; terms</h2>${paymentSectionHtml || `<p style="color:#94a3b8;font-size:12px">Configure payment details in Quote branding profile.</p>`}

    <div class="sign-row">
        <div class="sign-box"><strong>Client</strong><br/>Authorized signatory</div>
        <div class="sign-box"><strong>Prepared by</strong><br/>Authorized signatory</div>
    </div>

    <div class="footer">
        <p>Valid for 30 days from quote date. * Terms &amp; Conditions apply.</p>
    </div>
</div>
</body>
</html>`;
}

// ── Single page editor card ────────────────────────────────────────────────────
function PageCard({ page, idx, onChange, onRemove, canRemove, isActive, onActivate }) {
    const letter = String.fromCharCode(65 + idx);

    const setField = (field, value) => onChange({ ...page, [field]: value });
    const setDesc  = (di, val) => setField("descriptions", page.descriptions.map((d, i) => (i === di ? val : d)));
    const addDesc  = () => setField("descriptions", [...(page.descriptions || []), ""]);
    const removeDesc = (di) => setField("descriptions", page.descriptions.filter((_, i) => i !== di));

    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${isActive ? "border-blue-400 shadow-sm" : "border-gray-200"}`}>
            <div
                className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none transition-colors ${isActive ? "bg-blue-50" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={onActivate}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <GripVertical size={14} className="text-gray-300 shrink-0" />
                    <span className={`text-xs font-bold shrink-0 ${isActive ? "text-blue-700" : "text-gray-500"}`}>{letter}</span>
                    {page.name
                        ? <span className="text-sm font-medium text-gray-800 truncate">{page.name}</span>
                        : <span className="text-sm text-gray-300 italic">Untitled page</span>}
                    {page.cost > 0 && (
                        <span className="ml-auto shrink-0 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            ₹{(page.cost || 0).toLocaleString("en-IN")}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                    {canRemove && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors" title="Remove page">
                            <Trash2 size={13} />
                        </button>
                    )}
                    {isActive ? <ChevronUp size={14} className="text-blue-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </div>
            </div>

            {isActive && (
                <div className="p-4 space-y-4 border-t border-blue-100 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                Page Name <span className="text-red-400">*</span>
                            </label>
                            <input value={page.name} onChange={(e) => setField("name", e.target.value)}
                                className={inp} placeholder="e.g. Dashboard, Login, Reports…" autoFocus />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Development Cost</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
                                <input type="number" min="0" value={page.cost || ""}
                                    onChange={(e) => setField("cost", parseFloat(e.target.value) || 0)}
                                    className={`${inp} pl-7`} placeholder="0" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2">Features / Descriptions</label>
                        <div className="space-y-2 pl-3 border-l-2 border-blue-100">
                            {(page.descriptions || []).map((desc, di) => (
                                <div key={di} className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 w-5 text-right shrink-0 font-medium">{di + 1}.</span>
                                    <input value={desc} onChange={(e) => setDesc(di, e.target.value)}
                                        className={`${inp} flex-1`} placeholder="e.g. User login with OTP verification" />
                                    {page.descriptions.length > 1 && (
                                        <button type="button" onClick={() => removeDesc(di)}
                                            className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addDesc} className={btnGhost}>
                                <Plus size={12} /> Add feature
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Fullscreen Quote Editor ─────────────────────────────────────────────────────
export default function PageEditorFullscreen({ quote, lead, leadFieldConfig = [], quoteProfiles = [], onClose, onSaved }) {
    const [editState, setEditState] = useState({
        title: quote.title || "Project Quote",
        quoteProfileId: quote.quoteProfileId?._id || quote.quoteProfileId || "",
        proposedSystemCategory: quote.proposedSystemCategory || "Website",
        proposedSystemOther: quote.proposedSystemOther || "",
        systemName: quote.systemName || "",
        pages: (quote.pages || []).map((p) => ({
            name: p.name || "",
            cost: p.cost || 0,
            descriptions: p.descriptions?.length ? [...p.descriptions] : [""],
        })),
        techStack: quote.techStack || [{ label: "" }],
        otherRequirements: quote.otherRequirements || [{ requirement: "", term: "", price: 0, priceType: "amount" }],
        notes: quote.notes || "",
        leadFieldsToDisplay: quote.leadFieldsToDisplay || [],
    });

    const [activePageIdx, setActivePageIdx] = useState(0);
    const [saving, setSaving] = useState(false);
    const leftPaneRef = useRef(null);
    const iframeRef = useRef(null);
    const sectionRefs = useRef({});
    const SECTIONS = ["details", "pages", "tech", "requirements", "notes"];

    const { pages, techStack, otherRequirements } = editState;
    const totalPagesCost = pages.reduce((s, p) => s + (Number(p.cost) || 0), 0);
    const totalReqsCost = otherRequirements.reduce(
        (s, r) => (r.priceType === "client_side" ? s : s + (Number(r.price) || 0)), 0);
    const grandTotal = totalPagesCost + totalReqsCost;

    const originalState = {
        title: quote.title || "Project Quote",
        quoteProfileId: quote.quoteProfileId?._id || quote.quoteProfileId || "",
        proposedSystemCategory: quote.proposedSystemCategory || "Website",
        proposedSystemOther: quote.proposedSystemOther || "",
        systemName: quote.systemName || "",
        pages: (quote.pages || []).map((p) => ({
            name: p.name || "",
            cost: p.cost || 0,
            descriptions: p.descriptions?.length ? [...p.descriptions] : [""],
        })),
        techStack: quote.techStack || [{ label: "" }],
        otherRequirements: quote.otherRequirements || [{ requirement: "", term: "", price: 0, priceType: "amount" }],
        notes: quote.notes || "",
        leadFieldsToDisplay: quote.leadFieldsToDisplay || [],
    };

    const hasUnsaved = JSON.stringify(editState) !== JSON.stringify(originalState);

    const phCtx = useMemo(
        () => buildClientPlaceholderContext(
            {
                ...quote,
                ...editState,
                totalPagesCost,
                totalRequirementsCost: totalReqsCost,
                grandTotal,
            },
            lead,
            leadFieldConfig
        ),
        [quote, editState, lead, leadFieldConfig, totalPagesCost, totalReqsCost, grandTotal]
    );

    const previewHtml = useMemo(
        () => buildPreviewHtml(
            { ...quote, ...editState },
            pages,
            lead,
            totalPagesCost,
            totalReqsCost,
            grandTotal,
            phCtx
        ),
        [quote, editState, pages, lead, totalPagesCost, totalReqsCost, grandTotal, phCtx]
    );

    const handleSave = async () => {
        if (!editState.systemName?.trim()) return toast.error("System name is required");
        if (pages.find((p) => !p.name?.trim())) return toast.error("All pages must have a name");
        
        try {
            setSaving(true);
            const payload = {
                title: editState.title,
                quoteProfileId: editState.quoteProfileId || undefined,
                proposedSystemCategory: editState.proposedSystemCategory,
                proposedSystemOther: editState.proposedSystemOther,
                systemName: editState.systemName,
                pages: editState.pages,
                techStack: editState.techStack,
                otherRequirements: editState.otherRequirements,
                notes: editState.notes,
                leadFieldsToDisplay: editState.leadFieldsToDisplay,
            };
            const res = await updateQuote(quote._id, payload);
            toast.success("Quote saved");
            onSaved(res.quote ?? res);
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to save");
        } finally { setSaving(false); }
    };

    const updateField = (field, value) => setEditState(s => ({ ...s, [field]: value }));
    const updatePageIdx = (idx, updated) => setEditState(s => ({ ...s, pages: s.pages.map((p, i) => i === idx ? updated : p) }));
    const addPage = () => setEditState(s => ({ ...s, pages: [...s.pages, { name: "", cost: 0, descriptions: [""] }] }));
    const removePage = (idx) => setEditState(s => ({ ...s, pages: s.pages.filter((_, i) => i !== idx) }));

    const updateTech = (idx, field, value) => setEditState(s => ({ ...s, techStack: s.techStack.map((t, i) => i === idx ? { ...t, [field]: value } : t) }));
    const addTech = () => setEditState(s => ({ ...s, techStack: [...s.techStack, { label: "" }] }));
    const removeTech = (idx) => setEditState(s => ({ ...s, techStack: s.techStack.filter((_, i) => i !== idx) }));

    const updateReq = (idx, field, value) => setEditState(s => ({ ...s, otherRequirements: s.otherRequirements.map((r, i) => i === idx ? { ...r, [field]: value } : r) }));
    const addReq = () => setEditState(s => ({ ...s, otherRequirements: [...s.otherRequirements, { requirement: "", term: "", price: 0, priceType: "amount" }] }));
    const removeReq = (idx) => setEditState(s => ({ ...s, otherRequirements: s.otherRequirements.filter((_, i) => i !== idx) }));

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b shadow-sm shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <Pencil size={16} className="text-blue-600 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                            Edit Quote — {editState.title}
                        </p>
                        <p className="text-xs text-gray-400">
                            {pages.length} page{pages.length !== 1 ? "s" : ""} · Grand total ₹{grandTotal.toLocaleString("en-IN")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {hasUnsaved && (
                        <span className="hidden sm:flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <AlertTriangle size={12} /> Unsaved changes
                        </span>
                    )}
                    {!hasUnsaved && !saving && (
                        <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <CheckCircle2 size={12} /> Up to date
                        </span>
                    )}
                    <button type="button" onClick={handleSave} disabled={saving || !hasUnsaved}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                        <Save size={14} /> {saving ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Close editor">
                        <X size={18} />
                    </button>
                </div>
            </div>



            {/* ── Main split ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT — Editor */}
                <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0 flex flex-col bg-white border-r overflow-hidden">
                    <div
                        ref={leftPaneRef}
                        className="flex-1 overflow-y-auto p-5 space-y-6"
                        onScroll={() => {
                            const pane = leftPaneRef.current;
                            if (!pane) return;
                            const paneTop = pane.scrollTop;
                            const paneH = pane.clientHeight;
                            // find which section occupies most of the viewport
                            let active = SECTIONS[0];
                            let bestRatio = -1;
                            SECTIONS.forEach((key) => {
                                const el = sectionRefs.current[key];
                                if (!el) return;
                                const elTop = el.offsetTop - pane.offsetTop;
                                const elBot = elTop + el.offsetHeight;
                                const visTop = Math.max(elTop, paneTop);
                                const visBot = Math.min(elBot, paneTop + paneH);
                                const visible = Math.max(0, visBot - visTop);
                                const ratio = visible / el.offsetHeight;
                                if (ratio > bestRatio) { bestRatio = ratio; active = key; }
                            });
                            // map section → iframe anchor and scroll
                            const anchorMap = {
                                details: ".system-banner",
                                pages: ".module-card",
                                tech: ".tech-line",
                                requirements: "table",
                                notes: ".notes",
                            };
                            try {
                                const doc = iframeRef.current?.contentDocument;
                                const target = doc?.querySelector(anchorMap[active]);
                                if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                            } catch { /* cross-origin guard */ }
                        }}
                    >
                        {/* ── DETAILS (always first — mirrors PDF cover/system-banner) ── */}
                        <div ref={(el) => { sectionRefs.current.details = el; }} className="space-y-4">
                            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">ℹ️ Details</p>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Quote Title</label>
                                <input value={editState.title} onChange={(e) => updateField("title", e.target.value)} className={inp} placeholder="Project Quote" />
                            </div>
                            {quoteProfiles.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Branding Profile</label>
                                    <select value={editState.quoteProfileId} onChange={(e) => updateField("quoteProfileId", e.target.value)} className={inp}>
                                        <option value="">— Company default —</option>
                                        {quoteProfiles.map((p) => (
                                            <option key={p._id} value={p._id}>{p.name}{p.isDefault ? " (default)" : ""}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">Proposed System Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {PROPOSED_SYSTEM_OPTIONS.map((opt) => (
                                        <label key={opt} className={`px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                                            editState.proposedSystemCategory === opt
                                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                                        }`}>
                                            <input type="radio" className="sr-only" checked={editState.proposedSystemCategory === opt}
                                                onChange={() => updateField("proposedSystemCategory", opt)} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {editState.proposedSystemCategory === "Other" && (
                                <input value={editState.proposedSystemOther} onChange={(e) => updateField("proposedSystemOther", e.target.value)}
                                    className={inp} placeholder="Specify system type…" />
                            )}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">System Name <span className="text-red-500">*</span></label>
                                <input value={editState.systemName} onChange={(e) => updateField("systemName", e.target.value)}
                                    className={inp} placeholder="e.g. CRM Web Based" />
                            </div>
                            {leadFieldConfig.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-2">Lead Fields to Display</label>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                        {[
                                            { key: "contactNumber", label: "Contact Number" },
                                            { key: "address", label: "Address" },
                                            { key: "status", label: "Status" },
                                        ].map((f) => (
                                            <label key={f.key} className="flex items-center gap-2 text-sm">
                                                <input type="checkbox" checked={editState.leadFieldsToDisplay.includes(f.key)}
                                                    onChange={(e) => {
                                                        const updated = e.target.checked
                                                            ? [...editState.leadFieldsToDisplay, f.key]
                                                            : editState.leadFieldsToDisplay.filter(k => k !== f.key);
                                                        updateField("leadFieldsToDisplay", updated);
                                                    }}
                                                    className="rounded" />
                                                {f.label}
                                            </label>
                                        ))}
                                        {leadFieldConfig.map((f) => (
                                            <label key={f.key} className="flex items-center gap-2 text-sm">
                                                <input type="checkbox" checked={editState.leadFieldsToDisplay.includes(f.key)}
                                                    onChange={(e) => {
                                                        const updated = e.target.checked
                                                            ? [...editState.leadFieldsToDisplay, f.key]
                                                            : editState.leadFieldsToDisplay.filter(k => k !== f.key);
                                                        updateField("leadFieldsToDisplay", updated);
                                                    }}
                                                    className="rounded" />
                                                {f.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── PAGES ── */}
                        <div ref={(el) => { sectionRefs.current.pages = el; }} className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">📄 Pages ({pages.length})</p>
                                <button type="button" onClick={addPage} className={btnGhost}>
                                    <Plus size={12} /> Add page
                                </button>
                            </div>
                            <div className="space-y-2">
                                {pages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-center">
                                        <FileText size={32} className="text-gray-200 mb-2" />
                                        <p className="text-sm text-gray-400">No pages yet</p>
                                        <button type="button" onClick={addPage} className="text-xs text-blue-600 hover:underline font-medium mt-2">+ Add first page</button>
                                    </div>
                                ) : pages.map((page, idx) => (
                                    <PageCard
                                        key={idx}
                                        page={page}
                                        idx={idx}
                                        isActive={activePageIdx === idx}
                                        onActivate={() => setActivePageIdx(activePageIdx === idx ? null : idx)}
                                        onChange={(updated) => updatePageIdx(idx, updated)}
                                        onRemove={() => removePage(idx)}
                                        canRemove={pages.length > 1}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* ── TECH STACK — only shown when there's at least one filled entry ── */}
                        {techStack.some(t => t.label?.trim()) && (
                            <div ref={(el) => { sectionRefs.current.tech = el; }} className="space-y-3 pt-2 border-t border-gray-100">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">⚙️ Tech Stack</p>
                                {techStack.map((tech, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input value={tech.label} onChange={(e) => updateTech(idx, "label", e.target.value)}
                                            className={inp} placeholder="Technology (e.g. React)" />
                                        {techStack.length > 1 && (
                                            <button type="button" onClick={() => removeTech(idx)} className="px-3 py-2 rounded-lg hover:bg-red-50 text-red-500">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addTech} className={btnGhost}>
                                    <Plus size={12} /> Add tech
                                </button>
                            </div>
                        )}
                        {/* Add tech button when section is hidden */}
                        {!techStack.some(t => t.label?.trim()) && (
                            <div className="pt-2 border-t border-gray-100">
                                <button type="button" onClick={addTech} className={`${btnGhost} text-gray-400 border-gray-200`}>
                                    <Plus size={12} /> Add Tech Stack
                                </button>
                            </div>
                        )}

                        {/* ── REQUIREMENTS — only shown when there's at least one filled entry ── */}
                        {otherRequirements.some(r => r.requirement?.trim()) && (
                            <div ref={(el) => { sectionRefs.current.requirements = el; }} className="space-y-3 pt-2 border-t border-gray-100">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">📋 Other Requirements</p>
                                {otherRequirements.map((req, idx) => (
                                    <div key={idx} className="p-3 border border-gray-200 rounded-lg space-y-2">
                                        <input value={req.requirement} onChange={(e) => updateReq(idx, "requirement", e.target.value)}
                                            className={inp} placeholder="Requirement (e.g. Domain & Hosting)" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input value={req.term} onChange={(e) => updateReq(idx, "term", e.target.value)}
                                                className={inp} placeholder="Term (e.g. 1 Year)" />
                                            <select value={req.priceType} onChange={(e) => updateReq(idx, "priceType", e.target.value)} className={inp}>
                                                {OTHER_REQ_PRICE_TYPES.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {(req.priceType || "amount") === "amount" && (
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                                <input type="number" min="0" value={req.price || ""} onChange={(e) => updateReq(idx, "price", parseFloat(e.target.value) || 0)}
                                                    className={`${inp} pl-7`} placeholder="0" />
                                            </div>
                                        )}
                                        {otherRequirements.length > 1 && (
                                            <button type="button" onClick={() => removeReq(idx)} className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">
                                                <Trash2 size={14} className="inline mr-1" /> Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addReq} className={btnGhost}>
                                    <Plus size={12} /> Add requirement
                                </button>
                            </div>
                        )}
                        {/* Add requirement button when section is hidden */}
                        {!otherRequirements.some(r => r.requirement?.trim()) && (
                            <div className="pt-2 border-t border-gray-100">
                                <button type="button" onClick={addReq} className={`${btnGhost} text-gray-400 border-gray-200`}>
                                    <Plus size={12} /> Add Requirement
                                </button>
                            </div>
                        )}

                        {/* ── NOTES — only shown when filled ── */}
                        {editState.notes?.trim() && (
                            <div ref={(el) => { sectionRefs.current.notes = el; }} className="space-y-3 pt-2 border-t border-gray-100">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">📝 Notes &amp; Terms</p>
                                <textarea value={editState.notes} onChange={(e) => updateField("notes", e.target.value)}
                                    placeholder="Enter notes, terms, and conditions…" rows={6}
                                    className={`${inp} resize-none`} />
                            </div>
                        )}
                        {/* Add notes button when empty */}
                        {!editState.notes?.trim() && (
                            <div className="pt-2 border-t border-gray-100">
                                <button type="button"
                                    onClick={() => updateField("notes", " ")}
                                    className={`${btnGhost} text-gray-400 border-gray-200`}>
                                    <Plus size={12} /> Add Notes &amp; Terms
                                </button>
                            </div>
                        )}
                    </div>

                    {pages.length > 0 && (
                        <div className="shrink-0 border-t bg-linear-to-r from-blue-50 to-indigo-50 px-4 py-3 space-y-1">
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>Pages subtotal</span>
                                <span className="font-semibold">₹{totalPagesCost.toLocaleString("en-IN")}</span>
                            </div>
                            {totalReqsCost > 0 && (
                                <div className="flex justify-between text-xs text-gray-600">
                                    <span>Requirements subtotal</span>
                                    <span className="font-semibold">₹{totalReqsCost.toLocaleString("en-IN")}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-bold text-blue-900 pt-1 border-t border-blue-200">
                                <span>Grand Total</span>
                                <span className="text-blue-700">₹{grandTotal.toLocaleString("en-IN")}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT — PDF preview */}
                <div className="flex-1 overflow-hidden hidden lg:flex flex-col bg-gray-200">
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 shrink-0">
                        <FileText size={13} className="text-gray-400" />
                        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                            PDF Preview
                        </p>
                        <span className="ml-auto text-[10px] text-gray-500">A4 · updates as you type</span>
                    </div>

                    <div className="flex-1 overflow-y-auto py-6 px-4 flex justify-center">
                        <div className="bg-white shadow-2xl" style={{ width: "210mm", minHeight: "297mm", flexShrink: 0 }}>
                            <iframe
                                ref={iframeRef}
                                key={previewHtml.length}
                                srcDoc={previewHtml}
                                title="PDF Preview"
                                className="w-full border-0"
                                style={{ minHeight: "297mm", height: "100%" }}
                                sandbox="allow-same-origin"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
