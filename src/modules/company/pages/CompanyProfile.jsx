import { useState, useEffect, useRef } from "react";
import { Building2, Pencil, X, Check, Upload, Globe, MapPin, Calendar, User } from "lucide-react";
import { toast } from "react-toastify";
import { useStore } from "../../../context/StoreContext";
import { fetchCompanyById, updateCompany, uploadCompanyIcon } from "../services/companyService";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const CompanyProfile = () => {
    const { user, setUser } = useStore();
    const companyId = user?.companyId?._id || user?.companyId;
    const isAdmin = ["admin", "super_admin"].includes(user?.role?.name);

    const [company, setCompany]   = useState(null);
    const [loading, setLoading]   = useState(true);
    const [editing, setEditing]   = useState(false);
    const [saving, setSaving]     = useState(false);
    const [form, setForm]         = useState({ name: "", address: "", domain: "" });
    const iconRef = useRef(null);

    const load = async () => {
        try {
            setLoading(true);
            const res = await fetchCompanyById(companyId);
            setCompany(res.company);
            setForm({ name: res.company.name, address: res.company.address, domain: res.company.domain || "" });
        } catch { toast.error("Failed to load company profile"); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (companyId) load(); }, [companyId]);

    const handleSave = async () => {
        if (!form.name.trim()) return toast.error("Company name is required");
        if (!form.address.trim()) return toast.error("Address is required");
        try {
            setSaving(true);
            const res = await updateCompany(companyId, { name: form.name.trim(), address: form.address.trim(), domain: form.domain.trim() });
            setCompany(res.company);
            setEditing(false);
            toast.success("Company profile updated");
        } catch (err) {
            toast.error(err?.message || "Failed to update");
        } finally { setSaving(false); }
    };

    const handleIconUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadCompanyIcon(companyId, file);
            toast.success("Logo updated");
            load();
        } catch { toast.error("Failed to upload logo"); }
        e.target.value = "";
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!company) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <p className="text-gray-400">Company not found</p>
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Banner */}
                    <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-600" />

                    <div className="px-6 pb-6">
                        {/* Logo + actions row */}
                        <div className="flex items-end justify-between -mt-10 mb-4">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
                                    {company.icon?.url
                                        ? <img src={company.icon.url} alt="logo" className="w-full h-full object-cover" />
                                        : <Building2 size={32} className="text-blue-400" />}
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => iconRef.current?.click()}
                                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow"
                                        title="Change logo"
                                    >
                                        <Upload size={11} />
                                    </button>
                                )}
                                <input ref={iconRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                            </div>

                            {isAdmin && (
                                <div className="flex gap-2">
                                    {editing ? (
                                        <>
                                            <button onClick={() => { setEditing(false); setForm({ name: company.name, address: company.address, domain: company.domain || "" }); }}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                                                <X size={12} /> Cancel
                                            </button>
                                            <button onClick={handleSave} disabled={saving}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                                                <Check size={12} /> {saving ? "Saving…" : "Save"}
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => setEditing(true)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium">
                                            <Pencil size={12} /> Edit Profile
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Name + status */}
                        {editing ? (
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent w-full mb-1" />
                        ) : (
                            <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
                        )}
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium border mt-1 ${company.status ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-500 border-red-200"}`}>
                            {company.status ? "Active" : "Inactive"}
                        </span>
                    </div>
                </div>

                {/* Details card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Company Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                        {/* Address */}
                        <div className="sm:col-span-2">
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                <MapPin size={11} /> Address
                            </label>
                            {editing ? (
                                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                    placeholder="Full address" className={inp} />
                            ) : (
                                <p className="text-sm text-gray-800">{company.address || <span className="text-gray-300">—</span>}</p>
                            )}
                        </div>

                        {/* Domain */}
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                <Globe size={11} /> Domain
                            </label>
                            {editing ? (
                                <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                                    placeholder="e.g. acme.com" className={inp} />
                            ) : (
                                <p className="text-sm text-gray-800">{company.domain || <span className="text-gray-300">—</span>}</p>
                            )}
                        </div>

                        {/* Created */}
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                <Calendar size={11} /> Created
                            </label>
                            <p className="text-sm text-gray-800">{fmtDate(company.createdAt)}</p>
                        </div>

                        {/* Created by */}
                        {company.createdBy && (
                            <div>
                                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                    <User size={11} /> Created By
                                </label>
                                <p className="text-sm text-gray-800">{company.createdBy.firstName} {company.createdBy.lastName}</p>
                            </div>
                        )}

                        {/* Last updated */}
                        {company.updatedAt && (
                            <div>
                                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                    <Calendar size={11} /> Last Updated
                                </label>
                                <p className="text-sm text-gray-800">{fmtDate(company.updatedAt)}</p>
                            </div>
                        )}
                    </div>
                </div>

               
            </div>
        </div>
    );
};

export default CompanyProfile;
