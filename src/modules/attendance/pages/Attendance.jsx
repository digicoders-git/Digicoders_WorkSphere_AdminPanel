import React, { useEffect, useState, useCallback } from "react";
import { useStore } from "../../../context/StoreContext";
import {
    checkIn, checkOut, getTodayAttendance,
    getMyAttendance, getAttendanceSummary, getCompanyAttendance, getTeamAttendance,
    requestRegularization, getMyRegularizations, getCompanyRegularizations, getTeamRegularizations,
    approveRegularization, rejectRegularization
} from "../services/attendanceService";
import { getHolidays, getMyLeaves, getCompanyLeaves } from "../../leave/services/leaveService";
import {
    MapPin, Clock, LogIn, LogOut, CheckCircle, AlertCircle,
    Timer, TrendingUp, Calendar, RefreshCw, ChevronLeft, ChevronRight, Palmtree,
    FileEdit, Check, X, Download, BarChart2
} from "lucide-react";
import { toast } from "react-toastify";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const currentMonth = () => new Date().toISOString().slice(0, 7);
const fmtHours = (h) => {
    if (!h && h !== 0) return "—";
    const totalMins = Math.round(h * 60);
    const hh = Math.floor(totalMins / 60);
    const mm = totalMins % 60;
    if (hh === 0) return `${mm}m`;
    if (mm === 0) return `${hh}h`;
    return `${hh}h ${mm}m`;
};

const STATUS = {
    present:       { cls: "bg-green-50 text-green-700",   dot: "bg-green-500",   label: "Present" },
    late:          { cls: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-400",  label: "Late" },
    "half-day":    { cls: "bg-orange-50 text-orange-700", dot: "bg-orange-400",  label: "Half Day" },
    "early-leave": { cls: "bg-purple-50 text-purple-700", dot: "bg-purple-400",  label: "Early Leave" },
    absent:        { cls: "bg-red-50 text-red-500",       dot: "bg-red-400",     label: "Absent" },
    regularized:   { cls: "bg-blue-50 text-blue-700",     dot: "bg-blue-500",    label: "Regularized" },
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
            } catch { /* fallback */ }
            resolve({ latitude, longitude, address });
        },
        (e) => reject(new Error(e.message)),
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

// ── StatCard ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${color}`}><Icon size={18} /></div>
        <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

