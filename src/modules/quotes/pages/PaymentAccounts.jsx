import { useState, useEffect, useRef } from "react";
import {
    CreditCard, Upload, Save, Building2, Phone, Mail, Globe,
    MapPin, QrCode, Pencil, X, CheckCircle2, Star, Plus, Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
    listQuoteProfilesAdmin,
    getQuoteProfileDefaults,
    createQuoteProfile,
    updateQuoteProfile,
    deleteQuoteProfile,
    uploadQuoteProfileLogo,
    uploadQuoteProfilePaymentQr,
} from "../../leads/services/quoteProfileService";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const ta = `${inp} resize-none`;

const emptyProfile = () => ({
    name: "", companyName: "", tagline: "", email: "", phone: "",
    website: "", address: "", gstNote: "18% GST (Tax) — Excluded unless specified",
    validityDays: 30,
    paymentTerms: "Payment Terms:\n• 40% advance to start development\n• 30% at 50% module completion\n• 30% on final delivery",
    paymentBankDetails: "Bank / UPI:\nCompany name · Bank · Account · IFSC",
    paymentTimeline: "Development timeline: 20–25 working days (approx.)",
    paymentOtherNotes: "GST 18% excluded from offered development price unless specified.",
    isDefault: false,
});

const Section = ({ title, icon: Icon, children }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            {Icon && <Icon size={14} className="text-blue-600" />}
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</span>
        </div>
        <div className="p-4 space-y-3 bg-white">{children}</div>
    </div>
);

