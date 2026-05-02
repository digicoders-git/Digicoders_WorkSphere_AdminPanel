import React, { useEffect, useState } from "react";
import { useStore } from "../context/StoreContext";
import { Link } from "react-router-dom";
import {
    Users, Building2, FolderKanban, ShieldCheck, Clock,
    LogIn, LogOut, CheckCircle, AlertCircle, TrendingUp,
    ArrowRight, Calendar, Timer, MapPin
} from "lucide-react";
import { fetchUsers } from "../modules/employee/services/UserService";
import { fetchAllCompaniesList } from "../modules/company/services/companyService";
import { getAllCompanyDepartments } from "../modules/department/services/departmentService";
import { getTodayAttendance, getAttendanceSummary, getCompanyAttendance } from "../modules/attendance/services/attendanceService";
import { checkIn, checkOut } from "../modules/attendance/services/attendanceService";
import { getMyTaskHistory } from "../modules/projects/services/projectService";
import { toast } from "react-toastify";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const fmt = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const STATUS = {
    present:       "bg-green-50 text-green-700",
    late:          "bg-yellow-50 text-yellow-700",
    "half-day":    "bg-orange-50 text-orange-700",
    "early-leave": "bg-purple-50 text-purple-700",
    absent:        "bg-red-50 text-red-500",
};

const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
        async ({ coords: { latitude, longitude } }) => {
            let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            try {
                const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                const d = await r.json();
                address = d.display_name || address;
            } catch { }
            resolve({ latitude, longitude, address });
        },
        (e) => reject(new Error(e.message)),
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

const StatCard = ({ icon: Icon, label, value, sub, color, to }) => {
    const inner = (
        <div className={`bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition group ${to ? "cursor-pointer hover:border-blue-200" : ""}`}>
            <div className={`p-3 rounded-xl shrink-0 ${color}`}><Icon size={22} /></div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
            {to && <ArrowRight size={16} className="ml-auto text-gray-300 group-hover:text-blue-500 transition shrink-0" />}
        </div>
    );
    return to ? <Link to={to}>{inner}</Link> : inner;
};