// ── Calendar ──────────────────────────────────────────────────────────────────
const AttendanceCalendar = ({ records, holidays, leaves, weekOff, month, onMonthChange }) => {
    const [selected, setSelected] = useState(null);

    const [year, mon] = month.split("-").map(Number);
    const firstDay = new Date(year, mon - 1, 1).getDay();
    const daysInMonth = new Date(year, mon, 0).getDate();
    const today = new Date().toISOString().split("T")[0];

    const recordMap = {};
    records.forEach(r => { recordMap[r.date] = r; });
    const holidayMap = {};
    holidays.forEach(h => { holidayMap[h.date] = h; });

    // leaves that cover a given date (pending or approved)
    const activeLeaves = leaves.filter(l => ["pending", "approved"].includes(l.status));
    const leaveForDate = (ds) => activeLeaves.find(l => ds >= l.fromDate && ds <= l.toDate) || null;

    const prevMonth = () => {
        const d = new Date(year, mon - 2, 1);
        onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        setSelected(null);
    };
    const nextMonth = () => {
        const d = new Date(year, mon, 1);
        onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        setSelected(null);
    };

    const monthLabel = new Date(year, mon - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const selectedDateStr = selected
        ? `${year}-${String(mon).padStart(2, "0")}-${String(selected).padStart(2, "0")}`
        : null;
    const selectedRecord  = selectedDateStr ? recordMap[selectedDateStr] : null;
    const selectedHoliday = selectedDateStr ? holidayMap[selectedDateStr] : null;
    const selectedLeave   = selectedDateStr ? leaveForDate(selectedDateStr) : null;
    const selectedDayLabel = selected
        ? new Date(year, mon - 1, selected).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
        : null;

    return (
        <div className="flex flex-col lg:flex-row gap-5">
            {/* ── Calendar grid ── */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm w-full lg:max-w-md xl:max-w-lg shrink-0">
                {/* Month nav */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="font-semibold text-gray-800 text-base">{monthLabel}</h3>
                    <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="p-4">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                        {days.map(d => (
                            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
                        ))}
                    </div>

                    {/* Date cells */}
                    <div className="grid grid-cols-7 gap-1.5">
                        {cells.map((day, idx) => {
                            if (!day) return <div key={`e-${idx}`} />;
                            const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const rec     = recordMap[dateStr];
                            const holiday = holidayMap[dateStr];
                            const leave   = leaveForDate(dateStr);
                            const isToday = dateStr === today;
                            const isSelected = selected === day;
                            const isFuture = dateStr > today;
                            const dayOfWeek = new Date(dateStr).getDay();
                            const isWeekOff = weekOff.includes(dayOfWeek);
                            const inTime = rec?.checkIn ? new Date(rec.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : null;
                            const outTime = rec?.checkOut ? new Date(rec.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : null;

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelected(isSelected ? null : day)}
                                    className={[
                                        "relative flex flex-col items-center justify-start pt-2 pb-1.5 px-0.5 rounded-xl transition",
                                        rec ? "h-[72px] sm:h-20" : "h-12 sm:h-14",
                                        isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "",
                                        isToday && !isSelected ? "ring-2 ring-blue-300 bg-blue-50/40" : "",
                                        holiday && !isSelected ? "bg-pink-50/60" : "",
                                        leave && !holiday && !isSelected ? "bg-teal-50/60" : "",
                                        isWeekOff && !holiday && !isSelected && !isToday ? "bg-gray-100/80" : "",
                                        !isSelected && !isToday && !holiday && !isWeekOff ? "hover:bg-gray-50" : "",
                                        isFuture && !holiday ? "opacity-25" : "",
                                    ].filter(Boolean).join(" ")}
                                >
                                    {/* Day number */}
                                    <span className={`text-sm font-semibold leading-none ${
                                        isToday ? "text-blue-600" : isSelected ? "text-blue-700" : holiday ? "text-pink-600" : leave ? "text-teal-600" : isWeekOff ? "text-gray-400" : "text-gray-700"
                                    }`}>{day}</span>

                                    {/* Dots row */}
                                    <div className="flex gap-0.5 mt-1 justify-center">
                                        {rec && (
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                rec.status === "present" ? "bg-green-500" :
                                                rec.status === "late" ? "bg-yellow-400" :
                                                rec.status === "half-day" ? "bg-orange-400" :
                                                rec.status === "early-leave" ? "bg-purple-400" :
                                                rec.status === "regularized" ? "bg-blue-500" :
                                                "bg-red-400"
                                            }`} />
                                        )}
                                        {!rec && !holiday && (
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                isFuture || isWeekOff ? "bg-transparent" : "bg-gray-200"
                                            }`} />
                                        )}
                                        {holiday && <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />}
                                        {leave && !holiday && <div className={`w-1.5 h-1.5 rounded-full ${leave.status === "approved" ? "bg-teal-500" : "bg-yellow-400"}`} />}
                                    </div>

                                    {/* In/Out times */}
                                    {rec && (
                                        <div className="mt-0.5 w-full px-0.5 space-y-0.5">
                                            <div className={`w-full text-center text-[9px] sm:text-[10px] font-semibold leading-tight rounded px-0.5 py-0.5 ${
                                                rec.status === "present" ? "bg-green-100 text-green-700" :
                                                rec.status === "late" ? "bg-yellow-100 text-yellow-700" :
                                                rec.status === "half-day" ? "bg-orange-100 text-orange-700" :
                                                rec.status === "early-leave" ? "bg-purple-100 text-purple-700" :
                                                rec.status === "regularized" ? "bg-blue-100 text-blue-700" :
                                                "bg-red-100 text-red-600"
                                            }`}>
                                                {inTime || "—"}
                                            </div>
                                            {outTime && (
                                                <div className="w-full text-center text-[9px] sm:text-[10px] font-medium leading-tight rounded px-0.5 py-0.5 bg-gray-100 text-gray-500">
                                                    {outTime}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Week off label */}
                                    {isWeekOff && !holiday && !rec && (
                                        <span className="mt-0.5 text-[8px] font-medium text-gray-400 leading-tight">off</span>
                                    )}

                                    {/* Leave label (no attendance) */}
                                    {leave && !rec && !holiday && (
                                        <span className="mt-0.5 text-[8px] sm:text-[9px] font-semibold leading-tight text-center px-0.5 line-clamp-1 w-full text-teal-600">
                                            {leave.leaveTypeId?.name || "Leave"}
                                        </span>
                                    )}

                                    {/* Holiday label (no attendance) */}
                                    {holiday && !rec && (
                                        <span className="mt-0.5 text-[8px] sm:text-[9px] font-semibold text-pink-500 leading-tight text-center px-0.5 line-clamp-1 w-full">
                                            {holiday.name}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-gray-100">
                        {Object.entries(STATUS).map(([, val]) => (
                            <div key={val.label} className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${val.dot}`} />
                                <span className="text-xs text-gray-500">{val.label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-xs text-gray-500">Regularized</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-teal-500" />
                            <span className="text-xs text-gray-500">Leave (Approved)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-yellow-400" />
                            <span className="text-xs text-gray-500">Leave (Pending)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-pink-500" />
                            <span className="text-xs text-gray-500">Holiday</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                            <span className="text-xs text-gray-500">Week Off</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-gray-200" />
                            <span className="text-xs text-gray-500">No record</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Detail panel ── */}
            <div className="flex-1">
                {selected ? (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 h-full">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-base font-semibold text-gray-800">{selectedDayLabel}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{month}</p>
                            </div>
                            {selectedRecord && (
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS[selectedRecord.status]?.cls}`}>
                                    {selectedRecord.status}
                                </span>
                            )}
                        </div>

                        {selectedHoliday && (
                            <div className="bg-pink-50 border border-pink-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
                                <Palmtree size={16} className="text-pink-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-pink-700">{selectedHoliday.name}</p>
                                    {selectedHoliday.description && <p className="text-xs text-pink-500 mt-0.5">{selectedHoliday.description}</p>}
                                    <span className="text-[10px] text-pink-400 capitalize">{selectedHoliday.type}</span>
                                </div>
                            </div>
                        )}

                        {selectedLeave && (
                            <div className={`border rounded-xl px-4 py-3 mb-4 flex items-start gap-3 ${
                                selectedLeave.status === "approved" ? "bg-teal-50 border-teal-200" : "bg-yellow-50 border-yellow-200"
                            }`}>
                                <Palmtree size={16} className={`mt-0.5 shrink-0 ${selectedLeave.status === "approved" ? "text-teal-500" : "text-yellow-500"}`} />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className={`text-sm font-semibold ${selectedLeave.status === "approved" ? "text-teal-700" : "text-yellow-700"}`}>
                                            {selectedLeave.leaveTypeId?.name || "Leave"}
                                        </p>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${
                                            selectedLeave.status === "approved" ? "bg-teal-100 text-teal-700" : "bg-yellow-100 text-yellow-700"
                                        }`}>{selectedLeave.status}</span>
                                        {selectedLeave.isHalfDay && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">Half Day</span>}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{selectedLeave.fromDate} → {selectedLeave.toDate} · {selectedLeave.days} day{selectedLeave.days !== 1 ? "s" : ""}</p>
                                    {selectedLeave.reason && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{selectedLeave.reason}</p>}
                                </div>
                            </div>
                        )}

                        {selectedRecord ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-green-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-400 mb-1">Check In</p>
                                        <p className="text-lg font-bold text-green-600">{fmt(selectedRecord.checkIn)}</p>
                                    </div>
                                    <div className="bg-red-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-400 mb-1">Check Out</p>
                                        <p className="text-lg font-bold text-red-500">{fmt(selectedRecord.checkOut)}</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-400 mb-1">Hours Worked</p>
                                        <p className="text-lg font-bold text-blue-600">
                                            {selectedRecord.workHours > 0
                                                ? fmtHours(selectedRecord.workHours)
                                                : (selectedRecord.checkIn && selectedRecord.checkOut)
                                                    ? fmtHours((new Date(selectedRecord.checkOut) - new Date(selectedRecord.checkIn)) / 3600000)
                                                    : "—"}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-400 mb-1">Work Shift</p>
                                        <p className="text-sm font-semibold text-gray-700">{selectedRecord.workShiftId?.name || "—"}</p>
                                        {selectedRecord.workShiftId && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {selectedRecord.workShiftId.startTime} – {selectedRecord.workShiftId.endTime}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {selectedRecord.checkInLocation?.latitude && (
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-400 mb-2">Check-in Location</p>
                                        <a
                                            href={`https://maps.google.com/?q=${selectedRecord.checkInLocation.latitude},${selectedRecord.checkInLocation.longitude}`}
                                            target="_blank" rel="noreferrer"
                                            className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700 font-medium"
                                        >
                                            <MapPin size={14} /> View on Google Maps
                                        </a>
                                        {selectedRecord.checkInLocation.address && (
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{selectedRecord.checkInLocation.address}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : !selectedHoliday && !selectedLeave ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Calendar size={36} className="mb-3 opacity-20" />
                                <p className="text-sm font-medium">No attendance record</p>
                                <p className="text-xs mt-1">No data found for this day.</p>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 h-full flex flex-col items-center justify-center text-gray-400 min-h-[200px]">
                        <Calendar size={40} className="mb-3 opacity-20" />
                        <p className="text-sm font-medium">Select a day</p>
                        <p className="text-xs mt-1">Click any date on the calendar to view details.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── CSV Export helper ────────────────────────────────────────────────────────
const exportToCSV = (rows, filename) => {
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
};

// ── Main Component ────────────────────────────────────────────────────────────
// ── Regularization Tab ───────────────────────────────────────────────────────
const REG_TYPES = [
    { value: "missed-checkin",  label: "Missed Check-in" },
    { value: "missed-checkout", label: "Missed Check-out" },
    { value: "wrong-time",      label: "Wrong Time" },
    { value: "absent",          label: "Marked Absent" },
];
const REG_STATUS = {
    pending:  { cls: "bg-yellow-50 text-yellow-700 border-yellow-200",  label: "Pending" },
    approved: { cls: "bg-green-50 text-green-700 border-green-200",    label: "Approved" },
    rejected: { cls: "bg-red-50 text-red-600 border-red-200",          label: "Rejected" },
};

const RegularizationTab = ({ isAdmin, showTeamTab, canApprove, canReject }) => {
    const [myRegs, setMyRegs] = useState([]);
    const [teamRegs, setTeamRegs] = useState([]);
    const [view, setView] = useState("my");
    const [form, setForm] = useState({ date: "", type: "wrong-time", requestedCheckIn: "", requestedCheckOut: "", reason: "" });
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [teamFilter, setTeamFilter] = useState("pending");

    const loadMy = async () => {
        try { const d = await getMyRegularizations(); setMyRegs(d.regularizations || []); } catch { }
    };
    const loadTeam = async () => {
        try {
            const fn = isAdmin ? getCompanyRegularizations : getTeamRegularizations;
            const d = await fn({ status: teamFilter || undefined });
            setTeamRegs(d.regularizations || []);
        } catch { }
    };

    useEffect(() => { loadMy(); }, []);
    useEffect(() => { if (view === "team") loadTeam(); }, [view, teamFilter, isAdmin]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.date || !form.reason.trim()) return toast.error("Date and reason are required");
        try {
            setSubmitting(true);
            await requestRegularization(form);
            toast.success("Regularization request submitted");
            setShowForm(false);
            setForm({ date: "", type: "wrong-time", requestedCheckIn: "", requestedCheckOut: "", reason: "" });
            loadMy();
        } catch (e) { toast.error(e?.response?.data?.message || "Failed to submit"); }
        finally { setSubmitting(false); }
    };

    const handleApprove = async (id) => {
        try {
            await approveRegularization(id);
            toast.success("Approved");
            loadTeam();
        } catch (e) { toast.error(e?.response?.data?.message || "Failed to approve"); }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return toast.error("Enter rejection reason");
        try {
            await rejectRegularization(rejectModal, { rejectionReason: rejectReason });
            toast.success("Rejected");
            setRejectModal(null); setRejectReason("");
            loadTeam();
        } catch (e) { toast.error(e?.response?.data?.message || "Failed to reject"); }
    };

    const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

    return (
        <div>
            <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
                <button onClick={() => setView("my")}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${view === "my" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                    My Requests
                </button>
                {showTeamTab && (
                    <button onClick={() => setView("team")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${view === "team" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                        Team Requests
                    </button>
                )}
            </div>

            {view === "my" && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setShowForm(v => !v)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                            <FileEdit size={15} /> {showForm ? "Cancel" : "New Request"}
                        </button>
                    </div>

                    {showForm && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
                            <h3 className="text-base font-semibold text-gray-800 mb-4">Request Attendance Regularization</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date <span className="text-red-500">*</span></label>
                                        <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                                            max={new Date().toISOString().split("T")[0]}
                                            className={inputCls} required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type</label>
                                        <select value={form.type} onChange={e => set("type", e.target.value)} className={inputCls}>
                                            {REG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Requested Check-in</label>
                                        <input type="time" value={form.requestedCheckIn} onChange={e => set("requestedCheckIn", e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Requested Check-out</label>
                                        <input type="time" value={form.requestedCheckOut} onChange={e => set("requestedCheckOut", e.target.value)} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Reason <span className="text-red-500">*</span></label>
                                    <textarea value={form.reason} onChange={e => set("reason", e.target.value)} rows={3}
                                        className={inputCls} placeholder="Explain why regularization is needed" required />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={() => setShowForm(false)}
                                        className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={submitting}
                                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                                        {submitting ? "Submitting..." : "Submit Request"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {myRegs.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                            <FileEdit size={40} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No regularization requests yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myRegs.map(r => (
                                <div key={r._id} className="bg-white border border-gray-200 rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="font-semibold text-gray-800">{r.date}</span>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                                                    {REG_TYPES.find(t => t.value === r.type)?.label || r.type}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${REG_STATUS[r.status]?.cls}`}>
                                                    {r.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-1">
                                                {r.requestedCheckIn && <span>Check-in: <strong>{r.requestedCheckIn}</strong></span>}
                                                {r.requestedCheckOut && <span>Check-out: <strong>{r.requestedCheckOut}</strong></span>}
                                            </div>
                                            <p className="text-sm text-gray-500">{r.reason}</p>
                                            {r.rejectionReason && (
                                                <p className="mt-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                                                    Rejected: {r.rejectionReason}
                                                </p>
                                            )}
                                            {r.approvedBy && r.status === "approved" && (
                                                <p className="text-xs text-gray-400 mt-1">Approved by {r.approvedBy.firstName} {r.approvedBy.lastName}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "team" && showTeamTab && (
                <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {["pending", "approved", "rejected", ""].map(f => (
                            <button key={f} onClick={() => setTeamFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                                    teamFilter === f ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
                                }`}>
                                {f || "All"}
                                {f === "pending" && teamRegs.filter(r => r.status === "pending").length > 0 && (
                                    <span className="ml-1.5 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        {teamRegs.filter(r => r.status === "pending").length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {teamRegs.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                            <FileEdit size={40} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No regularization requests</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {teamRegs.map(r => (
                                <div key={r._id} className="bg-white border border-gray-200 rounded-xl p-4">
                                    <div className="flex items-start gap-4">
                                        {r.userId?.profilePic?.url
                                            ? <img src={r.userId.profilePic.url} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                                            : <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                                                {r.userId?.firstName?.[0]}{r.userId?.lastName?.[0]}
                                              </div>}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="font-semibold text-gray-800">{r.userId?.firstName} {r.userId?.lastName}</span>
                                                {r.userId?.employeeCode && <span className="text-xs text-gray-400">({r.userId.employeeCode})</span>}
                                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${REG_STATUS[r.status]?.cls}`}>
                                                    {r.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-1">
                                                <span className="font-medium text-gray-700">{r.date}</span>
                                                <span className="bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                                                    {REG_TYPES.find(t => t.value === r.type)?.label || r.type}
                                                </span>
                                                {r.requestedCheckIn && <span>In: <strong>{r.requestedCheckIn}</strong></span>}
                                                {r.requestedCheckOut && <span>Out: <strong>{r.requestedCheckOut}</strong></span>}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">{r.reason}</p>
                                            {r.rejectionReason && (
                                                <p className="mt-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                                                    Rejected: {r.rejectionReason}
                                                </p>
                                            )}
                                        </div>
                                        {r.status === "pending" && (canApprove || canReject) && (
                                            <div className="flex gap-2 shrink-0">
                                                {canApprove && (
                                                    <button onClick={() => handleApprove(r._id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-medium transition">
                                                        <Check size={13} /> Approve
                                                    </button>
                                                )}
                                                {canReject && (
                                                    <button onClick={() => { setRejectModal(r._id); setRejectReason(""); }}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition">
                                                        <X size={13} /> Reject
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {r.status !== "pending" && r.approvedBy && (
                                            <div className="shrink-0 text-right">
                                                <p className="text-[10px] text-gray-400">
                                                    {r.status === "approved" ? "Approved" : "Rejected"} by
                                                </p>
                                                <p className="text-xs font-medium text-gray-600">
                                                    {r.approvedBy.firstName} {r.approvedBy.lastName}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {rejectModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                                <h3 className="text-base font-semibold text-gray-900 mb-3">Reject Regularization</h3>
                                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                                    placeholder="Enter rejection reason..." />
                                <div className="flex gap-3 justify-end">
                                    <button onClick={() => setRejectModal(null)}
                                        className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button onClick={handleReject}
                                        className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">Reject</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const Attendance = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin;
    const permissions = user?.role?.permissions || [];
    const [hasDirectReports, setHasDirectReports] = useState(false);
    const showTeamTab = isAdmin || hasDirectReports;

    const [time, setTime] = useState(new Date());
    const [today, setToday] = useState(null);
    const [summary, setSummary] = useState(null);
    const [myRecords, setMyRecords] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [myLeaves, setMyLeaves] = useState([]);
    const [companyRecords, setCompanyRecords] = useState([]);
    const [month, setMonth] = useState(currentMonth());
    const [filterDate, setFilterDate] = useState("");
    const [filterEmployee, setFilterEmployee] = useState("");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");
    const [teamCalMonth, setTeamCalMonth] = useState(currentMonth());
    const [empLeaves, setEmpLeaves] = useState([]);
    const [locating, setLocating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState("my");
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState("");
    const [userShift, setUserShift] = useState(null);
    const weekOff = userShift?.weekOff ?? [0, 6];
    // #20 — Pagination
    const ITEMS_PER_PAGE = 25;
    const [teamPage, setTeamPage] = useState(1);

    // Live clock
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    // Fetch location on mount
    const fetchLoc = () => {
        setLocating(true);
        setLocationError("");
        getLocation()
            .then(l => { setLocation(l); })
            .catch(e => setLocationError(e.message))
            .finally(() => setLocating(false));
    };
    useEffect(fetchLoc, []);

    const loadToday = useCallback(async () => {
        try {
            const d = await getTodayAttendance();
            setToday(d.record);
            if (d.record?.workShiftId) setUserShift(d.record.workShiftId);
        } catch { }
    }, []);

    // Check if this user manages anyone (to show Team tab)
    useEffect(() => {
        if (isAdmin) { setHasDirectReports(true); return; }
        getTeamAttendance({ month })
            .then(d => setHasDirectReports((d.records || []).length > 0 || true))
            .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    const loadSummary = useCallback(async () => {
        try { const d = await getAttendanceSummary(month); setSummary(d.summary); } catch { }
    }, [month]);

    const loadMyRecords = useCallback(async () => {
        try { const d = await getMyAttendance(month); setMyRecords(d.records || []); } catch { }
    }, [month]);

    const loadHolidays = useCallback(async () => {
        try { const d = await getHolidays({ year: month.split("-")[0] }); setHolidays(d.holidays || []); } catch { }
    }, [month]);

    const loadMyLeaves = useCallback(async () => {
        try { const d = await getMyLeaves({ year: month.split("-")[0] }); setMyLeaves(d.leaves || []); } catch { }
    }, [month]);

    // Fetch selected employee's leaves for calendar view
    useEffect(() => {
        if (!filterEmployee) { setEmpLeaves([]); return; }
        const year = teamCalMonth.split("-")[0];
        getCompanyLeaves({ userId: filterEmployee, year })
            .then(d => setEmpLeaves(d.leaves || []))
            .catch(() => {});
    }, [filterEmployee, teamCalMonth]);

    const loadCompanyRecords = useCallback(async () => {
        if (!showTeamTab) return;
        try {
            const params = { month };
            const d = isAdmin
                ? await getCompanyAttendance(params)
                : await getTeamAttendance(params);
            setCompanyRecords(d.records || []);
        } catch { }
    }, [isAdmin, showTeamTab, month]);

    useEffect(() => { loadToday(); loadSummary(); loadMyRecords(); loadHolidays(); loadMyLeaves(); }, [loadToday, loadSummary, loadMyRecords, loadHolidays, loadMyLeaves]);
    useEffect(() => { if (tab === "team") loadCompanyRecords(); }, [tab, loadCompanyRecords]);

    const doCheckIn = async () => {
        if (!location) return toast.error("Location unavailable. Please refresh location.");
        try {
            setLoading(true);
            await checkIn(location);
            toast.success("Checked in successfully!");
            loadToday(); loadSummary(); loadMyRecords();
        } catch (e) { toast.error(e?.response?.data?.message || "Check-in failed"); }
        finally { setLoading(false); }
    };

    const doCheckOut = async () => {
        if (!location) return toast.error("Location unavailable. Please refresh location.");
        try {
            setLoading(true);
            await checkOut(location);
            toast.success("Checked out successfully!");
            loadToday(); loadSummary(); loadMyRecords();
        } catch (e) { toast.error(e?.response?.data?.message || "Check-out failed"); }
        finally { setLoading(false); }
    };

    const checkedIn = !!today?.checkIn;
    const lastPunch = today?.punches?.[today.punches.length - 1];
    const hasOpenPunch = lastPunch && !lastPunch.checkOut;
    const checkedOut = checkedIn && !hasOpenPunch && !!today?.checkOut;

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>
            </div>

            {/* Check-in Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                    {/* Live clock */}
                    <div className="shrink-0">
                        <p className="text-4xl sm:text-5xl font-bold text-gray-900 tabular-nums tracking-tight">
                            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            {time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                    </div>

                    <div className="flex-1 w-full space-y-3">
                        {/* Location */}
                        <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${locationError ? "bg-red-50 text-red-500" : "bg-green-50 text-green-700"}`}>
                            <MapPin size={13} className="mt-0.5 shrink-0" />
                            <span className="flex-1 line-clamp-1">
                                {locating ? "Detecting location..." : locationError || location?.address || "—"}
                            </span>
                            <button onClick={fetchLoc} className="shrink-0 text-blue-500 hover:text-blue-700 flex items-center gap-1">
                                <RefreshCw size={11} /> Refresh
                            </button>
                        </div>

                        {/* Shift */}
                        {userShift && (
                            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                                <Clock size={13} />
                                <span>Shift: <strong>{userShift.name}</strong> &nbsp;{userShift.startTime} – {userShift.endTime}</span>
                            </div>
                        )}

                        {/* Today status */}
                        {today && (
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <span className="flex items-center gap-1.5 text-green-600">
                                        <LogIn size={14} /> In: <strong>{fmt(today.checkIn)}</strong>
                                    </span>
                                    {today.checkOut && (
                                        <span className="flex items-center gap-1.5 text-red-500">
                                            <LogOut size={14} /> Out: <strong>{fmt(today.checkOut)}</strong>
                                        </span>
                                    )}
                                    {today.workHours > 0 && (
                                        <span className="flex items-center gap-1.5 text-blue-600">
                                            <Timer size={14} /> <strong>{fmtHours(today.workHours)}</strong>
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS[today.status]?.cls}`}>
                                        {today.status}
                                    </span>
                                </div>
                                {today.punches?.length > 1 && (
                                    <div className="flex flex-wrap gap-2">
                                        {today.punches.map((p, i) => (
                                            <div key={i} className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 flex items-center gap-1.5">
                                                <span className="text-gray-400">#{i + 1}</span>
                                                <span className="text-green-600">{fmt(p.checkIn)}</span>
                                                {p.checkOut && <><span className="text-gray-300">→</span><span className="text-red-500">{fmt(p.checkOut)}</span></>}
                                                {p.workHours > 0 && <span className="text-blue-500">({fmtHours(p.workHours)})</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3 pt-1">
                            {!checkedIn && (
                                <button onClick={doCheckIn} disabled={loading || locating || !!locationError}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                    <LogIn size={16} /> {loading ? "Processing..." : "Check In"}
                                </button>
                            )}
                            {checkedIn && hasOpenPunch && (
                                <button onClick={doCheckOut} disabled={loading || locating || !!locationError}
                                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                    <LogOut size={16} /> {loading ? "Processing..." : "Check Out"}
                                </button>
                            )}
                            {checkedIn && !hasOpenPunch && (
                                <button onClick={doCheckIn} disabled={loading || locating || !!locationError}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                    <LogIn size={16} /> {loading ? "Processing..." : "Check In Again"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
                    <StatCard icon={CheckCircle} label="Present"      value={summary.present}    color="bg-green-50 text-green-600" />
                    <StatCard icon={CheckCircle} label="Regularized"  value={summary.regularized || 0} color="bg-blue-50 text-blue-600" />
                    <StatCard icon={AlertCircle} label="Late"         value={summary.late}       color="bg-yellow-50 text-yellow-600" />
                    <StatCard icon={Clock}       label="Half Day"     value={summary.halfDay}    color="bg-orange-50 text-orange-600" />
                    <StatCard icon={LogOut}      label="Early Leave"  value={summary.earlyLeave} color="bg-purple-50 text-purple-600" />
                    <StatCard icon={Calendar}    label="Absent"       value={summary.absent}     color="bg-red-50 text-red-500" />
                    <StatCard icon={TrendingUp}  label="Total Hours"  value={fmtHours(summary.totalHours)} color="bg-indigo-50 text-indigo-600" />
                </div>
            )}

            {/* Tabs */}
            {showTeamTab && (
                <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
                    {["my", "team", "regularization", "report"].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                            {t === "my" ? "My Attendance" : t === "team" ? "Team Attendance" : t === "report" ? "Reports" : "Regularization"}
                        </button>
                    ))}
                </div>
            )}
            {!showTeamTab && (
                <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
                    {["my", "regularization"].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                            {t === "my" ? "My Attendance" : "Regularization"}
                        </button>
                    ))}
                </div>
            )}

            {/* ── My Attendance — Calendar ── */}
            {tab === "my" && (
                <AttendanceCalendar
                    records={myRecords}
                    holidays={holidays}
                    leaves={myLeaves}
                    weekOff={weekOff}
                    month={month}
                    onMonthChange={setMonth}
                />
            )}

            {/* ── Team Attendance — Table + Calendar ── */}
            {tab === "team" && showTeamTab && (() => {
                const employeeMap = {};
                companyRecords.forEach(r => {
                    if (r.userId?._id && !employeeMap[r.userId._id])
                        employeeMap[r.userId._id] = r.userId;
                });
                const employees = Object.values(employeeMap);

                const filtered = companyRecords.filter(r => {
                    if (filterEmployee && r.userId?._id !== filterEmployee) return false;
                    if (filterFrom && r.date < filterFrom) return false;
                    if (filterTo   && r.date > filterTo)   return false;
                    return true;
                });

                const clearFilters = () => { setFilterEmployee(""); setFilterFrom(""); setFilterTo(""); setTeamPage(1); };
                const hasFilter = filterEmployee || filterFrom || filterTo;

                const empRecords = filterEmployee
                    ? companyRecords.filter(r => r.userId?._id === filterEmployee)
                    : [];
                const selectedEmp = filterEmployee ? employeeMap[filterEmployee] : null;
                const empWeekOff = empRecords[0]?.workShiftId?.weekOff ?? [0, 6];

                // #20 — Pagination
                const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                const paginated = filtered.slice((teamPage - 1) * ITEMS_PER_PAGE, teamPage * ITEMS_PER_PAGE);

                // #11 — CSV Export
                const handleExport = () => {
                    const headers = ["Employee", "Code", "Date", "Shift", "Check In", "Check Out", "Hours", "Status"];
                    const rows = filtered.map(r => [
                        `${r.userId?.firstName ?? ""} ${r.userId?.lastName ?? ""}`,
                        r.userId?.employeeCode ?? "",
                        r.date,
                        r.workShiftId?.name ?? "",
                        fmt(r.checkIn),
                        fmt(r.checkOut),
                        fmtHours(r.workHours),
                        r.status,
                    ]);
                    exportToCSV([headers, ...rows], `attendance_${month}.csv`);
                };

                return (
                    <div>
                        {/* Filter bar */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
                            <div className="flex flex-col gap-1 min-w-[180px]">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employee</label>
                                <select value={filterEmployee} onChange={e => { setFilterEmployee(e.target.value); setTeamCalMonth(currentMonth()); }}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                    <option value="">All employees</option>
                                    {employees.map(e => (
                                        <option key={e._id} value={e._id}>
                                            {e.firstName} {e.lastName}{e.employeeCode ? ` (${e.employeeCode})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {!filterEmployee && (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">From</label>
                                        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">To</label>
                                        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                                            min={filterFrom || undefined}
                                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                    </div>
                                </>
                            )}

                            <div className="flex items-center gap-3 ml-auto">
                                {hasFilter && (
                                    <button onClick={clearFilters}
                                        className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 transition">
                                        Clear filters
                                    </button>
                                )}
                                {!filterEmployee && (
                                    <>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Month</label>
                                            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                        </div>
                                        <span className="text-xs text-gray-400 self-end pb-2">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
                                    </>
                                )}
                                {!filterEmployee && filtered.length > 0 && (
                                    <button onClick={handleExport}
                                        className="self-end mb-0.5 flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-medium transition">
                                        <Download size={13} /> Export CSV
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Calendar view when employee selected */}
                        {filterEmployee && selectedEmp ? (
                            <div>
                                <div className="flex items-center gap-3 mb-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
                                    {selectedEmp.profilePic?.url
                                        ? <img src={selectedEmp.profilePic.url} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                                        : <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                                            {selectedEmp.firstName?.[0]}{selectedEmp.lastName?.[0]}
                                          </div>}
                                    <div>
                                        <p className="font-semibold text-gray-800">{selectedEmp.firstName} {selectedEmp.lastName}</p>
                                        {selectedEmp.employeeCode && <p className="text-xs text-gray-400">{selectedEmp.employeeCode}</p>}
                                    </div>
                                </div>
                                <AttendanceCalendar
                                    records={empRecords}
                                    holidays={holidays}
                                    leaves={empLeaves}
                                    weekOff={empWeekOff}
                                    month={teamCalMonth}
                                    onMonthChange={setTeamCalMonth}
                                />
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                            <th className="px-4 py-3 text-left">Employee</th>
                                            <th className="px-4 py-3 text-left">Date</th>
                                            <th className="px-4 py-3 text-left">Shift</th>
                                            <th className="px-4 py-3 text-left">Check In</th>
                                            <th className="px-4 py-3 text-left">Check Out</th>
                                            <th className="px-4 py-3 text-left">Hours</th>
                                            <th className="px-4 py-3 text-left">Status</th>
                                            <th className="px-4 py-3 text-left">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filtered.length === 0 ? (
                                            <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No records found.</td></tr>
                                        ) : paginated.map(r => (
                                            <tr key={r._id} className="hover:bg-gray-50 transition">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {r.userId?.profilePic?.url
                                                            ? <img src={r.userId.profilePic.url} className="w-7 h-7 rounded-full object-cover" alt="" />
                                                            : <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                                {r.userId?.firstName?.[0]}{r.userId?.lastName?.[0]}
                                                              </div>}
                                                        <div>
                                                            <p className="font-medium text-gray-800">{r.userId?.firstName} {r.userId?.lastName}</p>
                                                            <p className="text-xs text-gray-400">{r.userId?.employeeCode}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{fmtDate(r.date)}</td>
                                                <td className="px-4 py-3">
                                                    {r.workShiftId
                                                        ? <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{r.workShiftId.name}</span>
                                                        : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-green-600">{fmt(r.checkIn)}</td>
                                                <td className="px-4 py-3 text-red-500">{fmt(r.checkOut)}</td>
                                                <td className="px-4 py-3 text-gray-600">{fmtHours(r.workHours)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS[r.status]?.cls}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.checkInLocation?.latitude
                                                        ? <a href={`https://maps.google.com/?q=${r.checkInLocation.latitude},${r.checkInLocation.longitude}`}
                                                            target="_blank" rel="noreferrer"
                                                            className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                                                            <MapPin size={11} /> View
                                                          </a>
                                                        : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!filterEmployee && totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 px-1">
                                <span className="text-xs text-gray-400">
                                    Showing {(teamPage-1)*ITEMS_PER_PAGE+1}&#8211;{Math.min(teamPage*ITEMS_PER_PAGE,filtered.length)} of {filtered.length}
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={()=>setTeamPage(p=>Math.max(1,p-1))} disabled={teamPage===1} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Prev</button>
                                    {Array.from({length:Math.min(5,totalPages)},(_,i)=>{const pg=Math.max(1,Math.min(totalPages-4,teamPage-2))+i;return(<button key={pg} onClick={()=>setTeamPage(pg)} className={pg===teamPage?"px-3 py-1.5 text-xs border rounded-lg bg-blue-600 text-white border-blue-600":"px-3 py-1.5 text-xs border rounded-lg border-gray-200 hover:bg-gray-50"}>{pg}</button>);})}
                                    <button onClick={()=>setTeamPage(p=>Math.min(totalPages,p+1))} disabled={teamPage===totalPages} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}
            {tab === "report" && showTeamTab && (() => {
                const lateRecs  = companyRecords.filter(r => r.status === "late");
                const earlyRecs = companyRecords.filter(r => r.status === "early-leave");
                const absentRecs= companyRecords.filter(r => r.status === "absent");
                const byEmp = {};
                companyRecords.forEach(r => {
                    const id = r.userId?._id; if (!id) return;
                    if (!byEmp[id]) byEmp[id] = { user: r.userId, late:0, early:0, absent:0, total:0 };
                    byEmp[id].total++;
                    if (r.status==="late") byEmp[id].late++;
                    if (r.status==="early-leave") byEmp[id].early++;
                    if (r.status==="absent") byEmp[id].absent++;
                });
                const empStats = Object.values(byEmp).sort((a,b)=>(b.late+b.early+b.absent)-(a.late+a.early+a.absent));
                const handleExportReport = () => {
                    const headers = ["Employee","Code","Late Days","Early Leave","Absent Days","Total Records"];
                    const rows = empStats.map(e => [`${e.user?.firstName} ${e.user?.lastName}`,e.user?.employeeCode||"",e.late,e.early,e.absent,e.total]);
                    exportToCSV([headers,...rows],`attendance_report_${month}.csv`);
                };
                return (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-semibold text-gray-800">Attendance Report &mdash; {month}</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Late arrivals, early departures and absences per employee</p>
                            </div>
                            <button onClick={handleExportReport} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-medium transition">
                                <Download size={13} /> Export CSV
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-yellow-700">{lateRecs.length}</p><p className="text-xs text-yellow-600 mt-1">Late Arrivals</p></div>
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-purple-700">{earlyRecs.length}</p><p className="text-xs text-purple-600 mt-1">Early Departures</p></div>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-red-600">{absentRecs.length}</p><p className="text-xs text-red-500 mt-1">Absent Days</p></div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                            <table className="w-full text-sm">
                                <thead><tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                    <th className="px-4 py-3 text-left">Employee</th>
                                    <th className="px-4 py-3 text-center">Late</th>
                                    <th className="px-4 py-3 text-center">Early Leave</th>
                                    <th className="px-4 py-3 text-center">Absent</th>
                                    <th className="px-4 py-3 text-center">Total Days</th>
                                </tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {empStats.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No data for this month.</td></tr>
                                    ) : empStats.map(e => (
                                        <tr key={e.user?._id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {e.user?.profilePic?.url
                                                        ? <img src={e.user.profilePic.url} className="w-7 h-7 rounded-full object-cover" alt="" />
                                                        : <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{e.user?.firstName?.[0]}{e.user?.lastName?.[0]}</div>}
                                                    <div><p className="font-medium text-gray-800">{e.user?.firstName} {e.user?.lastName}</p><p className="text-xs text-gray-400">{e.user?.employeeCode}</p></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center"><span className={e.late>0?"text-yellow-600 font-semibold":"text-gray-400"}>{e.late}</span></td>
                                            <td className="px-4 py-3 text-center"><span className={e.early>0?"text-purple-600 font-semibold":"text-gray-400"}>{e.early}</span></td>
                                            <td className="px-4 py-3 text-center"><span className={e.absent>0?"text-red-500 font-semibold":"text-gray-400"}>{e.absent}</span></td>
                                            <td className="px-4 py-3 text-center text-gray-600">{e.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {/* ── Regularization ── */}
            {tab === "regularization" && (
                <RegularizationTab
                    isAdmin={isAdmin}
                    showTeamTab={showTeamTab}
                    canApprove={isAdmin || permissions.includes("APPROVE_REGULARIZATION")}
                    canReject={isAdmin || permissions.includes("REJECT_REGULARIZATION")}
                />
            )}
        </div>
    );
};

export default Attendance;
