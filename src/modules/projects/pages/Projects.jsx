import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderKanban, Pencil, Trash2, X, Users, Calendar, MessageSquare } from "lucide-react";
import { toast } from "react-toastify";
import { useStore } from "../../../context/StoreContext";
import { useNotifications } from "../../../context/NotificationContext";
import { getProjects, createProject, updateProject, deleteProject } from "../services/projectService";
import { fetchUsers } from "../../employee/services/UserService";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const STATUS_COLORS = {
    active: "bg-green-50 text-green-700 border-green-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
    on_hold: "bg-yellow-50 text-yellow-700 border-yellow-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
};

const EMPTY = { name: "", description: "", status: "active", startDate: "", endDate: "", members: [] };

const ProjectDrawer = ({ isOpen, onClose, initial, onSubmit, loading, users }) => {
    const [form, setForm] = useState(EMPTY);

    useEffect(() => {
        if (initial) {
            setForm({
                name: initial.name || "",
                description: initial.description || "",
                status: initial.status || "active",
                startDate: initial.startDate ? initial.startDate.slice(0, 10) : "",
                endDate: initial.endDate ? initial.endDate.slice(0, 10) : "",
                members: initial.members?.map(m => m._id || m) || [],
            });
        } else {
            setForm(EMPTY);
        }
    }, [isOpen, initial]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const toggleMember = (id) => {
        setForm(f => ({
            ...f,
            members: f.members.includes(id) ? f.members.filter(m => m !== id) : [...f.members, id],
        }));
    };

    const handleSubmit = () => {
        if (!form.name.trim()) return toast.error("Project name is required");
        onSubmit(form);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-gray-900">{initial ? "Edit Project" : "New Project"}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Project Name <span className="text-red-500">*</span></label>
                        <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Website Redesign" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                        <textarea value={form.description} onChange={e => set("description", e.target.value)}
                            rows={3} placeholder="Project overview..." className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="on_hold">On Hold</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} className={inputCls} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Members</label>
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                            {users.map(u => (
                                <label key={u._id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" checked={form.members.includes(u._id)}
                                        onChange={() => toggleMember(u._id)} className="rounded" />
                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                        {u.firstName?.[0]}{u.lastName?.[0]}
                                    </div>
                                    <span className="text-sm text-gray-700">{u.firstName} {u.lastName}</span>
                                </label>
                            ))}
                            {!users.length && <p className="px-3 py-3 text-xs text-gray-400">No users available</p>}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {loading ? "Saving..." : initial ? "Update" : "Create Project"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Projects = () => {
    const { user } = useStore();
    const navigate = useNavigate();
    const { taskCommentCount, refresh: refreshNotifications } = useNotifications();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = isSuperAdmin || user?.role?.permissions?.some(p => ["CREATE_PROJECT", "UPDATE_PROJECT"].includes(p));

    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    // projectIds that have unread task_comment notifications
    const [unreadProjectIds, setUnreadProjectIds] = useState(new Set());

    const loadUnreadProjects = async () => {
        try {
            const res = await api.get(ENDPOINTS.NOTIFICATION.GET_ALL, { params: { unreadOnly: true, limit: 100 } });
            const ids = new Set(
                (res.data.notifications || [])
                    .filter(n => n.type === "task_comment" && n.metadata?.projectId)
                    .map(n => n.metadata.projectId.toString())
            );
            setUnreadProjectIds(ids);
        } catch { /* silent */ }
    };

    const load = async () => {
        try {
            const res = await getProjects();
            setProjects(res.data.data || []);
        } catch { toast.error("Failed to load projects"); }
    };

    useEffect(() => {
        load();
        loadUnreadProjects();
        if (isAdmin) {
            fetchUsers().then(r => setUsers(r.users || [])).catch(() => {});
        }
    }, []);

    // reload unread dots when taskCommentCount changes
    useEffect(() => { loadUnreadProjects(); }, [taskCommentCount]);

    const handleSubmit = async (form) => {
        try {
            setLoading(true);
            if (selected) {
                await updateProject(selected._id, form);
                toast.success("Project updated");
            } else {
                await createProject(form);
                toast.success("Project created");
            }
            setDrawerOpen(false);
            setSelected(null);
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save project");
        } finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this project and all its tasks?")) return;
        try {
            await deleteProject(id);
            toast.success("Project deleted");
            load();
        } catch { toast.error("Failed to delete project"); }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage and track all projects</p>
                </div>
                {isAdmin && (
                    <button onClick={() => { setSelected(null); setDrawerOpen(true); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                        <Plus size={15} /> New Project
                    </button>
                )}
            </div>

            {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <FolderKanban size={48} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No projects yet</p>
                    <p className="text-gray-400 text-sm mt-1">Create your first project to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map(p => (
                        <div key={p._id}
                            className="relative bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer group"
                            onClick={() => navigate(`/projects/${p._id}`)}>
                            {/* Unread comment dot */}
                            {unreadProjectIds.has(p._id) && (
                                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                    <MessageSquare size={10} /> New
                                </span>
                            )}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <FolderKanban size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{p.name}</h3>
                                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium border capitalize mt-0.5 ${STATUS_COLORS[p.status]}`}>
                                            {p.status.replace("_", " ")}
                                        </span>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => { setSelected(p); setDrawerOpen(true); }}
                                            className="p-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg">
                                            <Pencil size={13} />
                                        </button>
                                        <button onClick={() => handleDelete(p._id)}
                                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {p.description && (
                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.description}</p>
                            )}

                            <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1">
                                    <Users size={12} />
                                    <span>{p.members?.length || 0} members</span>
                                </div>
                                {p.endDate && (
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        <span>{new Date(p.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                    </div>
                                )}
                            </div>

                            {p.members?.length > 0 && (
                                <div className="flex -space-x-2 mt-3">
                                    {p.members.slice(0, 5).map(m => (
                                        <div key={m._id} title={`${m.firstName} ${m.lastName}`}
                                            className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                                            {m.firstName?.[0]}{m.lastName?.[0]}
                                        </div>
                                    ))}
                                    {p.members.length > 5 && (
                                        <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center border-2 border-white">
                                            +{p.members.length - 5}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <ProjectDrawer
                isOpen={drawerOpen}
                onClose={() => { setDrawerOpen(false); setSelected(null); }}
                initial={selected}
                onSubmit={handleSubmit}
                loading={loading}
                users={users}
            />
        </div>
    );
};

export default Projects;
