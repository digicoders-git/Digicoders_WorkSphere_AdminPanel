import { useState, useEffect, useRef } from "react";
import { X, Paperclip, Send, Trash2, Upload, ExternalLink, FileText, Image, Film, Archive, UserPlus, UserMinus, Download, Link2, ChevronDown, ChevronUp, Package, Play, CheckCircle, ThumbsUp, ThumbsDown, Info, MessageCircle } from "lucide-react";
import { toast } from "react-toastify";
import { getTaskById, addComment, deleteComment, addAttachment, deleteAttachment, updateTask, startWork } from "../services/projectService";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const PRIORITY_COLORS = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-50 text-blue-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-red-50 text-red-700",
};

const STATUS_FLOW = [
    { key: "todo",         label: "To Do" },
    { key: "in_progress",  label: "In Progress" },
    { key: "qa",           label: "QA" },
    { key: "admin_review", label: "Admin Review" },
    { key: "done",         label: "Done" },
];

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
        const res = await api.get(ENDPOINTS.PROJECT.DOWNLOAD, { params: { url, name }, responseType: "blob", timeout: 0 });
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

const TaskDetail = ({ taskId, onClose, onUpdate, isAdmin, currentUserId, projectMembers = [], projectBundles = [] }) => {
    const [task, setTask] = useState(null);
    const [activeView, setActiveView] = useState("chat"); // "chat" or "details"
    const [commentText, setCommentText] = useState("");
    const [commentFiles, setCommentFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showAssign, setShowAssign] = useState(false);
    const [assignLoading, setAssignLoading] = useState(false);
    const [showBundleLink, setShowBundleLink] = useState(false);
    const [displayedComments, setDisplayedComments] = useState(20);
    const [loadingMore, setLoadingMore] = useState(false);
    const fileRef = useRef(null);
    const commentFileRef = useRef(null);
    const chatContainerRef = useRef(null);

    const load = async () => {
        try {
            const res = await getTaskById(taskId);
            setTask(res.data.data);
        } catch { toast.error("Failed to load task"); onClose(); }
    };

    useEffect(() => { load(); }, [taskId]);

    useEffect(() => {
        // Auto-scroll to bottom when chat view is active and comments load
        if (activeView === "chat" && chatContainerRef.current && task?.comments) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [activeView, task?.comments?.length]);

    const handleLoadMore = () => {
        if (loadingMore) return;
        setLoadingMore(true);
        setTimeout(() => {
            setDisplayedComments(prev => prev + 20);
            setLoadingMore(false);
        }, 300);
    };

    const handleScroll = (e) => {
        if (activeView !== "chat") return;
        const { scrollTop } = e.target;
        if (scrollTop === 0 && displayedComments < (task?.comments?.length || 0)) {
            handleLoadMore();
        }
    };

    const handleStartWork = async () => {
        try {
            const res = await startWork(taskId);
            setTask(res.data.data);
            onUpdate();
        } catch { toast.error("Failed to start work"); }
    };

    const handleMarkComplete = async () => {
        try {
            await updateTask(taskId, { status: "qa" });
            await load();
            onUpdate();
        } catch { toast.error("Failed to mark complete"); }
    };

    const handleStatusChange = async (status) => {
        try {
            await updateTask(taskId, { status });
            setTask(t => ({ ...t, status }));
            onUpdate();
        } catch { toast.error("Failed to update status"); }
    };

    const handleQaStatus = async (qaStatus) => {
        try {
            await updateTask(taskId, { qaStatus });
            await load();
            onUpdate();
        } catch { toast.error("Failed to update QA status"); }
    };

    const handleAdminReject = async () => {
        try {
            await updateTask(taskId, { status: "in_progress", workStarted: false });
            await load();
            onUpdate();
            toast.success("Task sent back to In Progress");
        } catch { toast.error("Failed to send task back"); }
    };

    const handleToggleBundle = async (bundleId) => {
        const linked = task.linkedBundles || [];
        const isLinked = linked.includes(bundleId) || linked.some(b => (b._id || b) === bundleId);
        const newLinked = isLinked
            ? linked.filter(b => (b._id || b) !== bundleId)
            : [...linked.map(b => b._id || b), bundleId];
        try {
            const res = await updateTask(taskId, { linkedBundles: newLinked });
            setTask(res.data.data);
            onUpdate();
        } catch { toast.error("Failed to update linked bundles"); }
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

    const handleQaAssign = async (userId) => {
        try {
            setAssignLoading(true);
            const res = await updateTask(taskId, { qaAssignedTo: userId || null });
            setTask(res.data.data);
            onUpdate();
            toast.success(userId ? "QA reviewer assigned" : "QA reviewer removed");
        } catch { toast.error("Failed to assign QA reviewer"); }
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
            // Scroll to bottom after adding comment
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
            }, 100);
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

    const linkedIds = (task.linkedBundles || []).map(b => b._id || b);

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b gap-3">
                    <div className="flex-1 min-w-0">
                        <button onClick={() => setActiveView(activeView === "chat" ? "details" : "chat")}
                            className="text-base font-semibold text-gray-900 leading-snug hover:text-blue-600 transition text-left">
                            {task.title}
                        </button>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLORS[task.priority]}`}>
                                {task.priority}
                            </span>

                            {/* Admin: full status stepper */}
                            {isAdmin && (
                                <div className="flex items-center gap-0.5">
                                    {STATUS_FLOW.map((s) => (
                                        <button key={s.key} onClick={() => handleStatusChange(s.key)}
                                            className={`text-[10px] px-2 py-0.5 rounded font-medium transition border ${
                                                task.status === s.key
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                                            }`}>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Non-admin: role-based action buttons */}
                            {!isAdmin && (() => {
                                const isAssigned = task.assignedTo?.some(u => u._id === currentUserId);
                                const isQA = task.qaAssignedTo?._id === currentUserId;

                                // Assigned dev: todo → start work
                                if (isAssigned && task.status === "todo") return (
                                    <button onClick={handleStartWork}
                                        className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition">
                                        <Play size={11} /> Start Work
                                    </button>
                                );

                                // Assigned dev: in_progress but not started (after QA fail) → restart work
                                if (isAssigned && task.status === "in_progress" && !task.workStarted) return (
                                    <button onClick={handleStartWork}
                                        className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg font-medium bg-orange-600 text-white hover:bg-orange-700 transition">
                                        <Play size={11} /> Restart Work
                                    </button>
                                );

                                // Assigned dev: in_progress → mark complete
                                if (isAssigned && task.status === "in_progress" && task.workStarted) return (
                                    <button onClick={handleMarkComplete}
                                        className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition">
                                        <CheckCircle size={11} /> Mark Complete
                                    </button>
                                );

                                // QA: qa status → start QA review
                                if (isQA && task.status === "qa" && !task.qaStarted) return (
                                    <button onClick={handleStartWork}
                                        className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition">
                                        <Play size={11} /> Start QA Review
                                    </button>
                                );

                                // QA: after starting → pass or fail
                                if (isQA && task.status === "qa" && task.qaStarted) return (
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => handleQaStatus("pass")}
                                            className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition">
                                            <ThumbsUp size={11} /> Pass
                                        </button>
                                        <button onClick={() => handleQaStatus("fail")}
                                            className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition">
                                            <ThumbsDown size={11} /> Fail
                                        </button>
                                    </div>
                                );

                                // Show current status badge for all other cases
                                const current = STATUS_FLOW.find(s => s.key === task.status);
                                return (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                        {current?.label || task.status}
                                    </span>
                                );
                            })()}
                        </div>

                        {/* Admin Review Actions */}
                        {isAdmin && task.status === "admin_review" && (
                            <div className="flex items-center gap-2 mt-2">
                                <button onClick={() => handleStatusChange("done")}
                                    className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition">
                                    <CheckCircle size={11} /> Send to Production
                                </button>
                                <button onClick={() => handleAdminReject()}
                                    className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg font-medium bg-orange-600 text-white hover:bg-orange-700 transition">
                                    <Play size={11} /> Send to Restart Work
                                </button>
                            </div>
                        )}

                        {/* Admin QA Pass/Fail */}
                        {isAdmin && task.status === "qa" && (
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-gray-500 font-medium">QA Result:</span>
                                <button onClick={() => handleQaStatus("pass")}
                                    className={`text-[10px] px-2 py-0.5 rounded font-medium border transition ${
                                        task.qaStatus === "pass" ? "bg-green-600 text-white border-green-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-green-400"
                                    }`}>
                                    ✓ Pass
                                </button>
                                <button onClick={() => handleQaStatus("fail")}
                                    className={`text-[10px] px-2 py-0.5 rounded font-medium border transition ${
                                        task.qaStatus === "fail" ? "bg-red-500 text-white border-red-500" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-red-400"
                                    }`}>
                                    ✗ Fail
                                </button>
                                {task.qaStatus !== "pending" && (
                                    <button onClick={() => handleQaStatus("pending")}
                                        className="text-[10px] text-gray-400 hover:text-gray-600 underline">
                                        Reset
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setActiveView(activeView === "chat" ? "details" : "chat")}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                            {activeView === "chat" ? <Info size={16} /> : <MessageCircle size={16} />}
                        </button>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"><X size={16} /></button>
                    </div>
                </div>

                {/* Chat View */}
                {activeView === "chat" && (
                    <>
                        <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4">
                            {displayedComments < (task.comments?.length || 0) && (
                                <div className="flex justify-center mb-3">
                                    <button onClick={handleLoadMore} disabled={loadingMore}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition disabled:opacity-50">
                                        {loadingMore ? "Loading..." : `Load ${Math.min(20, (task.comments?.length || 0) - displayedComments)} more`}
                                    </button>
                                </div>
                            )}
                            <div className="space-y-3">
                                {task.comments?.slice(-displayedComments).map(c => {
                                    if (c.isEvent) {
                                        return (
                                            <div key={c._id} className="flex justify-center">
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center max-w-[85%]">
                                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                                        <span className="font-semibold">{c.author?.firstName} {c.author?.lastName}</span>
                                                        {" "}{c.text}
                                                    </p>
                                                    <p className="text-[9px] text-amber-600 mt-0.5">
                                                        {new Date(c.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    const isMe = c.author?._id === currentUserId;
                                    return (
                                        <div key={c._id} className={`flex items-end gap-2 group ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mb-0.5">
                                                {c.author?.firstName?.[0]}{c.author?.lastName?.[0]}
                                            </div>
                                            <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                                                {!isMe && (
                                                    <span className="text-[10px] font-semibold text-gray-500 px-1">
                                                        {c.author?.firstName} {c.author?.lastName}
                                                    </span>
                                                )}
                                                {c.text && (
                                                    <div className={`px-3 py-2 rounded-2xl text-sm leading-snug whitespace-pre-wrap break-words ${
                                                        isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"
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
                                                    {(isMe || isAdmin) && (
                                                        <button onClick={() => handleDeleteComment(c._id)}
                                                            className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                                            <Trash2 size={11} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                        placeholder="Add a comment or progress update... (Enter to send)"
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
                    </>
                )}

                {/* Details View */}
                {activeView === "details" && (
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
                        {isAdmin && showAssign && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden mt-2">
                                {projectMembers.map(m => {
                                    const assigned = task.assignedTo.some(u => u._id === m._id);
                                    return (
                                        <button key={m._id} onClick={() => handleToggleAssign(m._id)} disabled={assignLoading}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 transition border-b border-gray-100 last:border-0 ${assigned ? "bg-blue-50" : ""}`}>
                                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                                {m.firstName?.[0]}{m.lastName?.[0]}
                                            </div>
                                            <span className={`flex-1 text-left ${assigned ? "text-blue-700 font-medium" : "text-gray-700"}`}>
                                                {m.firstName} {m.lastName}
                                            </span>
                                            {assigned ? <UserMinus size={14} className="text-red-400" /> : <UserPlus size={14} className="text-blue-400" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* QA Assignment — admin only */}
                    {isAdmin && (
                        <div className="px-6 py-4 border-b">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-500">QA Reviewer</p>
                            </div>
                            {task.qaAssignedTo ? (
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-full text-xs font-medium">
                                        <div className="w-4 h-4 rounded-full bg-purple-600 text-white text-[8px] font-bold flex items-center justify-center shrink-0">
                                            {task.qaAssignedTo.firstName?.[0]}{task.qaAssignedTo.lastName?.[0]}
                                        </div>
                                        {task.qaAssignedTo.firstName} {task.qaAssignedTo.lastName}
                                        <button onClick={() => handleQaAssign(null)} disabled={assignLoading}
                                            className="ml-0.5 text-purple-400 hover:text-red-500 transition">
                                            <X size={11} />
                                        </button>
                                    </span>
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    {projectMembers.map(m => (
                                        <button key={m._id} onClick={() => handleQaAssign(m._id)} disabled={assignLoading}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-purple-50 transition border-b border-gray-100 last:border-0">
                                            <div className="w-7 h-7 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                                {m.firstName?.[0]}{m.lastName?.[0]}
                                            </div>
                                            <span className="flex-1 text-left text-gray-700">{m.firstName} {m.lastName}</span>
                                            <UserPlus size={14} className="text-purple-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Linked Bundles */}
                    {projectBundles.length > 0 && (
                        <div className="px-6 py-4 border-b">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <Package size={12} /> Linked Bundles ({linkedIds.length})
                                </p>
                                <button onClick={() => setShowBundleLink(s => !s)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                    {showBundleLink ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {showBundleLink ? "Hide" : "Manage"}
                                </button>
                            </div>
                            {/* Linked bundle chips */}
                            {linkedIds.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {projectBundles.filter(b => linkedIds.includes(b._id)).map(b => (
                                        <span key={b._id} className="flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                                            <Package size={9} /> {b.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {showBundleLink && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    {projectBundles.map(b => {
                                        const linked = linkedIds.includes(b._id);
                                        return (
                                            <button key={b._id} onClick={() => handleToggleBundle(b._id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 transition border-b border-gray-100 last:border-0 ${linked ? "bg-purple-50" : ""}`}>
                                                <Package size={14} className={linked ? "text-purple-600" : "text-gray-400"} />
                                                <span className={`flex-1 text-left text-xs ${linked ? "text-purple-700 font-medium" : "text-gray-700"}`}>{b.name}</span>
                                                {linked && <span className="text-[10px] text-purple-500 font-medium">Linked</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Due Date */}
                    {task.dueDate && (
                        <div className="px-6 py-3 border-b">
                            <p className="text-xs text-gray-400 mb-0.5">Due Date</p>
                            <p className="text-sm text-gray-700 font-medium">
                                {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
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
                        ) : <p className="text-xs text-gray-400">No attachments yet</p>}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default TaskDetail;