export default function PaymentAccounts() {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(emptyProfile());
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const logoRef = useRef(null);
    const qrRef = useRef(null);

    const load = async () => {
        try {
            setLoading(true);
            const list = await listQuoteProfilesAdmin();
            setProfiles(list);
        } catch { toast.error("Failed to load profiles"); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const startNew = async () => {
        try {
            const defaults = await getQuoteProfileDefaults();
            setForm({ ...emptyProfile(), ...defaults });
        } catch { setForm(emptyProfile()); }
        setSelected("new");
    };

    const startEdit = (p) => {
        setSelected(p._id);
        setForm({
            name: p.name || "", companyName: p.companyName || "", tagline: p.tagline || "",
            email: p.email || "", phone: p.phone || "", website: p.website || "",
            address: p.address || "", gstNote: p.gstNote || "",
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
            delete payload.logoUrl; delete payload.paymentQrUrl;
            if (selected === "new") {
                const created = await createQuoteProfile(payload);
                toast.success("Payment profile created");
                await load();
                setSelected(created._id);
            } else {
                await updateQuoteProfile(selected, payload);
                toast.success("Payment profile updated");
                await load();
            }
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to save");
        } finally { setSaving(false); }
    };

    const handleDelete = async (p) => {
        try {
            await deleteQuoteProfile(p._id);
            toast.success("Profile deleted");
            setDeleteConfirmId(null);
            if (selected === p._id) { setSelected(null); setForm(emptyProfile()); }
            await load();
        } catch (e) { toast.error(e.response?.data?.message || "Failed to delete"); }
    };

    const handleLogo = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selected || selected === "new") return;
        try {
            const profile = await uploadQuoteProfileLogo(selected, file);
            setForm(f => ({ ...f, logoUrl: profile.logo?.url }));
            toast.success("Logo uploaded");
            await load();
        } catch { toast.error("Logo upload failed"); }
        e.target.value = "";
    };

    const handleQr = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selected || selected === "new") return;
        try {
            const profile = await uploadQuoteProfilePaymentQr(selected, file);
            setForm(f => ({ ...f, paymentQrUrl: profile.paymentQr?.url }));
            toast.success("Payment QR uploaded");
            await load();
        } catch { toast.error("QR upload failed"); }
        e.target.value = "";
    };

    const activeProfile = profiles.find(p => p._id === selected);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CreditCard size={22} className="text-blue-600" /> Payment Accounts
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Manage company branding, bank details & payment QR codes shown on quotes
                    </p>
                </div>
                <button onClick={startNew}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <Plus size={15} /> New Profile
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left — Profile list */}
                <div className="lg:w-72 shrink-0 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Profiles</p>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
                            No profiles yet.<br />
                            <button onClick={startNew} className="text-blue-600 hover:underline mt-1">Create one</button>
                        </div>
                    ) : (
                        profiles.map(p => (
                            <div key={p._id}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${selected === p._id
                                        ? "border-blue-400 bg-blue-50 shadow-sm"
                                        : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
                                    }`}
                                onClick={() => startEdit(p)}>
                                <div className="flex items-start gap-3">
                                    {p.logo?.url ? (
                                        <img src={p.logo.url} alt="" className="w-10 h-10 object-contain rounded-lg border border-gray-100 bg-white shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                            <Building2 size={16} className="text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="font-semibold text-sm text-gray-900 truncate">{p.name}</p>
                                            {p.isDefault && (
                                                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold">
                                                    <Star size={9} className="fill-amber-500 text-amber-500" /> Default
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{p.companyName}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {p.paymentQr?.url && (
                                                <span className="flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                                    <QrCode size={9} /> QR set
                                                </span>
                                            )}
                                            {deleteConfirmId === p._id ? (
                                                <div className="ml-auto flex items-center gap-1">
                                                    <span className="text-[10px] text-red-600 font-medium">Delete?</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                                                        className="px-2 py-0.5 text-[10px] bg-red-600 text-white rounded hover:bg-red-700">Yes</button>
                                                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                                        className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200">No</button>
                                                </div>
                                            ) : (p.isDeleted ?

                                                <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[10px] font-medium cursor-not-allowed">
                                                    <Trash2 size={10} />
                                                    Deleted
                                                </span>
                                                :
                                                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p._id); }}
                                                    className="ml-auto p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right — Edit form */}
                <div className="flex-1 min-w-0">
                    {!selected ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-gray-200 rounded-xl bg-white">
                            <CreditCard size={40} className="text-gray-200 mb-3" />
                            <p className="text-gray-500 font-medium">Select a profile to edit</p>
                            <p className="text-gray-400 text-sm mt-1">or create a new payment profile</p>
                            <button onClick={startNew}
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                                <Plus size={14} /> New Profile
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-700">
                                    {selected === "new" ? "New Payment Profile" : `Editing: ${activeProfile?.name || ""}`}
                                </p>
                                <button onClick={() => { setSelected(null); setForm(emptyProfile()); }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Company Info */}
                            <Section title="Company Information" icon={Building2}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Profile Name <span className="text-red-500">*</span></label>
                                        <input className={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Main Profile" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Company Name <span className="text-red-500">*</span></label>
                                        <input className={inp} value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Legal company name" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Tagline</label>
                                        <input className={inp} value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="#TeamDigiCoders" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Validity (days)</label>
                                        <input type="number" min={1} className={inp} value={form.validityDays}
                                            onChange={e => set("validityDays", parseInt(e.target.value, 10) || 30)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="flex text-xs font-medium text-gray-500 mb-1 items-center gap-1"><Phone size={11} /> Phone</label>
                                        <input className={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
                                    </div>
                                    <div>
                                        <label className="flex text-xs font-medium text-gray-500 mb-1 items-center gap-1"><Mail size={11} /> Email</label>
                                        <input type="email" className={inp} value={form.email} onChange={e => set("email", e.target.value)} placeholder="info@company.com" />
                                    </div>
                                    <div>
                                        <label className="flex text-xs font-medium text-gray-500 mb-1 items-center gap-1"><Globe size={11} /> Website</label>
                                        <input className={inp} value={form.website} onChange={e => set("website", e.target.value)} placeholder="www.company.com" />
                                    </div>
                                </div>
                                <div>
                                    <label className="flex text-xs font-medium text-gray-500 mb-1 items-center gap-1"><MapPin size={11} /> Address</label>
                                    <textarea className={ta} rows={2} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full company address" />
                                </div>
                            </Section>

                            {/* Payment Details */}
                            <Section title="Payment & Bank Details" icon={CreditCard}>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Bank / UPI / Account Details</label>
                                    <textarea className={`${ta} font-mono text-xs`} rows={4} value={form.paymentBankDetails}
                                        onChange={e => set("paymentBankDetails", e.target.value)}
                                        placeholder={"Bank: HDFC Bank\nAccount: 1234567890\nIFSC: HDFC0001234\nUPI: company@upi"} />
                                    <p className="text-[10px] text-gray-400 mt-1">This appears in the payment section of every quote PDF</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Payment Terms (installments)</label>
                                    <textarea className={`${ta} font-mono text-xs`} rows={4} value={form.paymentTerms}
                                        onChange={e => set("paymentTerms", e.target.value)}
                                        placeholder={"• 40% advance to start\n• 30% at 50% completion\n• 30% on final delivery"} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Development Timeline</label>
                                        <textarea className={ta} rows={2} value={form.paymentTimeline}
                                            onChange={e => set("paymentTimeline", e.target.value)}
                                            placeholder="e.g. 20–25 working days" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">GST Note</label>
                                        <textarea className={ta} rows={2} value={form.gstNote}
                                            onChange={e => set("gstNote", e.target.value)}
                                            placeholder="18% GST excluded unless specified" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Additional Notes</label>
                                    <textarea className={ta} rows={2} value={form.paymentOtherNotes}
                                        onChange={e => set("paymentOtherNotes", e.target.value)}
                                        placeholder="Any other terms or conditions…" />
                                </div>
                            </Section>

                            {/* Logo & QR */}
                            <Section title="Logo & Payment QR Code" icon={QrCode}>
                                {selected === "new" ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                        Save the profile first, then upload logo and payment QR code.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Logo */}
                                        <div className="p-4 border border-gray-200 rounded-xl space-y-3 bg-gray-50/50">
                                            <p className="text-xs font-semibold text-gray-700">Company Logo</p>
                                            <div className="flex items-center justify-center h-24 bg-white border border-dashed border-gray-200 rounded-lg">
                                                {form.logoUrl ? (
                                                    <img src={form.logoUrl} alt="Logo" className="max-h-20 max-w-full object-contain" />
                                                ) : (
                                                    <div className="text-center text-gray-300">
                                                        <Building2 size={28} className="mx-auto mb-1" />
                                                        <p className="text-xs">No logo</p>
                                                    </div>
                                                )}
                                            </div>
                                            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                                            <button onClick={() => logoRef.current?.click()}
                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-white transition-colors">
                                                <Upload size={12} /> {form.logoUrl ? "Replace Logo" : "Upload Logo"}
                                            </button>
                                        </div>

                                        {/* Payment QR */}
                                        <div className="p-4 border border-gray-200 rounded-xl space-y-3 bg-gray-50/50">
                                            <p className="text-xs font-semibold text-gray-700">Payment QR Code</p>
                                            <div className="flex items-center justify-center h-24 bg-white border border-dashed border-gray-200 rounded-lg">
                                                {form.paymentQrUrl ? (
                                                    <img src={form.paymentQrUrl} alt="Payment QR" className="max-h-20 max-w-full object-contain" />
                                                ) : (
                                                    <div className="text-center text-gray-300">
                                                        <QrCode size={28} className="mx-auto mb-1" />
                                                        <p className="text-xs">No QR code</p>
                                                    </div>
                                                )}
                                            </div>
                                            <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={handleQr} />
                                            <button onClick={() => qrRef.current?.click()}
                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-white transition-colors">
                                                <Upload size={12} /> {form.paymentQrUrl ? "Replace QR" : "Upload QR Code"}
                                            </button>
                                            {form.paymentQrUrl && (
                                                <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> QR code is set — will appear on quote PDFs
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Section>

                            {/* Default toggle */}
                            <label className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl cursor-pointer hover:bg-amber-100/50 transition-colors">
                                <input type="checkbox" checked={form.isDefault} onChange={e => set("isDefault", e.target.checked)}
                                    className="w-4 h-4 accent-amber-500" />
                                <Star size={15} className={form.isDefault ? "text-amber-500 fill-amber-500" : "text-gray-400"} />
                                <div>
                                    <p className="text-sm font-medium text-gray-800">Set as default profile</p>
                                    <p className="text-xs text-gray-500">New quotes will use this profile's branding automatically</p>
                                </div>
                            </label>

                            {/* Save */}
                            <div className="flex justify-end gap-2 pt-1">
                                <button onClick={() => { setSelected(null); setForm(emptyProfile()); }}
                                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                                    Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60 transition-colors">
                                    <Save size={14} /> {saving ? "Saving…" : "Save Profile"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
