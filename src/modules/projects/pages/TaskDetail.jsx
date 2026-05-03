import { useState, useEffect, useRef } from "react";
import { X, Paperclip, Send, Trash2, Upload, ExternalLink, FileText, Image, Film, Archive, UserPlus, UserMinus, Download } from "lucide-react";
import { toast } from "react-toastify";
import { getTaskById, addComment, deleteComment, addAttachment, deleteAttachment, updateTask } from "../services/projectService";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const PRIORITY_COLORS = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-50 text-blue-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-red-50 text-red-700",
};

const STATUS_OPTIONS = ["todo", "in_progress", "review", "done"];

const FileIcon = ({ type }) => {
    if (type === "image") return <Image size={14} className="text-blue-500" />;
    if (type === "video") return <Film size={14} className="text-purple-500" />;
    if (type === "application") return <Archive size={14} className="text-orange-500" />;
    return <FileText size={14} className="text-gray-500" />;
};

const getExt = (name) => name?.split(".").pop()?.toLowerCase();
const VIEWABLE = ["jpg", "jpeg", "png", "gif", "webp", "svg", "mp4", "mov"];

const downloadFile = async (url, name) => {
    try {
        const res = await api.get(ENDPOINTS.PROJECT.DOWNLOAD, {
            params: { url, name },
            responseType: "blob",
            timeout: 0,
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(res.data);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
    } catch { toast.error("Download failed"); }
};

const AttachmentItem = ({ att, onDelete, canDelete }) => (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 group">
        <FileIcon type={att.type} />
        <span className="flex-1 text-xs text-gray-700 truncate">{att.name || "Attachment"}</span>
        {VIEWABLE.includes(getExt(att.name)) ? (
            <a href={att.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded shrink-0 transition">
                <ExternalLink size={11} /> View
            </a>
        ) : (
            <button onClick={() => downloadFile(att.url, att.name || "file")}
                className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded shrink-0 transition">
                <Download size={11} /> Download
            </button>
        )}
        {canDelete && (
            <button onClick={() => onDelete(att._id)}
                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition ml-1">
                <Trash2 size={12} />
            </button>
        )}
    </div>
);

const TaskDetail = ({ taskId, onClose, onUpdate, isAdmin, currentUserId, projectMembers = [] }) => {
    const [task, setTask] = useState(null);
    const [commentText, setCommentText] = useState("");
    const [commentFiles, setCommentFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showAssign, setShowAssign] = useState(false);
    const [assignLoading, setAssignLoading] = useState(false);
    const fileRef = useRef(null);
    const commentFileRef = useRef(null);

    const load = async () => {
        try {
            const res = await getTaskById(taskId);
            setTask(res.data.data);
        } catch { toast.error("Failed to load task"); onClose(); }
    };

    useEffect(() => { load(); }, [taskId]);

    const handleStatusChange = async (status) => {
        try {
            await updateTask(taskId, { status });
            setTask(t => ({ ...t, status }));
            onUpdate();
        } catch { toast.error("Failed to update status"); }
    };

    const handleToggleAssign = async (userId) => {
        const isAssigned = task.assignedTo.some(u => u._id === userId);
        const newAssigned = isAssigned
            ? task.assignedTo.filter(u => u._id !== userId).map(u => u._id)
            : [...task.assignedTo.map(u => u._id), userId];
        try {
            setAssignLoading(true);
            const res = await updateTask(taskId, { assignedTo: newAssigned });
            setTask(res.data.data);
            onUpdate();
            toast.success(isAssigned ? "User removed" : "User assigned");
        } catch { toast.error("Failed to update assignees"); }
        finally { setAssignLoading(false); }
    };

    const handleAddComment = async () => {
        if (!commentText.trim() && commentFiles.length === 0) return;
        try {
            setSubmitting(true);
            const fd = new FormData();
            fd.append("text", commentText);
            commentFiles.forEach(f => fd.append("attachments", f));
            const res = await addComment(taskId, fd);
            setTask(res.data.data);
            setCommentText("");
            setCommentFiles([]);
            onUpdate();
        } catch { toast.error("Failed to add comment"); }
        finally { setSubmitting(false); }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            const res = await deleteComment(taskId, commentId);
            setTask(res.data.data);
        } catch { toast.error("Failed to delete comment"); }
    };

    const handleAddAttachment = async (files) => {
        if (!files.length) return;
        try {
            setUploading(true);
            const fd = new FormData();
            files.forEach(f => fd.append("attachments", f));
            const res = await addAttachment(taskId, fd);
            setTask(res.data.data);
            onUpdate();
        } catch { toast.error("Failed to upload attachment"); }
        finally { setUploading(false); }
    };

    const handleDeleteAttachment = async (attId) => {
        if (!window.confirm("Delete this attachment?")) return;
        try {
            await deleteAttachment(taskId, attId);
            setTask(t => ({ ...t, attachments: t.attachments.filter(a => a._id !== attId) }));
        } catch { toast.error("Failed to delete attachment"); }
    };

    if (!task) return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white h-full flex items-center justify-center shadow-2xl">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b gap-3">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-gray-900 leading-snug">{task.title}</h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLORS[task.priority]}`}>
                                {task.priority}
                            </span>
                            <select value={task.status} onChange={e => handleStatusChange(e.target.value)}
                                className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 font-medium capitalize focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Description */}
                    {task.description && (
                        <div className="px-6 py-4 border-b">
                            <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
                        </div>
                    )}

                    {/* Assigned Users */}
                    <div className="px-6 py-4 border-b">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-500">Assigned To ({task.assignedTo?.length || 0})</p>
                            {isAdmin && (
                                <button onClick={() => setShowAssign(s => !s)}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                    <UserPlus size={12} /> {showAssign ? "Done" : "Manage"}
                                </button>
                            )}
                        </div>

                        {/* Current assignees */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {task.assignedTo?.length ? task.assignedTo.map(u => (
                                <span key={u._id} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white text-[8px] font-bold flex items-center justify-center shrink-0">
                                        {u.firstName?.[0]}{u.lastName?.[0]}
                                    </div>
                                    {u.firstName} {u.lastName}
                                    {isAdmin && (
                                        <button onClick={() => handleToggleAssign(u._id)} disabled={assignLoading}
                                            className="ml-0.5 text-blue-400 hover:text-red-500 transition">
                                            <X size={11} />
                                        </button>
                                    )}
                                </span>
                            )) : <span className="text-xs text-gray-400">No one assigned yet</span>}
                        </div>

                        {/* Member picker */}
                        {isAdmin && showAssign && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden mt-2">
                                {projectMembers.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-gray-400">No project members available</p>
                                ) : projectMembers.map(m => {
                                    const assigned = task.assignedTo.some(u => u._id === m._id);
                                    return (
                                        <button key={m._id} onClick={() => handleToggleAssign(m._id)} disabled={assignLoading}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 transition border-b border-gray-100 last:border-0 ${
                                                assigned ? "bg-blue-50" : ""
                                            }`}>
                                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                                {m.firstName?.[0]}{m.lastName?.[0]}
                                            </div>
                                            <span className={`flex-1 text-left ${assigned ? "text-blue-700 font-medium" : "text-gray-700"}`}>
                                                {m.firstName} {m.lastName}
                                            </span>
                                            {assigned
                                                ? <UserMinus size={14} className="text-red-400" />
                                                : <UserPlus size={14} className="text-blue-400" />
                                            }
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Due Date */}
                    {task.dueDate && (
                        <div className="px-6 py-3 border-b">
                            <p className="text-xs text-gray-400 mb-0.5">Due Date</p>
                            <p className="text-sm text-gray-700 font-medium">
                                {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                        </div>
                    )}

                    {/* Assignment History */}
                    {task.assignmentHistory?.length > 0 && (
                        <div className="px-6 py-4 border-b">
                            <p className="text-xs font-medium text-gray-500 mb-3">Assignment History</p>
                            <div className="space-y-2">
                                {[...task.assignmentHistory]
                                    .sort((a, b) => new Date(b.at) - new Date(a.at))
                                    .map((h, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                h.action === "assigned" ? "bg-green-500" : "bg-red-400"
                                            }`} />
                                            <span className={`font-medium ${
                                                h.action === "assigned" ? "text-green-700" : "text-red-500"
                                            }`}>
                                                {h.user?.firstName} {h.user?.lastName}
                                            </span>
                                            <span className="text-gray-400">
                                                {h.action === "assigned" ? "was assigned" : "was removed"}
                                            </span>
                                            {h.by && (
                                                <span className="text-gray-400">by <span className="text-gray-600 font-medium">{h.by.firstName} {h.by.lastName}</span></span>
                                            )}
                                            <span className="ml-auto text-gray-300 shrink-0">
                                                {new Date(h.at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                            </span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {/* Attachments */}
                    <div className="px-6 py-4 border-b">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-500">Attachments ({task.attachments?.length || 0})</p>
                            <label className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                                {uploading ? "Uploading..." : <><Upload size={12} /> Add Files</>}
                                <input ref={fileRef} type="file" multiple className="hidden"
                                    onChange={e => handleAddAttachment(Array.from(e.target.files))} />
                            </label>
                        </div>
                        {task.attachments?.length > 0 ? (
                            <div className="space-y-1.5">
                                {task.attachments.map(att => (
                                    <AttachmentItem key={att._id} att={att}
                                        onDelete={handleDeleteAttachment}
                                        canDelete={isAdmin || att.uploadedBy?._id === currentUserId} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">No attachments yet</p>
                        )}
                    </div>

                    {/* Comments */}
                    <div className="px-4 py-4">
                        <p className="text-xs font-medium text-gray-500 mb-3">Comments ({task.comments?.length || 0})</p>
                        <div className="space-y-3">
                            {task.comments?.map(c => {
                                const isMe = c.author?._id === currentUserId;
                                return (
                                    <div key={c._id} className={`flex items-end gap-2 group ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                        {/* Avatar */}
                                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mb-0.5">
                                            {c.author?.firstName?.[0]}{c.author?.lastName?.[0]}
                                        </div>

                                        {/* Bubble */}
                                        <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                                            {!isMe && (
                                                <span className="text-[10px] font-semibold text-gray-500 px-1">
                                                    {c.author?.firstName} {c.author?.lastName}
                                                </span>
                                            )}
                                            {c.text && (
                                                <div className={`px-3 py-2 rounded-2xl text-sm leading-snug whitespace-pre-wrap break-words ${
                                                    isMe
                                                        ? "bg-blue-600 text-white rounded-br-sm"
                                                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                                                }`}>
                                                    {c.text}
                                                </div>
                                            )}
                                            {c.attachments?.length > 0 && (
                                                <div className={`space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                                                    {c.attachments.map(att => (
                                                        VIEWABLE.includes(getExt(att.name)) ? (
                                                            <a key={att._id} href={att.url} target="_blank" rel="noreferrer"
                                                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border ${
                                                                    isMe ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-blue-600 border-gray-200"
                                                                } hover:underline`}>
                                                                <FileIcon type={att.type} />
                                                                {att.name || "Attachment"} <ExternalLink size={10} />
                                                            </a>
                                                        ) : (
                                                            <button key={att._id} onClick={() => downloadFile(att.url, att.name || "file")}
                                                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border ${
                                                                    isMe ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-blue-600 border-gray-200"
                                                                } hover:opacity-80 transition`}>
                                                                <FileIcon type={att.type} />
                                                                {att.name || "Attachment"} <Download size={10} />
                                                            </button>
                                                        )
                                                    ))}
                                                </div>
                                            )}
                                            <div className={`flex items-center gap-1.5 px-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(c.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Comment Input */}
                <div className="px-6 py-4 border-t bg-gray-50">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                            <textarea
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                                placeholder="Add a comment... (Enter to send)"
                                rows={2}
                                className={inputCls}
                            />
                            {commentFiles.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {commentFiles.map((f, i) => (
                                        <span key={i} className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                            {f.name.slice(0, 20)}
                                            <button onClick={() => setCommentFiles(fs => fs.filter((_, idx) => idx !== i))}><X size={10} /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                            <label className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-500 transition">
                                <Paperclip size={16} />
                                <input ref={commentFileRef} type="file" multiple className="hidden"
                                    onChange={e => setCommentFiles(fs => [...fs, ...Array.from(e.target.files)])} />
                            </label>
                            <button onClick={handleAddComment} disabled={submitting || (!commentText.trim() && !commentFiles.length)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition">
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetail;
