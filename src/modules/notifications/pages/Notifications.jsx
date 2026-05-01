import React, { useState, useEffect, useCallback } from "react";
import { Bell, Check, Trash2, CheckCheck, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } from "../services/notificationService";
import { useNotifications } from "../../../context/NotificationContext";
import { toast } from "react-toastify";

const TYPE_ICON = {
    attendance: "🕐",
    user:       "👤",
    role:       "🛡️",
    department: "🏢",
    company:    "🏗️",
    shift:      "⏰",
    system:     "🔔",
};

const TYPE_COLOR = {
    attendance: "bg-blue-50 text-blue-600",
    user:       "bg-purple-50 text-purple-600",
    role:       "bg-orange-50 text-orange-600",
    department: "bg-green-50 text-green-600",
    company:    "bg-indigo-50 text-indigo-600",
    shift:      "bg-cyan-50 text-cyan-600",
    system:     "bg-gray-50 text-gray-600",
};

const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const TABS = ["all", "unread", "attendance", "user", "role", "department", "system"];

const Notifications = () => {
    const navigate = useNavigate();
    const { refresh } = useNotifications();
    const [notifications, setNotifications] = useState([]);
    const [total, setTotal] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState("all");
    const [page, setPage] = useState(1);
    const LIMIT = 20;

    const load = useCallback(async (reset = false) => {
        setLoading(true);
        try {
            const params = { limit: LIMIT, page: reset ? 1 : page };
            if (tab === "unread") params.unreadOnly = "true";
            else if (tab !== "all") params.type = tab;

            const data = await getNotifications(params);
            setNotifications(prev => reset ? (data.notifications || []) : [...prev, ...(data.notifications || [])]);
            setTotal(data.total || 0);
            setUnreadCount(data.unreadCount || 0);
            if (reset) setPage(1);
        } catch { toast.error("Failed to load notifications"); }
        finally { setLoading(false); }
    }, [tab, page]);

    useEffect(() => { load(true); }, [tab]);

    const handleRead = async (n) => {
        if (!n.isRead) {
            await markAsRead(n._id);
            setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
            setUnreadCount(c => Math.max(0, c - 1));
            refresh();
        }
        if (n.link) navigate(n.link);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        await deleteNotification(id);
        setNotifications(prev => prev.filter(x => x._id !== id));
        setTotal(t => t - 1);
        refresh();
    };

    const handleMarkAll = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(x => ({ ...x, isRead: true })));
        setUnreadCount(0);
        refresh();
        toast.success("All marked as read");
    };

    const handleClearAll = async () => {
        await clearAllNotifications();
        setNotifications([]);
        setTotal(0);
        setUnreadCount(0);
        refresh();
        toast.success("All notifications cleared");
    };

    const hasMore = notifications.length < total;

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
                    </p>
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <button onClick={handleMarkAll}
                            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600">
                            <CheckCheck size={15} /> Mark all read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button onClick={handleClearAll}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                            <Trash2 size={15} /> Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto no-scrollbar w-full">
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize whitespace-nowrap shrink-0 ${tab === t ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                        {t === "all" ? `All (${total})` : t === "unread" ? `Unread (${unreadCount})` : t}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {loading && notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Bell size={40} className="mb-3 opacity-20" />
                        <p className="text-base font-medium">No notifications</p>
                        <p className="text-sm mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {notifications.map(n => (
                            <div key={n._id} onClick={() => handleRead(n)}
                                className={`flex items-start gap-4 px-4 sm:px-6 py-4 cursor-pointer hover:bg-gray-50 transition ${!n.isRead ? "bg-blue-50/30" : ""}`}>

                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${TYPE_COLOR[n.type] || TYPE_COLOR.system}`}>
                                    {TYPE_ICON[n.type] || "🔔"}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[11px] text-gray-400">{timeAgo(n.createdAt)}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${TYPE_COLOR[n.type] || TYPE_COLOR.system}`}>
                                                    {n.type}
                                                </span>
                                                {n.createdBy && (
                                                    <span className="text-[11px] text-gray-400">
                                                        by {n.createdBy.firstName} {n.createdBy.lastName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {!n.isRead && (
                                                <button onClick={async (e) => { e.stopPropagation(); await markAsRead(n._id); setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x)); setUnreadCount(c => Math.max(0, c - 1)); refresh(); }}
                                                    className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-400 transition" title="Mark as read">
                                                    <Check size={13} />
                                                </button>
                                            )}
                                            <button onClick={(e) => handleDelete(e, n._id)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition" title="Delete">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Unread dot */}
                                {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />}
                            </div>
                        ))}
                    </div>
                )}

                {/* Load more */}
                {hasMore && (
                    <div className="px-6 py-4 border-t border-gray-100 text-center">
                        <button onClick={() => { setPage(p => p + 1); load(); }}
                            disabled={loading}
                            className="text-sm text-blue-500 hover:text-blue-700 font-medium disabled:opacity-50">
                            {loading ? "Loading..." : "Load more"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
