import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Paperclip, MessageSquare, Trash2, X, Upload, Link2, FolderOpen } from "lucide-react";
import { toast } from "react-toastify";
import { useStore } from "../../../context/StoreContext";
import { useNotifications } from "../../../context/NotificationContext";
import { getProjectById, getTasksByProject, createTask, updateTask, deleteTask, getFileBundles } from "../services/projectService";
import { markProjectNotificationsRead } from "../../notifications/services/notificationService";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";
import TaskDetail from "./TaskDetail";
import ProjectFiles from "./ProjectFiles";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const PRIORITY_COLORS = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-50 text-blue-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-red-50 text-red-700",
};

const QA_COLORS = {
    pending: "bg-gray-100 text-gray-500",
    pass: "bg-green-50 text-green-700",
    fail: "bg-red-50 text-red-600",
};

const COLUMNS = [
    { key: "todo",         label: "To Do",        color: "bg-gray-100" },
    { key: "in_progress",  label: "In Progress",   color: "bg-blue-100" },
    { key: "qa",           label: "QA",            color: "bg-purple-100" },
    { key: "admin_review", label: "Admin Review",  color: "bg-orange-100" },
    { key: "done",         label: "Done",          color: "bg-green-100" },
];

const TaskDrawer = ({ isOpen, onClose, onSubmit, loading, members }) => {
    const [form, setForm] = useState({ title: "", description: "", priority: "medium", status: "todo", dueDate: "", assignedTo: [], links: "" });
    const [files, setFiles] = useState([]);

    useEffect(() => {
        if (!isOpen) { setForm({ title: "", description: "", priority: "medium", status: "todo", dueDate: "", assignedTo: [], links: "" }); setFiles([]); }
    }, [isOpen]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const toggleAssign = (id) => setForm(f => ({
        ...f,
        assignedTo: f.assignedTo.includes(id) ? f.assignedTo.filter(x => x !== id) : [...f.assignedTo, id],
    }));

    const handleSubmit = () => {
        if (!form.title.trim()) return toast.error("Task title is required");
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
            if (k === "assignedTo") v.forEach(id => fd.append("assignedTo", id));
            else fd.append(k, v);
        });
        files.forEach(f => fd.append("attachments", f));
        onSubmit(fd);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-gray-900">New Task</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Title <span className="text-red-500">*</span></label>
                        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Task title" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                        <textarea value={form.description} onChange={e => set("description", e.target.value)}
                            rows={3} placeholder="Task details..." className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                            <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputCls}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="qa">QA</option>
                                <option value="admin_review">Admin Review</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                        <input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Assign To</label>
                        <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                            {members.map(m => (
                                <label key={m._id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" checked={form.assignedTo.includes(m._id)}
                                        onChange={() => toggleAssign(m._id)} className="rounded" />
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {m.firstName?.[0]}{m.lastName?.[0]}
                                    </div>
                                    <span className="text-sm text-gray-700">{m.firstName} {m.lastName}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            <Link2 size={12} className="inline mr-1" />Links (GitHub, Figma, etc.)
                        </label>
                        <input value={form.links} onChange={e => set("links", e.target.value)}
                            placeholder="https://github.com/..." className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            <Paperclip size={12} className="inline mr-1" />Attachments
                        </label>
                        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition text-sm text-gray-500">
                            <Upload size={14} />
                            <span>{files.length ? `${files.length} file(s) selected` : "Click to attach files"}</span>
                            <input type="file" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files))} />
                        </label>
                        {files.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {files.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                        <span className="truncate">{f.name}</span>
                                        <button onClick={() => setFiles(fs => fs.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 ml-2"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {loading ? "Creating..." : "Create Task"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TaskCard = ({ task, onClick, onDelete, isAdmin, hasUnread }) => (
    <div onClick={onClick}
        className="relative bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer group">
        {hasUnread && (
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
            </span>
        )}
        <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
            {isAdmin && (
                <button onClick={e => { e.stopPropagation(); onDelete(task._id); }}
                    className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <Trash2 size={13} />
                </button>
            )}
        </div>
        {task.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>}
        {task.status === "qa" && task.qaStatus !== "pending" && (
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 ${QA_COLORS[task.qaStatus]}`}>
                QA: {task.qaStatus.toUpperCase()}
            </span>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority}
            </span>
            <div className="flex items-center gap-2 text-gray-400">
                {task.attachments?.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px]"><Paperclip size={10} />{task.attachments.length}</span>
                )}
                {task.comments?.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px]"><MessageSquare size={10} />{task.comments.length}</span>
                )}
                {task.assignedTo?.length > 0 && (
                    <div className="flex -space-x-1">
                        {task.assignedTo.slice(0, 3).map(u => (
                            <div key={u._id} title={`${u.firstName} ${u.lastName}`}
                                className="w-5 h-5 rounded-full bg-blue-600 text-white text-[8px] font-bold flex items-center justify-center border border-white">
                                {u.firstName?.[0]}{u.lastName?.[0]}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
);

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useStore();
    const { refresh: refreshNotifications } = useNotifications();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = isSuperAdmin || user?.role?.permissions?.some(p => ["CREATE_TASK", "UPDATE_TASK"].includes(p));

    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [activeTab, setActiveTab] = useState("board");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [unreadTaskIds, setUnreadTaskIds] = useState(new Set());

    const loadUnreadTasks = async () => {
        try {
            const res = await api.get(ENDPOINTS.NOTIFICATION.GET_ALL, { params: { unreadOnly: true, limit: 100 } });
            const ids = new Set(
                (res.data.notifications || [])
                    .filter(n => n.type === "task_comment" && n.metadata?.taskId && n.metadata?.projectId?.toString() === id)
                    .map(n => n.metadata.taskId.toString())
            );
            setUnreadTaskIds(ids);
        } catch { /* silent */ }
    };

    const loadProject = async () => {
        try {
            const res = await getProjectById(id);
            setProject(res.data.data);
        } catch { toast.error("Failed to load project"); navigate("/projects"); }
    };

    const loadTasks = async () => {
        try {
            const res = await getTasksByProject(id);
            setTasks(res.data.data || []);
        } catch { toast.error("Failed to load tasks"); }
    };

    const loadBundles = async () => {
        try {
            const res = await getFileBundles(id);
            setBundles(res.data.data || []);
        } catch { /* silent */ }
    };

    useEffect(() => {
        loadProject();
        loadTasks();
        loadBundles();
        loadUnreadTasks();
        markProjectNotificationsRead(id).then(() => refreshNotifications()).catch(() => {});
    }, [id]);

    // Auto-open task from notification link (?taskId=xxx)
    useEffect(() => {
        const taskId = searchParams.get("taskId");
        if (taskId && tasks.length) {
            const t = tasks.find(t => t._id === taskId);
            if (t) setSelectedTask(t);
        }
    }, [searchParams, tasks]);

    const handleCreateTask = async (fd) => {
        try {
            setLoading(true);
            fd.append("projectId", id);
            await createTask(fd);
            toast.success("Task created");
            setDrawerOpen(false);
            loadTasks();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to create task");
        } finally { setLoading(false); }
    };

    const handleStatusChange = async (taskId, status) => {
        try {
            await updateTask(taskId, { status });
            setTasks(ts => ts.map(t => t._id === taskId ? { ...t, status } : t));
        } catch { toast.error("Failed to update status"); }
    };

    const handleDelete = async (taskId) => {
        if (!window.confirm("Delete this task?")) return;
        try {
            await deleteTask(taskId);
            toast.success("Task deleted");
            loadTasks();
        } catch { toast.error("Failed to delete task"); }
    };

    if (!project) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const tasksByStatus = (status) => tasks.filter(t => t.status === status);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <button onClick={() => navigate("/projects")} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                    {project.description && <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                        {project.members?.slice(0, 5).map(m => (
                            <div key={m._id} title={`${m.firstName} ${m.lastName}`}
                                className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                                {m.firstName?.[0]}{m.lastName?.[0]}
                            </div>
                        ))}
                    </div>
                    {isAdmin && activeTab === "board" && (
                        <button onClick={() => setDrawerOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                            <Plus size={15} /> Add Task
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-5">
                <button onClick={() => setActiveTab("board")}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${activeTab === "board" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    Board
                </button>
                <button onClick={() => setActiveTab("files")}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition ${activeTab === "files" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    <FolderOpen size={12} /> Files & Links
                </button>
            </div>

            {/* Files Tab */}
            {activeTab === "files" && (
                <ProjectFiles
                    projectId={id}
                    members={project.members || []}
                    currentUserId={user?._id || user?.userId}
                    isAdmin={isAdmin}
                />
            )}

            {activeTab === "board" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {COLUMNS.map(col => (
                        <div key={col.key} className="flex flex-col gap-3">
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${col.color}`}>
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{col.label}</span>
                                <span className="text-xs font-bold text-gray-500 bg-white rounded-full w-5 h-5 flex items-center justify-center">
                                    {tasksByStatus(col.key).length}
                                </span>
                            </div>
                            <div className="space-y-2 min-h-[100px]">
                                {tasksByStatus(col.key).map(task => (
                                    <TaskCard
                                        key={task._id}
                                        task={task}
                                        onClick={() => {
                                            setSelectedTask(task);
                                            setUnreadTaskIds(prev => { const s = new Set(prev); s.delete(task._id); return s; });
                                        }}
                                        onDelete={handleDelete}
                                        isAdmin={isAdmin}
                                        hasUnread={unreadTaskIds.has(task._id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <TaskDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onSubmit={handleCreateTask}
                loading={loading}
                members={project.members || []}
            />

            {selectedTask && (
                <TaskDetail
                    taskId={selectedTask._id}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={loadTasks}
                    isAdmin={isAdmin}
                    currentUserId={user?._id || user?.userId}
                    projectMembers={project?.members || []}
                    projectBundles={bundles}
                />
            )}
        </div>
    );
};

export default ProjectDetail;