const Home = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin;
    const canSee = (perms) => !perms.length || perms.some(p => permissions.includes(p));

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    const [time, setTime] = useState(new Date());
    const [stats, setStats] = useState({ users: null, companies: null, departments: null });
    const [today, setToday] = useState(null);
    const [summary, setSummary] = useState(null);
    const [teamToday, setTeamToday] = useState([]);
    const [taskHistory, setTaskHistory] = useState([]);
    const [location, setLocation] = useState(null);
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);

    // Fetch location
    useEffect(() => {
        setLocating(true);
        getLocation().then(l => setLocation(l)).catch(e => setLocationError(e.message)).finally(() => setLocating(false));
    }, []);

    // Load all stats
    useEffect(() => {
        const load = async () => {
            const results = await Promise.allSettled([
                canSee(["VIEW_USER", "VIEW_ALL_USERS"]) ? fetchUsers() : Promise.resolve(null),
                canSee(["VIEW_COMPANY", "VIEW_ALL_COMPANIES"]) ? fetchAllCompaniesList() : Promise.resolve(null),
                canSee(["VIEW_DEPARTMENT", "VIEW_ALL_DEPARTMENTS"]) ? getAllCompanyDepartments() : Promise.resolve(null),
            ]);
            setStats({
                users: results[0].value?.users?.length ?? null,
                companies: results[1].value?.companies?.length ?? null,
                departments: results[2].value?.departments?.length ?? null,
            });
        };
        load();
    }, []);

    // Load attendance
    useEffect(() => {
        getTodayAttendance().then(d => setToday(d.record)).catch(() => {});
        getAttendanceSummary(currentMonth()).then(d => setSummary(d.summary)).catch(() => {});
        if (isAdmin) {
            getCompanyAttendance({ date: new Date().toISOString().split("T")[0] })
                .then(d => setTeamToday(d.records || [])).catch(() => {});
        } else {
            getMyTaskHistory().then(r => setTaskHistory(r.data?.data || [])).catch(() => {});
        }
    }, [isAdmin]);

    const doCheckIn = async () => {
        if (!location) return toast.error("Location unavailable");
        try {
            setActionLoading(true);
            await checkIn(location);
            toast.success("Checked in!");
            const d = await getTodayAttendance(); setToday(d.record);
        } catch (e) { toast.error(e?.response?.data?.message || "Check-in failed"); }
        finally { setActionLoading(false); }
    };

    const doCheckOut = async () => {
        if (!location) return toast.error("Location unavailable");
        try {
            setActionLoading(true);
            await checkOut(location);
            toast.success("Checked out!");
            const d = await getTodayAttendance(); setToday(d.record);
        } catch (e) { toast.error(e?.response?.data?.message || "Check-out failed"); }
        finally { setActionLoading(false); }
    };

    const checkedIn = !!today?.checkIn;
    const checkedOut = !!today?.checkOut;

    return (
        <div className="p-6 bg-gray-50 min-h-screen space-y-6">

            {/* Welcome */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{greeting}, {user?.firstName}! 👋</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        &nbsp;·&nbsp;
                        <span className="tabular-nums font-medium text-gray-700">
                            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                        </span>
                    </p>
                </div>
                {user?.companyId?.name && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-medium border border-blue-100">
                        {user.companyId.name}
                    </span>
                )}
            </div>

            {/* Org Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {canSee(["VIEW_USER", "VIEW_ALL_USERS"]) && (
                    <StatCard icon={Users} label="Employees" value={stats.users} sub="Total registered" color="bg-blue-50 text-blue-600" to="/users" />
                )}
                {canSee(["VIEW_COMPANY", "VIEW_ALL_COMPANIES"]) && (
                    <StatCard icon={Building2} label="Companies" value={stats.companies} sub="Active organizations" color="bg-purple-50 text-purple-600" to="/companies" />
                )}
                {canSee(["VIEW_DEPARTMENT", "VIEW_ALL_DEPARTMENTS"]) && (
                    <StatCard icon={FolderKanban} label="Departments" value={stats.departments} sub="Across all companies" color="bg-green-50 text-green-600" to="/departments" />
                )}
                {summary && (
                    <StatCard icon={TrendingUp} label="Hours This Month" value={`${summary.totalHours}h`} sub={`${summary.totalDays} days tracked`} color="bg-indigo-50 text-indigo-600" to="/attendance" />
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Check-in Card */}
                <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800">Today's Attendance</h2>
                        <Link to="/attendance" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
                    </div>

                    {/* Clock */}
                    <div className="text-center py-2">
                        <p className="text-4xl font-bold text-gray-900 tabular-nums">
                            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                        </p>
                    </div>

                    {/* Location */}
                    <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${locationError ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-500"}`}>
                        <MapPin size={12} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{locating ? "Detecting..." : locationError || location?.address || "—"}</span>
                    </div>

                    {/* Shift */}
                    {today?.workShiftId && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                            <Clock size={12} />
                            <span><strong>{today.workShiftId.name}</strong> · {today.workShiftId.startTime} – {today.workShiftId.endTime}</span>
                        </div>
                    )}

                    {/* Status */}
                    {today && (
                        <div className="flex flex-wrap gap-3 text-sm">
                            <span className="flex items-center gap-1.5 text-green-600"><LogIn size={14} /> {fmt(today.checkIn)}</span>
                            {today.checkOut && <span className="flex items-center gap-1.5 text-red-500"><LogOut size={14} /> {fmt(today.checkOut)}</span>}
                            {today.workHours > 0 && <span className="flex items-center gap-1.5 text-blue-600"><Timer size={14} /> {today.workHours}h</span>}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS[today.status]}`}>{today.status}</span>
                        </div>
                    )}

                    {/* Action */}
                    <div className="mt-auto pt-2">
                        {!checkedIn && (
                            <button onClick={doCheckIn} disabled={actionLoading || locating || !!locationError}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                <LogIn size={16} /> {actionLoading ? "Processing..." : "Check In"}
                            </button>
                        )}
                        {checkedIn && !checkedOut && (
                            <button onClick={doCheckOut} disabled={actionLoading || locating || !!locationError}
                                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                <LogOut size={16} /> {actionLoading ? "Processing..." : "Check Out"}
                            </button>
                        )}
                        {checkedIn && checkedOut && (
                            <div className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2.5 rounded-xl text-sm font-medium">
                                <CheckCircle size={16} /> Day complete!
                            </div>
                        )}
                    </div>
                </div>

                {/* Monthly Summary */}
                <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Monthly Summary</h2>
                        <span className="text-xs text-gray-400">{currentMonth()}</span>
                    </div>
                    {summary ? (
                        <div className="space-y-3">
                            {[
                                { label: "Present",     value: summary.present,    total: summary.totalDays, color: "bg-green-500" },
                                { label: "Late",        value: summary.late,       total: summary.totalDays, color: "bg-yellow-400" },
                                { label: "Half Day",    value: summary.halfDay,    total: summary.totalDays, color: "bg-orange-400" },
                                { label: "Early Leave", value: summary.earlyLeave, total: summary.totalDays, color: "bg-purple-400" },
                            ].map(({ label, value, total, color }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>{label}</span>
                                        <span className="font-medium text-gray-700">{value} days</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${color}`} style={{ width: total ? `${(value / total) * 100}%` : "0%" }} />
                                    </div>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
                                <span className="text-gray-500">Total Hours</span>
                                <span className="font-bold text-gray-800">{summary.totalHours}h</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-8">No attendance data yet.</p>
                    )}
                </div>

                {/* Team Today (admin only) */}
                {isAdmin ? (
                    <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-800">Team Today</h2>
                            <Link to="/attendance" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
                        </div>
                        {teamToday.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">No check-ins today yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
                                {teamToday.slice(0, 8).map(r => (
                                    <div key={r._id} className="flex items-center gap-3">
                                        {r.userId?.profilePic?.url
                                            ? <img src={r.userId.profilePic.url} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                                            : <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{r.userId?.firstName?.[0]}{r.userId?.lastName?.[0]}</div>}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{r.userId?.firstName} {r.userId?.lastName}</p>
                                            <p className="text-xs text-gray-400">{fmt(r.checkIn)} {r.checkOut ? `→ ${fmt(r.checkOut)}` : "· still in"}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${STATUS[r.status]}`}>{r.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Task History for non-admin */
                    <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-800">My Task History</h2>
                            <Link to="/projects" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View projects <ArrowRight size={12} /></Link>
                        </div>
                        {taskHistory.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">No task assignments yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
                                {taskHistory.map(t => (
                                    <div key={t._id} className="border border-gray-100 rounded-xl p-3">
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize shrink-0">{t.status?.replace("_", " ")}</span>
                                        </div>
                                        {t.project?.name && (
                                            <p className="text-[10px] text-blue-500 mb-1.5">{t.project.name}</p>
                                        )}
                                        <div className="space-y-1">
                                            {t.history.slice(0, 3).map((h, i) => (
                                                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                        h.action === "assigned" ? "bg-green-500" : "bg-red-400"
                                                    }`} />
                                                    <span className={h.action === "assigned" ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                                                        {h.action === "assigned" ? "Assigned" : "Removed"}
                                                    </span>
                                                    <span className="text-gray-400 ml-auto">
                                                        {new Date(h.at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Quick Links (admin) */}
            {isAdmin && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Access</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                            { label: "Employees",   icon: Users,        path: "/users",          color: "bg-blue-50 text-blue-600",   perms: ["VIEW_USER","VIEW_ALL_USERS"] },
                            { label: "Companies",   icon: Building2,    path: "/companies",      color: "bg-purple-50 text-purple-600", perms: ["VIEW_COMPANY","VIEW_ALL_COMPANIES"] },
                            { label: "Departments", icon: FolderKanban, path: "/departments",    color: "bg-green-50 text-green-600",  perms: ["VIEW_DEPARTMENT","VIEW_ALL_DEPARTMENTS"] },
                            { label: "Roles",       icon: ShieldCheck,  path: "/settings/roles", color: "bg-orange-50 text-orange-600", perms: ["VIEW_ROLE","VIEW_ALL_ROLES"] },
                            { label: "Attendance",  icon: Calendar,     path: "/attendance",     color: "bg-cyan-50 text-cyan-600",    perms: [] },
                            { label: "Work Shifts", icon: Clock,        path: "/work-shifts",    color: "bg-indigo-50 text-indigo-600", perms: [] },
                        ].filter(c => canSee(c.perms)).map(c => (
                            <Link key={c.path} to={c.path} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md hover:border-blue-200 transition group">
                                <div className={`p-2.5 rounded-xl ${c.color}`}><c.icon size={18} /></div>
                                <span className="text-xs font-medium text-gray-600 group-hover:text-blue-600 transition">{c.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
