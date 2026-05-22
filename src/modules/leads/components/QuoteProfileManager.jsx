import { useState, useEffect, useRef } from "react";
import {
    X,
    Plus,
    Pencil,
    Trash2,
    Save,
    History,
    Upload,
    Star,
    Building2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
    listQuoteProfilesAdmin,
    getQuoteProfileDefaults,
    getQuoteProfileHistory,
    createQuoteProfile,
    updateQuoteProfile,
    deleteQuoteProfile,
    uploadQuoteProfileLogo,
    uploadQuoteProfilePaymentQr,
} from "../services/quoteProfileService";

const inp =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const emptyProfile = () => ({
    name: "",
    companyName: "",
    tagline: "#TeamDigiCoders",
    email: "",
    phone: "",
    website: "",
    address: "",
    gstNote: "18% GST (Tax) — Excluded unless specified",
    validityDays: 30,
    paymentTerms: `Payment Terms:
• 40% advance to start development
• 30% at 50% module completion
• 30% on final delivery`,
    paymentBankDetails: `Bank / UPI:
Company name · Bank · Account · IFSC`,
    paymentTimeline: "Development timeline: 20–25 working days (approx.)",
    paymentOtherNotes: "GST 18% excluded from offered development price unless specified.",
    isDefault: false,
});

