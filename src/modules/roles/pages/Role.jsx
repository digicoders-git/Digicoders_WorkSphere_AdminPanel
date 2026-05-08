import React, { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, X, Search, Check } from "lucide-react";
import { fetchRoles, createRole, updateRole, deleteRole, fetchPermissionGroups } from "../service/RoleService";
import { fetchAllCompaniesList } from "../../company/services/companyService";
import { useStore } from "../../../context/StoreContext";
import { toast } from "react-toastify";

// ── Permission group colors ───────────────────────────────────────────────────
const GROUP_COLOR = {
    User:             "bg-blue-50 text-blue-700 border-blue-100",
    Role:             "bg-orange-50 text-orange-700 border-orange-100",
    Department:       "bg-green-50 text-green-700 border-green-100",
    WorkShift:        "bg-cyan-50 text-cyan-700 border-cyan-100",
    EmploymentStatus: "bg-purple-50 text-purple-700 border-purple-100",
    Attendance:       "bg-yellow-50 text-yellow-700 border-yellow-100",
    Leave:            "bg-rose-50 text-rose-700 border-rose-100",
    LeaveType:        "bg-pink-50 text-pink-700 border-pink-100",
    Holiday:          "bg-teal-50 text-teal-700 border-teal-100",
    Payroll:          "bg-emerald-50 text-emerald-700 border-emerald-100",
    Project:          "bg-indigo-50 text-indigo-700 border-indigo-100",
    Task:             "bg-violet-50 text-violet-700 border-violet-100",
    Lead:             "bg-lime-50 text-lime-700 border-lime-100",
};

const formatLabel = (perm) =>
    perm.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ── Role Drawer ───────────────────────────────────────────────────────────────
