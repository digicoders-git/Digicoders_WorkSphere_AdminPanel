import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, Trash2, X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from "../modules/notifications/services/notificationService";

const TYPE_ICON = {
    attendance:    "🕐",
    user:          "👤",
    role:          "🛡️",
    department:    "🏢",
    company:       "🏗️",
    shift:         "⏰",
    system:        "🔔",
    task_comment:  "💬",
};

const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

const NotificationBell = () => {
    const navigate = useNavigate();
    const { unreadCount, refresh } = useNotifications();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getNotifications({ limit: 10 });
            setNotifications(data.notifications || []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const handleOpen = () => {
        setOpen(p => !p);
        if (!open) load();
    };

    const handleRead = async (n) => {
        if (!n.isRead) {
            await markAsRead(n._id);
            setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
            refresh();
        }
        if (n.link) {
            setOpen(false);
            // For task_comment notifications, append taskId so ProjectDetail auto-opens the task
            const link = n.type === "task_comment" && n.metadata?.taskId
                ? `${n.link}?taskId=${n.metadata.taskId}`
                : n.link;
            navigate(link);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        await deleteNotification(id);
        setNotifications(prev => prev.filter(x => x._id !== id));
        refresh();
    };

    const handleMarkAll = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(x => ({ ...x, isRead: true })));
        refresh();
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 flex flex-col max-h-[480px]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAll} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition flex items-center gap-1">
                                    <Check size={12} /> Mark all read
                                </button>
                            )}
                            <button onClick={() => { setOpen(false); navigate("/notifications"); }}
                                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50 transition flex items-center gap-1">
                                <ExternalLink size={12} /> View all
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                <Bell size={32} className="mb-2 opacity-30" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n._id}
                                    onClick={() => handleRead(n)}
                                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition border-b border-gray-50 last:border-0 ${!n.isRead ? "bg-blue-50/40" : ""}`}
                                >
                                    <div className="text-xl shrink-0 mt-0.5">{TYPE_ICON[n.type] || "🔔"}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm leading-tight ${!n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                                                {n.title}
                                            </p>
                                            <button onClick={(e) => handleDelete(e, n._id)}
                                                className="shrink-0 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition">
                                                <X size={12} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                                    </div>
                                    {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