export default function QuoteProfileManager({ isOpen, onClose, onSave }) {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyProfile());
    const [historyOpen, setHistoryOpen] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const logoRef = useRef(null);
    const qrRef = useRef(null);

    const load = async () => {
        try {
            setLoading(true);
            const list = await listQuoteProfilesAdmin();
            setProfiles(list);
        } catch {
            toast.error("Failed to load quote profiles");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        load();
        setEditing(null);
        setForm(emptyProfile());
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const fn = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [isOpen, onClose]);

    const startNew = () => {
        setEditing("new");
        setForm(emptyProfile());
    };

    const importFromConfig = async () => {
        try {
            const defaults = await getQuoteProfileDefaults();
            setForm((f) => ({
                ...f,
                ...defaults,
                logoUrl: f.logoUrl,
            }));
            if (!editing) setEditing("new");
            toast.success("Imported from system config (quoteBranding.js)");
        } catch {
            toast.error("Failed to load system defaults");
        }
    };

    const startEdit = (p) => {
        setEditing(p._id);
        setForm({
            name: p.name || "",
            companyName: p.companyName || "",
            tagline: p.tagline || "",
            email: p.email || "",
            phone: p.phone || "",
            website: p.website || "",
            address: p.address || "",
            gstNote: p.gstNote || "",
            validityDays: p.validityDays ?? 30,
            paymentTerms: p.paymentTerms || p.paymentNotes || "",
            paymentBankDetails: p.paymentBankDetails || "",
            paymentTimeline: p.paymentTimeline || "",
            paymentOtherNotes: p.paymentOtherNotes || "",
            isDefault: !!p.isDefault,
            logoUrl: p.logo?.url,
            paymentQrUrl: p.paymentQr?.url,
        });
    };

    const handleSave = async () => {
        if (!form.name.trim()) return toast.error("Profile name is required");
        if (!form.companyName.trim()) return toast.error("Company name is required");
        try {
            setSaving(true);
            const payload = { ...form };
            delete payload.logoUrl;
            delete payload.paymentQrUrl;
            if (editing === "new") {
                await createQuoteProfile(payload);
                toast.success("Quote profile created");
            } else {
                await updateQuoteProfile(editing, payload);
                toast.success("Quote profile updated");
            }
            await load();
            setEditing(null);
            setForm(emptyProfile());
            onSave?.();
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to save profile");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p) => {
        if (!window.confirm(`Delete profile "${p.name}"? Quotes using it will fall back to the default profile.`)) return;
        try {
            await deleteQuoteProfile(p._id);
            toast.success("Profile deleted");
            if (editing === p._id) {
                setEditing(null);
                setForm(emptyProfile());
            }
            await load();
            onSave?.();
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to delete");
        }
    };

    const openHistory = async (p) => {
        try {
            setHistoryLoading(true);
            setHistoryOpen(p);
            const res = await getQuoteProfileHistory(p._id);
            setHistory(res.history || []);
        } catch {
            toast.error("Failed to load history");
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleLogo = async (e) => {
        const file = e.target.files?.[0];
        if (!file || editing === "new" || !editing) return;
        try {
            const profile = await uploadQuoteProfileLogo(editing, file);
            setForm((f) => ({ ...f, logoUrl: profile.logo?.url }));
            toast.success("Logo uploaded");
            await load();
            onSave?.();
        } catch {
            toast.error("Logo upload failed");
        }
        e.target.value = "";
    };

    const handlePaymentQr = async (e) => {
        const file = e.target.files?.[0];
        if (!file || editing === "new" || !editing) return;
        try {
            const profile = await uploadQuoteProfilePaymentQr(editing, file);
            setForm((f) => ({ ...f, paymentQrUrl: profile.paymentQr?.url }));
            toast.success("Payment QR uploaded");
            await load();
            onSave?.();
        } catch {
            toast.error("Payment QR upload failed");
        }
        e.target.value = "";
    };

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-blue-600" />
                        <h2 className="text-sm font-semibold text-gray-900">Quote form profiles (Admin)</h2>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
                    <div className="lg:w-2/5 border-b lg:border-b-0 lg:border-r flex flex-col min-h-0">
                        <div className="p-3 border-b flex flex-wrap justify-between items-center gap-2 shrink-0">
                            <p className="text-xs font-semibold text-gray-600 uppercase">Profiles</p>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={importFromConfig}
                                    className="px-2 py-1 text-[10px] border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                                    title="Pre-fill from server/config/quoteBranding.js"
                                >
                                    Import config
                                </button>
                                <button
                                    type="button"
                                    onClick={startNew}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Plus size={12} /> New
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {loading ? (
                                <p className="text-center text-sm text-gray-500 py-8">Loading…</p>
                            ) : profiles.length === 0 ? (
                                <p className="text-center text-sm text-gray-500 py-8">No profiles yet</p>
                            ) : (
                                profiles.map((p) => (
                                    <div
                                        key={p._id}
                                        className={`p-3 rounded-lg border text-sm ${
                                            editing === p._id
                                                ? "border-blue-400 bg-blue-50"
                                                : p.isDeleted
                                                  ? "border-gray-200 bg-gray-50 opacity-60"
                                                  : "border-gray-200 hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {p.logo?.url ? (
                                                <img src={p.logo.url} alt="" className="h-8 w-8 object-contain rounded" />
                                            ) : (
                                                <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                                                    LOGO
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{p.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{p.companyName}</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {p.isDefault && !p.isDeleted && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                                                            Default
                                                        </span>
                                                    )}
                                                    {p.isDeleted && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                                                            Deleted
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-gray-400">
                                                        {p.historyCount ?? 0} history
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {!p.isDeleted && (
                                            <div className="flex gap-1 mt-2 justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(p)}
                                                    className="p-1.5 rounded hover:bg-white text-blue-600"
                                                    title="Edit"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openHistory(p)}
                                                    className="p-1.5 rounded hover:bg-white text-gray-600"
                                                    title="History"
                                                >
                                                    <History size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(p)}
                                                    className="p-1.5 rounded hover:bg-white text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 min-h-0">
                        {!editing ? (
                            <div className="text-center py-16 text-gray-500 text-sm">
                                Select a profile to edit, or create a new quote branding profile for PDFs and emails.
                            </div>
                        ) : (
                            <div className="space-y-4 max-w-xl">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-bold text-gray-700 uppercase">
                                        {editing === "new" ? "New profile" : "Edit profile"}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={importFromConfig}
                                        className="text-[10px] text-blue-600 hover:underline"
                                    >
                                        Import from system config
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500">Profile name *</label>
                                        <input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. DigiCoders Default" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Company name *</label>
                                        <input className={inp} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Tagline</label>
                                        <input className={inp} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Email</label>
                                        <input type="email" className={inp} value={form.email} onChange={(e) => set("email", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Phone</label>
                                        <input className={inp} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Website</label>
                                        <input className={inp} value={form.website} onChange={(e) => set("website", e.target.value)} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs text-gray-500">Address</label>
                                        <textarea className={`${inp} resize-none`} rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">GST note</label>
                                        <input className={inp} value={form.gstNote} onChange={(e) => set("gstNote", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Validity (days)</label>
                                        <input type="number" min={1} className={inp} value={form.validityDays} onChange={(e) => set("validityDays", parseInt(e.target.value, 10) || 30)} />
                                    </div>
                                </div>
                                <div className="space-y-3 p-3 border border-amber-100 bg-amber-50/30 rounded-xl">
                                    <p className="text-xs font-bold text-amber-900 uppercase">Terms &amp; payment (shown on PDF/email)</p>
                                    <div>
                                        <label className="text-xs text-gray-500">Payment terms (installments)</label>
                                        <textarea className={`${inp} resize-none font-mono text-xs`} rows={4} value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} placeholder="40% advance, 30% mid, 30% delivery…" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Bank / UPI / account details</label>
                                        <textarea className={`${inp} resize-none font-mono text-xs`} rows={3} value={form.paymentBankDetails} onChange={(e) => set("paymentBankDetails", e.target.value)} placeholder="Bank name, account, IFSC, UPI ID…" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Development timeline</label>
                                        <textarea className={`${inp} resize-none text-xs`} rows={2} value={form.paymentTimeline} onChange={(e) => set("paymentTimeline", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Additional notes (GST, scope, etc.)</label>
                                        <textarea className={`${inp} resize-none text-xs`} rows={2} value={form.paymentOtherNotes} onChange={(e) => set("paymentOtherNotes", e.target.value)} />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                    <input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} />
                                    <Star size={14} className={form.isDefault ? "text-amber-500 fill-amber-500" : "text-gray-400"} />
                                    Set as default profile for new quotes
                                </label>
                                {editing !== "new" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                                            <p className="text-xs font-semibold text-gray-700">Company logo</p>
                                            {form.logoUrl ? (
                                                <img src={form.logoUrl} alt="Logo" className="h-14 object-contain" />
                                            ) : (
                                                <span className="text-xs text-gray-400 block py-4">No logo uploaded</span>
                                            )}
                                            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                                            <button
                                                type="button"
                                                onClick={() => logoRef.current?.click()}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-white w-full justify-center"
                                            >
                                                <Upload size={12} /> Upload logo
                                            </button>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                                            <p className="text-xs font-semibold text-gray-700">Payment QR code</p>
                                            {form.paymentQrUrl ? (
                                                <img src={form.paymentQrUrl} alt="Payment QR" className="h-28 w-28 object-contain mx-auto border rounded" />
                                            ) : (
                                                <span className="text-xs text-gray-400 block py-4 text-center">No QR uploaded</span>
                                            )}
                                            <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={handlePaymentQr} />
                                            <button
                                                type="button"
                                                onClick={() => qrRef.current?.click()}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-white w-full justify-center"
                                            >
                                                <Upload size={12} /> Upload payment QR
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {editing === "new" && (
                                    <p className="text-[11px] text-gray-500 bg-gray-50 border rounded-lg p-3">
                                        Save the profile first, then upload logo and payment QR.
                                    </p>
                                )}
                                <div className="flex gap-2 justify-end pt-2">
                                    <button type="button" onClick={() => { setEditing(null); setForm(emptyProfile()); }} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                                        Cancel
                                    </button>
                                    <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                                        <Save size={14} /> {saving ? "Saving…" : "Save profile"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {historyOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryOpen(null)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col">
                        <div className="px-4 py-3 border-b flex justify-between items-center">
                            <h3 className="text-sm font-semibold">History — {historyOpen.name}</h3>
                            <button type="button" onClick={() => setHistoryOpen(null)} className="p-1 hover:bg-gray-100 rounded">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {historyLoading ? (
                                <p className="text-sm text-gray-500 text-center">Loading…</p>
                            ) : history.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center">No history</p>
                            ) : (
                                [...history].reverse().map((h) => (
                                    <div key={h._id} className="text-xs border rounded-lg p-3 bg-gray-50">
                                        <div className="flex justify-between gap-2 mb-1">
                                            <span className="font-semibold capitalize text-gray-800">{h.action}</span>
                                            <span className="text-gray-400 shrink-0">
                                                {new Date(h.changedAt).toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                        <p className="text-gray-600">{h.summary}</p>
                                        {h.changedBy && (
                                            <p className="text-gray-400 mt-1">
                                                by {h.changedBy.firstName} {h.changedBy.lastName}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