const RoleDrawer = ({ isOpen, onClose, initial, companies, isSuperAdmin, permissionGroups, onSubmit, loading }) => {
    const [name, setName] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName(initial?.name || "");
            setCompanyId(initial?.companyId?._id || initial?.companyId || "");
            setSelected(initial?.permissions || []);
            setSearch("");
        }
    }, [isOpen, initial]);

    const toggle = (perm) => setSelected(p => p.includes(perm) ? p.filter(x => x !== perm) : [...p, perm]);

    const toggleGroup = (perms) => {
        const allOn = perms.every(p => selected.includes(p));
        if (allOn) setSelected(prev => prev.filter(p => !perms.includes(p)));
        else setSelected(prev => [...new Set([...prev, ...perms])]);
    };

    const selectAll = () => setSelected(permissionGroups.flatMap(g => g.permissions));
    const clearAll = () => setSelected([]);

    const filteredGroups = permissionGroups.map(g => ({
        ...g,
        permissions: g.permissions.filter(p =>
            !search || p.toLowerCase().includes(search.toLowerCase()) || g.module.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(g => g.permissions.length > 0);

    const handleSubmit = () => {
        if (!name.trim()) return toast.error("Role name is required");
        if (isSuperAdmin && !companyId) return toast.error("Please select a company");
        onSubmit({ name, companyId, permissions: selected });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-xl bg-white h-full flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{initial ? "Edit Role" : "Add Role"}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Configure role name and permissions</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 no-scrollbar">

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Role Name</label>
                        <input
                            value={name} onChange={e => setName(e.target.value)}
                            placeholder="e.g. HR Manager"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Company (super_admin only) */}
                    {isSuperAdmin && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Company</label>
                            <select value={companyId} onChange={e => setCompanyId(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                <option value="">Select company</option>
                                {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Permissions */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Permissions
                                <span className="ml-2 bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {selected.length} selected
                                </span>
                            </label>
                            <div className="flex gap-2">
                                <button type="button" onClick={selectAll}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">Select All</button>
                                <span className="text-gray-300">|</span>
                                <button type="button" onClick={clearAll}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium">Clear All</button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search permissions..."
                                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Groups */}
                        <div className="space-y-3">
                            {filteredGroups.map(group => {
                                const allOn = group.permissions.every(p => selected.includes(p));
                                const someOn = group.permissions.some(p => selected.includes(p));
                                const colorCls = GROUP_COLOR[group.module] || "bg-gray-50 text-gray-700 border-gray-100";

                                return (
                                    <div key={group.module} className={`border rounded-xl overflow-hidden ${colorCls.split(" ")[2] || "border-gray-100"}`}>
                                        {/* Group header */}
                                        <div className={`flex items-center justify-between px-4 py-2.5 ${colorCls.split(" ")[0]} border-b ${colorCls.split(" ")[2]}`}>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => toggleGroup(group.permissions)}
                                                    className={`w-4 h-4 rounded border flex items-center justify-center transition ${allOn ? "bg-blue-600 border-blue-600" : someOn ? "bg-blue-200 border-blue-400" : "bg-white border-gray-300"}`}>
                                                    {(allOn || someOn) && <Check size={10} className="text-white" />}
                                                </button>
                                                <span className={`text-xs font-semibold ${colorCls.split(" ")[1]}`}>{group.module}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400">{group.permissions.filter(p => selected.includes(p)).length}/{group.permissions.length}</span>
                                        </div>

                                        {/* Permissions grid */}
                                        <div className="grid grid-cols-2 gap-1 p-3 bg-white">
                                            {group.permissions.map(perm => {
                                                const on = selected.includes(perm);
                                                return (
                                                    <label key={perm} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition text-xs ${on ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                                                        <div onClick={() => toggle(perm)}
                                                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${on ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}>
                                                            {on && <Check size={10} className="text-white" />}
                                                        </div>
                                                        <span className={`truncate ${on ? "text-blue-700 font-medium" : "text-gray-600"}`}>
                                                            {formatLabel(perm)}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {loading ? "Saving..." : initial ? "Update Role" : "Create Role"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Role Page ────────────────────────────────────────────────────────────
const Role = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const hasPermission = (perm) => permissions.includes(perm);
    const isSuperAdmin = user?.role?.name === "super_admin";

    const [roles, setRoles] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [permissionGroups, setPermissionGroups] = useState([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadRoles = async () => {
        try { const data = await fetchRoles(); setRoles(data.data || []); }
        catch (err) { console.error(err); }
    };

    const loadPermissions = async () => {
        try {
            const res = await fetchPermissionGroups();
            setPermissionGroups(Object.entries(res.data).map(([module, perms]) => ({
                module,
                permissions: Object.values(perms),
            })));
        } catch (err) { console.error(err); }
    };

    const loadCompanies = async () => {
        try { const data = await fetchAllCompaniesList(); setCompanies(data.companies || []); }
        catch (err) { console.error(err); }
    };

    useEffect(() => {
        loadRoles();
        loadPermissions();
        if (isSuperAdmin) loadCompanies();
        else if (user?.company) setCompanies([{ _id: user.company, name: "Your Company" }]);
    }, [user]);

    const handleCreate = async (data) => {
        if (!hasPermission("Create_ROLE")) return;
        try {
            setLoading(true);
            if (!isSuperAdmin) data.companyId = user.company;
            await createRole(data); loadRoles(); setOpen(false);
            toast.success("Role created successfully");
        } catch (err) { toast.error(err?.message || "Failed to create role"); }
        finally { setLoading(false); }
    };

    const handleUpdate = async (data) => {
        if (!hasPermission("UPDATE_ROLE")) return;
        try {
            setLoading(true);
            await updateRole(selected._id, data); loadRoles(); setOpen(false);
            toast.success("Role updated successfully");
        } catch (err) { toast.error(err?.message || "Failed to update role"); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!hasPermission("DELETE_ROLE")) return;
        try { await deleteRole(id); loadRoles(); toast.success("Role deleted"); }
        catch (err) { toast.error("Failed to delete role"); }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage roles and their permissions.</p>
                </div>
                {hasPermission("Create_ROLE") && (
                    <button onClick={() => { setSelected(null); setOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                        <Plus size={16} /> Add Role
                    </button>
                )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Role</th>
                            <th className="px-4 py-3 text-left">Permissions</th>
                            <th className="px-4 py-3 text-left">Created By</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {roles.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No roles found.</td></tr>
                        ) : roles.map((role) => (
                            <tr key={role._id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                            <ShieldCheck size={16} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{role.name}</p>
                                            {role.companyId?.name && <p className="text-xs text-gray-400">{role.companyId.name}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                        {role.permissions?.slice(0, 3).map((p) => (
                                            <span key={p} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{formatLabel(p)}</span>
                                        ))}
                                        {role.permissions?.length > 3 && (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">+{role.permissions.length - 3} more</span>
                                        )}
                                        {(!role.permissions || role.permissions.length === 0) && (
                                            <span className="text-xs text-gray-400">No permissions</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-xs">
                                    <div>
                                        <p className="font-medium text-gray-700">
                                            {role.createdBy ? `${role.createdBy.firstName} ${role.createdBy.lastName}` : "System"}
                                        </p>
                                        <p className="text-gray-400">
                                            {role.createdAt ? new Date(role.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                        </p>
                                        {role.updatedBy && <p className="text-gray-400 mt-0.5">Upd: {role.updatedBy.firstName} {role.updatedBy.lastName}</p>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${role.status ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                                        {role.status ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        {hasPermission("UPDATE_ROLE") && (
                                            <button onClick={() => { setSelected(role); setOpen(true); }}
                                                className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition">
                                                <Pencil size={15} />
                                            </button>
                                        )}
                                        {hasPermission("DELETE_ROLE") && (
                                            <button onClick={() => handleDelete(role._id)}
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

            <RoleDrawer
                isOpen={open}
                onClose={() => { setOpen(false); setSelected(null); }}
                initial={selected}
                companies={companies}
                isSuperAdmin={isSuperAdmin}
                permissionGroups={permissionGroups}
                onSubmit={selected ? handleUpdate : handleCreate}
                loading={loading}
            />
        </div>
    );
};

export default Role;
