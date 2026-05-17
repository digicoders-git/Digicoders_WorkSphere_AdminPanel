import React, { useEffect, useState } from "react";
import EmployeeDrawer from "../components/EmployeeDrawer"
import { Plus, Pencil, Users, Building2, ShieldCheck, Search, X, ToggleLeft, ToggleRight, KeyRound, Eye, EyeOff } from "lucide-react";
import { fetchUsers, createUser, updateUser, toggleUserStatus } from "../services/UserService";
import { fetchRoles, getAllRolesForAdmin, getRolesByCompany } from "../../roles/service/RoleService";
import { useStore } from "../../../context/StoreContext";
import { fetchAllCompaniesList } from "../../company/services/companyService";
import { getShiftsByCompany } from "../../workshift/services/workShiftService";
import { getStatusesByCompany, getCompanyEmploymentStatuses } from "../../employmentStatus/services/employmentStatusService";
import { getDepartmentsByCompany } from "../../department/services/departmentService";
import { adminChangePassword } from "../../auth/services/authService";
import { toast } from "react-toastify";

const StatCard = ({ icon, label, value, iconBg, iconColor }) => (
    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const User = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const hasPermission = (perm) => permissions.includes(perm);

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [modalRoles, setModalRoles] = useState([]);
    const [modalShifts, setModalShifts] = useState([]);
    const [modalStatuses, setModalStatuses] = useState([]);
    const [modalCompanyUsers, setModalCompanyUsers] = useState([]);
    const [modalDepartments, setModalDepartments] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);

    // Change password modal
    const [pwModal, setPwModal] = useState(null); // userId
    const [newPw, setNewPw] = useState("");
    const [pwLoading, setPwLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const handleAdminChangePw = async (e) => {
        e.preventDefault();
        if (newPw.length < 6) return toast.error("Password must be at least 6 characters");
        try {
            setPwLoading(true);
            await adminChangePassword(pwModal, newPw);
            toast.success("Password changed successfully");
            setPwModal(null); setNewPw("");
        } catch (err) {
            toast.error(err?.message || "Failed to change password");
        } finally { setPwLoading(false); }
    };

    // Filter states
    const [search, setSearch] = useState("");
    const [filterCompany, setFilterCompany] = useState("");
    const [filterRole, setFilterRole] = useState("");

    const loadUsers = async () => {
        try {
            const res = await fetchUsers();
            setUsers(
                (res.users || []).map((u) => ({
                    ...u,
                    joiningDate: u.joiningDate?.split("T")[0] || "",
                    dateOfBirth: u.dateOfBirth?.split("T")[0] || "",
                }))
            );
        } catch (err) {
            console.error(err);
        }
    };

    const isSuperAdmin = user?.role?.name === "super_admin";

    const loadRoles = async () => {
        try {
            const res = isSuperAdmin ? await getAllRolesForAdmin() : await fetchRoles();
            setRoles(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const loadCompanies = async () => {
        try {
            const data = await fetchAllCompaniesList();
            setCompanies(data.companies || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadUsers();
        loadRoles();
        loadCompanies();
    }, []);

    // Derived filtered users
    const filteredUsers = users.filter((u) => {
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
        const matchSearch =
            !search ||
            fullName.includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.phone?.includes(search);
        const matchCompany = !filterCompany || u.companyId?._id === filterCompany;
        const matchRole = !filterRole || u.role?._id === filterRole;
        return matchSearch && matchCompany && matchRole;
    });

    const clearFilters = () => {
        setSearch("");
        setFilterCompany("");
        setFilterRole("");
    };

    const hasActiveFilters = search || filterCompany || filterRole;

    const handleCreate = async (data) => {
        if (!hasPermission("Create_USER")) return;
        try {
            setLoading(true);
            const res = await createUser(data);
            if (res.success) {
                toast.success(res.message || "Employee created successfully");
                loadUsers();
                setOpen(false);
            } else {
                const errorMsg = Array.isArray(res.errors) ? res.errors.join(", ") : res.message;
                toast.error(errorMsg || "Failed to create employee");
            }
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err?.message || "Failed to create employee";
            toast.error(errorMsg);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (data) => {
        if (!hasPermission("UPDATE_USER")) return;
        try {
            setLoading(true);
            const res = await updateUser(data);
            if (res.success) {
                toast.success(res.message || "Employee updated successfully");
                loadUsers();
                setOpen(false);
            } else {
                const errorMsg = Array.isArray(res.errors) ? res.errors.join(", ") : res.message;
                toast.error(errorMsg || "Failed to update employee");
            }
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err?.message || "Failed to update employee";
            toast.error(errorMsg);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = async (name, value, formData) => {
        if (name === "companyId") {
            try {
                const [rolesRes, shiftsRes, statusesRes, usersRes, deptsRes] = await Promise.all([
                    getRolesByCompany(value),
                    getShiftsByCompany(value),
                    getStatusesByCompany(value),
                    fetchUsers(),
                    getDepartmentsByCompany(value),
                ]);
                setModalRoles(rolesRes.data || []);
                setModalShifts(shiftsRes.data || []);
                setModalStatuses(statusesRes.employmentStatuses || []);
                setModalCompanyUsers((usersRes.users || []).filter(u => u.companyId?._id === value || u.companyId === value));
                setModalDepartments(deptsRes.departments || []);
                return { ...formData, companyId: value, role: "", workShift: "", reportingTo: "", employmentStatus: "", department: "" };
            } catch (err) {
                console.error(err);
            }
        }
        return { ...formData, [name]: value };
    };

    const handleToggleStatus = async (id) => {
        try {
            await toggleUserStatus(id);
            loadUsers();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage employees, companies, and roles.</p>
                </div>
                {hasPermission("Create_USER") && (
                    <button
                        onClick={() => { setSelected(null); setModalRoles([]); setModalShifts([]); setModalStatuses([]); setModalCompanyUsers([]); setModalDepartments([]); setOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                        <Plus size={16} /> Add Employee
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon={<Users size={20} />} label="Total Users" value={users.length} iconBg="bg-blue-100" iconColor="text-blue-600" />
                <StatCard icon={<Building2 size={20} />} label="Companies" value={companies.length} iconBg="bg-purple-100" iconColor="text-purple-600" />
                <StatCard icon={<ShieldCheck size={20} />} label="Roles" value={roles.length} iconBg="bg-green-100" iconColor="text-green-600" />
                <StatCard icon={<Users size={20} />} label="Active" value={users.filter((u) => u.isActive).length} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="">All Companies</option>
                    {companies.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                </select>

                {!isSuperAdmin && (
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="">All Roles</option>
                        {roles.map((r) => (
                            <option key={r._id} value={r._id}>{r.name}</option>
                        ))}
                    </select>
                )}

                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 px-2 py-2"
                    >
                        <X size={14} /> Clear
                    </button>
                )}

                <span className="ml-auto text-xs text-gray-400">{filteredUsers.length} result{filteredUsers.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Employee</th>
                            <th className="px-4 py-3 text-left">Company</th>
                            <th className="px-4 py-3 text-left">Role</th>
                            <th className="px-4 py-3 text-left">Contact</th>
                            <th className="px-4 py-3 text-left">Manager</th>
                            <th className="px-4 py-3 text-left">Emp. Status</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Created By</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                                    No employees found.
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((u) => (
                                <tr key={u._id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {u.profilePic?.url ? (
                                                <img src={u.profilePic.url} alt="profile" className="w-9 h-9 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                                                    {u.firstName?.[0]}{u.lastName?.[0]}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                                                <p className="text-xs text-gray-400">{u.employeeCode || "—"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{u.companyId?.name || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                            {u.role?.name || "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-gray-700">{u.email}</p>
                                        <p className="text-xs text-gray-400">{u.phone}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.reportingTo ? (
                                            <div className="flex items-center gap-2">
                                                {u.reportingTo.profilePic?.url
                                                    ? <img src={u.reportingTo.profilePic.url} className="w-6 h-6 rounded-full object-cover" alt="" />
                                                    : <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">{u.reportingTo.firstName?.[0]}{u.reportingTo.lastName?.[0]}</div>}
                                                <span className="text-xs text-gray-700">{u.reportingTo.firstName} {u.reportingTo.lastName}</span>
                                            </div>
                                        ) : <span className="text-xs text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.employmentStatus?.name
                                            ? <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700">{u.employmentStatus.name}</span>
                                            : <span className="text-xs text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                                            {u.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        <div>
                                            <p className="font-medium text-gray-700">
                                                {u.createdBy ? `${u.createdBy.firstName} ${u.createdBy.lastName}` : "System"}
                                            </p>
                                            <p className="text-gray-400">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                            </p>
                                            {u.updatedBy && (
                                                <p className="text-gray-400 mt-0.5">Upd: {u.updatedBy.firstName} {u.updatedBy.lastName}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {hasPermission("UPDATE_USER") && u.role?.name !== "super_admin" && (
                                                <>
                                                    <button
                                                        onClick={() => handleToggleStatus(u._id)}
                                                        title={u.isActive ? "Disable user" : "Enable user"}
                                                        className={`p-2 rounded-lg transition ${u.isActive ? "bg-red-50 hover:bg-red-100 text-red-500" : "bg-green-50 hover:bg-green-100 text-green-600"}`}
                                                    >
                                                        {u.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelected({ ...u, companyId: u.companyId?._id || "", role: u.role?._id || "", workShift: u.workShift?._id || u.workShift || "", reportingTo: u.reportingTo?._id || u.reportingTo || "", employmentStatus: u.employmentStatus?._id || u.employmentStatus || "", department: u.department?._id || u.department || "" });
                                                            const cid = u.companyId?._id;
                                                            Promise.all([
                                                                getRolesByCompany(cid),
                                                                getShiftsByCompany(cid),
                                                                getStatusesByCompany(cid),
                                                                fetchUsers(),
                                                                getDepartmentsByCompany(cid),
                                                            ]).then(([r, s, es, us, d]) => {
                                                                setModalRoles(r.data || []);
                                                                setModalShifts(s.data || []);
                                                                setModalStatuses(es.employmentStatuses || []);
                                                                setModalCompanyUsers((us.users || []).filter(x => x.companyId?._id === cid || x.companyId === cid));
                                                                setModalDepartments(d.departments || []);
                                                            });
                                                            setOpen(true);
                                                        }}
                                                        className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setPwModal(u._id); setNewPw(""); setShowPw(false); }}
                                                        title="Change password"
                                                        className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition"
                                                    >
                                                        <KeyRound size={15} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <EmployeeDrawer
                isOpen={open}
                onClose={() => setOpen(false)}
                initialData={selected}
                companies={companies}
                roles={modalRoles}
                shifts={modalShifts}
                employmentStatuses={modalStatuses}
                departments={modalDepartments}
                companyUsers={modalCompanyUsers}
                onSubmit={selected ? handleUpdate : handleCreate}
                onCompanyChange={handleFieldChange}
                loading={loading}
            />

            {/* Change Password Modal */}
            {pwModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">Change Password</h3>
                        <p className="text-xs text-gray-400 mb-4">Set a new password for this employee.</p>
                        <form onSubmit={handleAdminChangePw} className="space-y-4">
                            <div className="relative">
                                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPw ? "text" : "password"}
                                    value={newPw} onChange={e => setNewPw(e.target.value)}
                                    placeholder="New password (min. 6 chars)" required
                                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button type="button" onClick={() => setShowPw(p => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => { setPwModal(null); setNewPw(""); }}
                                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={pwLoading}
                                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                                    {pwLoading ? "Saving..." : "Change Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default User;
