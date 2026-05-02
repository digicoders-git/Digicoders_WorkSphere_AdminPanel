import React, { useEffect, useRef, useState } from "react";
import CrudModal from "../../../Components/CrudModal";
import { Plus, Pencil, Trash2, Building2, ToggleLeft, ToggleRight, Upload } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import {
    fetchAllCompaniesForSuperAdmin, createCompanyWithAdmin,
    updateCompany, deleteCompany, toggleCompanyStatus, uploadCompanyIcon,
} from "../services/companyService";

const Company = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const hasPermission = (perm) => permissions.includes(perm);

    const [companies, setCompanies] = useState([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const iconInputRef = useRef(null);
    const [iconUploadId, setIconUploadId] = useState(null);

    const loadCompanies = async () => {
        try {
            const data = await fetchAllCompaniesForSuperAdmin();
            setCompanies(data.companies || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { loadCompanies(); }, []);

    const fields = [
        { name: "companyName", label: "Company Name", type: "text" },
        { name: "companyAddress", label: "Address", type: "text" },
        { name: "companyDomain", label: "Domain", type: "text" },
        { name: "adminFirstName", label: "Admin First Name", type: "text" },
        { name: "adminLastName", label: "Admin Last Name", type: "text" },
        { name: "adminEmail", label: "Admin Email", type: "email" },
        { name: "adminPhone", label: "Admin Phone", type: "text" },
        { name: "adminPassword", label: "Admin Password", type: "password" },
    ];

    const getInitialData = (c) => {
        if (!c) return null;
        const admin = c.admins?.[0] || {};
        return {
            companyName: c.name || "", companyAddress: c.address || "", companyDomain: c.domain || "",
            adminFirstName: admin.firstName || "", adminLastName: admin.lastName || "",
            adminEmail: admin.email || "", adminPhone: admin.phone || "", adminPassword: "",
        };
    };

    const handleCreate = async (data) => {
        if (!hasPermission("Create_COMPANY")) return;
        try { setLoading(true); await createCompanyWithAdmin(data); loadCompanies(); setOpen(false); }
        catch (err) { loadCompanies(); setOpen(false); }
        finally { setLoading(false); }
    };

    const handleUpdate = async (data) => {
        if (!hasPermission("UPDATE_COMPANY")) return;
        try { setLoading(true); await updateCompany(selected._id, data); loadCompanies(); setOpen(false); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!hasPermission("DELETE_COMPANY")) return;
        try { await deleteCompany(id); loadCompanies(); } catch (err) { console.error(err); }
    };

    const handleToggle = async (id) => {
        if (!hasPermission("UPDATE_COMPANY")) return;
        try { await toggleCompanyStatus(id); loadCompanies(); } catch (err) { console.error(err); }
    };

    const handleIconUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !iconUploadId) return;
        try {
            await uploadCompanyIcon(iconUploadId, file);
            loadCompanies();
        } catch (err) { console.error(err); }
        e.target.value = "";
        setIconUploadId(null);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage all registered companies and their admins.</p>
                </div>
                {hasPermission("Create_COMPANY") && (
                    <button
                        onClick={() => { setSelected(null); setOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                        <Plus size={16} /> Add Company
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Company</th>
                            <th className="px-4 py-3 text-left">Domain</th>
                            <th className="px-4 py-3 text-left">Admin</th>
                            <th className="px-4 py-3 text-left">Created By</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {companies.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No companies found.</td></tr>
                        ) : companies.map((c) => (
                            <tr key={c._id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
                                            {c.icon?.url
                                                ? <img src={c.icon.url} alt={c.name} className="w-full h-full object-cover" />
                                                : <Building2 size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{c.name}</p>
                                            <p className="text-xs text-gray-400">{c.address}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{c.domain || "—"}</td>
                                <td className="px-4 py-3">
                                    {c.admins?.length ? c.admins.map((a) => (
                                        <div key={a._id}>
                                            <p className="text-gray-700">{a.firstName} {a.lastName}</p>
                                            <p className="text-xs text-gray-400">{a.email}</p>
                                        </div>
                                    )) : "—"}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                    <div>
                                        <p className="font-medium text-gray-700">
                                            {c.createdBy ? `${c.createdBy.firstName} ${c.createdBy.lastName}` : "System"}
                                        </p>
                                        <p className="text-gray-400">
                                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                        </p>
                                        {c.updatedBy && <p className="text-gray-400 mt-0.5">Upd: {c.updatedBy.firstName} {c.updatedBy.lastName}</p>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${c.status ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                                        {c.status ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        {hasPermission("UPDATE_COMPANY") && (
                                            <>
                                                <button onClick={() => handleToggle(c._id)}
                                                    className={`p-2 rounded-lg text-xs transition ${c.status ? "bg-red-50 hover:bg-red-100 text-red-500" : "bg-green-50 hover:bg-green-100 text-green-600"}`}
                                                    title={c.status ? "Deactivate" : "Activate"}>
                                                    {c.status ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                </button>
                                                <button onClick={() => { setSelected(c); setOpen(true); }}
                                                    className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition">
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => { setIconUploadId(c._id); iconInputRef.current?.click(); }}
                                                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                                                    title="Upload Icon">
                                                    <Upload size={15} />
                                                </button>
                                            </>
                                        )}
                                        {hasPermission("DELETE_COMPANY") && (
                                            <button onClick={() => handleDelete(c._id)}
                                                className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
            <CrudModal
                isOpen={open} onClose={() => setOpen(false)}
                title={selected ? "Edit Company" : "Add Company with Admin"}
                fields={fields} initialData={getInitialData(selected)}
                onSubmit={selected ? handleUpdate : handleCreate}
                loading={loading}
            />
        </div>
    );
};

export default Company;
