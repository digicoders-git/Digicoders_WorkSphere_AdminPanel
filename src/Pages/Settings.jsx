import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
    Building2, ShieldCheck, Users, Pencil, X, Check,
    Upload, Globe, MapPin, Calendar, User, ArrowRight
} from "lucide-react";
import { toast } from "react-toastify";
import { useStore } from "../context/StoreContext";
import { fetchCompanyById, updateCompany, uploadCompanyIcon } from "../modules/company/services/companyService";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Company Profile Tab ──────────────────────────────────────────────────────
const CompanyProfileTab = ({ user }) => {
    const companyId = user?.companyId?._id || user?.companyId;
    const isAdmin   = ["admin", "super_admin"].includes(user?.role?.name);

    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving,  setSaving]  = useState(false);
    const [form, setForm]       = useState({ name: "", address: "", domain: "" });
    const iconRef = useRef(null);

    const load = async () => {
        try {
            setLoading(true);
            const res = await fetchCompanyById(companyId);
            setCompany(res.company);
            setForm({ name: res.company.name, address: res.company.address || "", domain: res.company.domain || "" });
        } catch { toast.error("Failed to load company profile"); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (companyId) load(); }, [companyId]);

    const handleSave = async () => {
        if (!form.name.trim())    return toast.error("Company name is required");
        if (!form.address.trim()) return toast.error("Address is required");
        try {
            setSaving(true);
            const res = await updateCompany(companyId, { name: form.name.trim(), address: form.address.trim(), domain: form.domain.trim() });
            setCompany(res.company);
            setEditing(false);
            toast.success("Company profile updated");
        } catch (err) { toast.error(err?.message || "Failed to update"); }
        finally { setSaving(false); }
    };

    const handleIconUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try { await uploadCompanyIcon(companyId, file); toast.success("Logo updated"); load(); }
        catch { toast.error("Failed to upload logo"); }
        e.target.value = "";
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!company) return <p className="text-center text-gray-400 py-16">Company not found.</p>;

    return (
        <div className="max-w-2xl space-y-6">
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="px-6 pb-6">
                    <div className="flex items-end justify-between -mt-10 mb-4">
                        {/* Logo */}
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
                                {company.icon?.url
                                    ? <img src={company.icon.url} alt="logo" className="w-full h-full object-cover" />
                                    : <Building2 size={32} className="text-blue-400" />}
                            </div>
                            {isAdmin && (
                                <button onClick={() => iconRef.current?.click()}
                                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow"
                                    title="Change logo">
                                    <Upload size={11} />
                                </button>
                            )}
                            <input ref={iconRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                        </div>

                        {/* Edit / Save buttons */}
                        {isAdmin && (
                            <div className="flex gap-2">
                                {editing ? (
                                    <>
                                        <button onClick={() => { setEditing(false); setForm({ name: company.name, address: company.address || "", domain: company.domain || "" }); }}
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
                                        <Pencil size={12} /> Edit
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Company name */}
                    {editing
                        ? <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent w-full mb-1" />
                        : <h2 className="text-xl font-bold text-gray-900">{company.name}</h2>
                    }
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium border mt-1 ${company.status ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-500 border-red-200"}`}>
                        {company.status ? "Active" : "Inactive"}
                    </span>
                </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Company Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                            <MapPin size={11} /> Address
                        </label>
                        {editing
                            ? <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" className={inp} />
                            : <p className="text-sm text-gray-800">{company.address || <span className="text-gray-300">—</span>}</p>
                        }
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                            <Globe size={11} /> Domain
                        </label>
                        {editing
                            ? <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="e.g. acme.com" className={inp} />
                            : <p className="text-sm text-gray-800">{company.domain || <span className="text-gray-300">—</span>}</p>
                        }
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                            <Calendar size={11} /> Created
                        </label>
                        <p className="text-sm text-gray-800">{fmtDate(company.createdAt)}</p>
                    </div>
                    {company.createdBy && (
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                <User size={11} /> Created By
                            </label>
                            <p className="text-sm text-gray-800">{company.createdBy.firstName} {company.createdBy.lastName}</p>
                        </div>
                    )}
                </div>
            </div>

            {!isAdmin && (
                <p className="text-center text-xs text-gray-400">Only admins can edit the company profile.</p>
            )}
        </div>
    );
};

// ─── Settings page ────────────────────────────────────────────────────────────
const QUICK_LINKS = [
    {
        title: "Role Management",
        description: "Create and manage roles with fine-grained permission control.",
        path: "/settings/roles",
        icon: ShieldCheck,
        color: "bg-green-50 text-green-600",
        perms: ["VIEW_ROLE", "VIEW_ALL_ROLES"],
    },
    {
        title: "User Management",
        description: "Add, edit, and manage employee accounts and access.",
        path: "/settings/user",
        icon: Users,
        color: "bg-purple-50 text-purple-600",
        perms: ["VIEW_USER", "VIEW_ALL_USERS"],
    },
    {
        title: "Company Management",
        description: "Manage all registered companies and their admins.",
        path: "/settings/companies",
        icon: Building2,
        color: "bg-blue-50 text-blue-600",
        superAdminOnly: true,
    },
];

const TABS = [
    { id: "company",  label: "Company Profile" },
    { id: "links",    label: "Quick Links" },
];

const Settings = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const canSee = (perms) => isSuperAdmin || !perms.length || perms.some(p => permissions.includes(p));

    const [tab, setTab] = useState("company");

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your organisation's configuration.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-6 shadow-sm">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-2 text-sm rounded-lg font-medium transition ${tab === t.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === "company" && <CompanyProfileTab user={user} />}

            {tab === "links" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {QUICK_LINKS.filter(o => o.superAdminOnly ? isSuperAdmin : canSee(o.perms)).map(opt => (
                        <Link key={opt.path} to={opt.path}
                            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-blue-200 transition group flex flex-col gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${opt.color}`}>
                                <opt.icon size={22} />
                            </div>
                            <div className="flex-1">
                                <h2 className="font-semibold text-gray-800 group-hover:text-blue-600 transition">{opt.title}</h2>
                                <p className="text-sm text-gray-500 mt-1">{opt.description}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                                Manage <ArrowRight size={13} />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Settings;
