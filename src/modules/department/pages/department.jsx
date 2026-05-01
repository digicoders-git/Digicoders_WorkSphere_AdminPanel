import React, { useEffect, useState } from "react";
import CrudModal from "../../../Components/CrudModal";
import { Plus, Pencil, Trash2, FolderKanban, ToggleLeft, ToggleRight } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { getAllCompanyDepartments, createDepartment, updateDepartment, deleteDepartment, toggleDepartmentStatus } from "../services/departmentService";
import { fetchAllCompaniesList } from "../../company/services/companyService";

const Department = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const hasPermission = (perm) => permissions.includes(perm);

    const [departments, setDepartments] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadDepartments = async () => {
        try {
            setLoading(true);
            const res = await getAllCompanyDepartments();
            setDepartments(res?.departments || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadCompanies = async () => {
        try {
            const data = await fetchAllCompaniesList();
            setCompanies(data.companies || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { loadDepartments(); loadCompanies(); }, []);

    const fields = [
        {
            name: "companyId", label: "Company", type: "select", required: true,
            options: companies.map((c) => ({ label: c.name, value: c._id })),
        },
        { name: "name", label: "Department Name", type: "text" },
        { name: "description", label: "Description", type: "text" },
    ];

    const getInitialData = (dept) => {
        if (!dept) return { companyId: user.companyId?._id || "" };
        return { companyId: dept.companyId?._id || user.companyId?._id || "", name: dept.name, description: dept.description };
    };

    const handleCreate = async (data) => {
        if (!hasPermission("Create_DEPARTMENT")) return;
        try { setLoading(true); await createDepartment(data); await loadDepartments(); setOpen(false); }
        catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleUpdate = async (data) => {
        if (!hasPermission("UPDATE_DEPARTMENT")) return;
        try { setLoading(true); await updateDepartment(selected._id, data); await loadDepartments(); setOpen(false); }
        catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!hasPermission("DELETE_DEPARTMENT")) return;
        try { await deleteDepartment(id); loadDepartments(); } catch (err) { console.error(err); }
    };

    const handleToggle = async (id) => {
        if (!hasPermission("UPDATE_DEPARTMENT")) return;
        try { await toggleDepartmentStatus(id); loadDepartments(); } catch (err) { console.error(err); }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage departments across your organization.</p>
                </div>
                {hasPermission("Create_DEPARTMENT") && (
                    <button
                        onClick={() => { setSelected(null); setOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                        <Plus size={16} /> Add Department
                    </button>
                )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Department</th>
                            <th className="px-4 py-3 text-left">Company</th>
                            <th className="px-4 py-3 text-left">Description</th>
                            <th className="px-4 py-3 text-left">Created By</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!loading && departments.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No departments found.</td></tr>
                        ) : departments.map((dept) => (
                            <tr key={dept._id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                            <FolderKanban size={16} />
                                        </div>
                                        <p className="font-medium text-gray-800">{dept.name}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{dept.companyId?.name || "—"}</td>
                                <td className="px-4 py-3 text-gray-500">{dept.description || "—"}</td>
                                <td className="px-4 py-3 text-xs">
                                    <div>
                                        <p className="font-medium text-gray-700">
                                            {dept.createdBy ? `${dept.createdBy.firstName} ${dept.createdBy.lastName}` : "System"}
                                        </p>
                                        <p className="text-gray-400">
                                            {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                        </p>
                                        {dept.updatedBy && <p className="text-gray-400 mt-0.5">Upd: {dept.updatedBy.firstName} {dept.updatedBy.lastName}</p>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${dept.status ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                                        {dept.status ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        {hasPermission("UPDATE_DEPARTMENT") && (
                                            <>
                                                <button onClick={() => handleToggle(dept._id)}
                                                    className={`p-2 rounded-lg transition ${dept.status ? "bg-red-50 hover:bg-red-100 text-red-500" : "bg-green-50 hover:bg-green-100 text-green-600"}`}
                                                    title={dept.status ? "Deactivate" : "Activate"}>
                                                    {dept.status ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                </button>
                                                <button onClick={() => { setSelected(dept); setOpen(true); }}
                                                    className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition">
                                                    <Pencil size={15} />
                                                </button>
                                            </>
                                        )}
                                        {hasPermission("DELETE_DEPARTMENT") && (
                                            <button onClick={() => handleDelete(dept._id)}
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

            <CrudModal
                isOpen={open} onClose={() => setOpen(false)}
                title={selected ? "Edit Department" : "Add Department"}
                fields={fields} initialData={getInitialData(selected)}
                onSubmit={selected ? handleUpdate : handleCreate}
                loading={loading}
            />
        </div>
    );
};

export default Department;
