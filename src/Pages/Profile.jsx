import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useStore } from "../context/StoreContext";
import { getProfile, updateUserProfile, changePassword } from "../modules/auth/services/authService";
import { getCompanyWorkShifts } from "../modules/workshift/services/workShiftService";
import {
    Camera, Pencil, X, Check, User, Mail, Phone, Calendar,
    Briefcase, Building2, ShieldCheck, Clock, Eye, EyeOff, Lock, MapPin
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition";
const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
            <Icon size={15} className="text-gray-400" />
        </div>
        <div className="min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">{value || "—"}</p>
        </div>
    </div>
);

const Field = ({ label, icon: Icon, children }) => (
    <div>
        <label className={labelCls}>{label}</label>
        <div className="relative">
            {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
            {React.cloneElement(children, {
                className: `${inputCls} ${Icon ? "pl-9" : ""}`,
            })}
        </div>
    </div>
);

const EMPTY = {
    firstName: "", lastName: "", email: "", phone: "", gender: "", address: "",
    dateOfBirth: "", employeeCode: "", joiningDate: "", workShift: "",
    workShiftName: "", employmentStatus: "", role: "", companyId: "",
    department: "", designation: "", reportingTo: "", profilePic: null,
    password: "", confirmPassword: "",
};

// ── Component ─────────────────────────────────────────────────────────────────
const Profile = () => {
    const { user, setUser } = useStore();
    const isAdmin = ["admin", "super_admin"].includes(user?.role?.name);

    const TABS = [
        { key: "personal",   label: "Personal" },
        { key: "employment", label: "Employment" },
        { key: "security",   label: "Security" },
    ];

    const [form, setForm] = useState(EMPTY);
    const [rawUser, setRawUser] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [preview, setPreview] = useState(null);
    const [tab, setTab] = useState("personal");
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [pwLoading, setPwLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirmNew, setShowConfirmNew] = useState(false);

    const mapUser = (u) => ({
        firstName:            u.firstName || "",
        lastName:             u.lastName || "",
        email:                u.email || "",
        phone:                u.phone || "",
        gender:               u.gender || "",
        address:              u.address || "",
        dateOfBirth:          u.dateOfBirth?.split("T")[0] || "",
        employeeCode:         u.employeeCode || "",
        joiningDate:          u.joiningDate?.split("T")[0] || "",
        workShift:            u.workShift?._id || u.workShift || "",
        workShiftName:        u.workShift?.name || "",
        employmentStatus:     u.employmentStatus?._id || u.employmentStatus || "",
        employmentStatusName: u.employmentStatus?.name || "",
        role:                 u.role?.name || "",
        companyId:            u.companyId?.name || "",
        department:           u.department?.name || (typeof u.department === "string" ? u.department : ""),
        designation:          u.designation?.name || (typeof u.designation === "string" ? u.designation : ""),
        reportingTo:          u.reportingTo?._id || u.reportingTo || "",
        reportingToName:      u.reportingTo ? `${u.reportingTo.firstName || ""} ${u.reportingTo.lastName || ""}`.trim() : "",
        profilePic:           null,
        password:             "",
        confirmPassword:      "",
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [profileRes, shiftsRes] = await Promise.allSettled([
                    getProfile(),
                    getCompanyWorkShifts(),
                ]);
                if (profileRes.status === "fulfilled" && profileRes.value.user) {
                    const mapped = mapUser(profileRes.value.user);
                    setForm(mapped);
                    setRawUser(profileRes.value.user);
                    setPreview(profileRes.value.user.profilePic?.url || null);
                }
                if (shiftsRes.status === "fulfilled") {
                    setShifts(shiftsRes.value.data || []);
                }
            } catch (err) {
                toast.error("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files?.[0]) {
            setForm(p => ({ ...p, [name]: files[0] }));
            setPreview(URL.createObjectURL(files[0]));
        } else {
            setForm(p => ({ ...p, [name]: value }));
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword)
            return toast.error("All password fields are required");
        if (pwForm.newPassword.length < 6)
            return toast.error("New password must be at least 6 characters");
        if (pwForm.newPassword !== pwForm.confirmPassword)
            return toast.error("New passwords do not match");
        try {
            setPwLoading(true);
            await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            toast.success("Password changed successfully");
            setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            toast.error(err?.message || "Failed to change password");
        } finally {
            setPwLoading(false);
        }
    };

    const handleSave = async () => {
        if (form.password && form.password !== form.confirmPassword) {
            return toast.error("Passwords do not match");
        }
        setSaving(true);
        try {
            const fd = new FormData();
            const textFields = ["firstName", "lastName", "phone", "gender", "address", "dateOfBirth",
                "employeeCode", "joiningDate", "workShift", "employmentStatus", "password"];
            textFields.forEach(k => {
                if (form[k] !== null && form[k] !== "") fd.append(k, form[k]);
            });
            if (form.profilePic instanceof File) {
                fd.append("profilePic", form.profilePic);
            }
            const data = await updateUserProfile(fd);
            if (data.success) {
                toast.success("Profile updated successfully");
                setEditMode(false);
                const updated = await getProfile();
                const mergedUser = { ...user, ...updated.user };
                setUser(mergedUser);
                const mapped = mapUser(updated.user);
                setForm(mapped);
                setRawUser(updated.user);
                setPreview(updated.user.profilePic?.url || null);
            } else {
                toast.error(data.message || "Update failed");
            }
        } catch (err) {
            toast.error(err?.message || "Error updating profile");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditMode(false);
        if (rawUser) {
            setForm(mapUser(rawUser));
            setPreview(rawUser.profilePic?.url || null);
        }
    };

    const initials = `${form.firstName?.[0] || ""}${form.lastName?.[0] || ""}`.toUpperCase();
    const shiftDisplay = form.workShift
        ? (shifts.find(s => s._id === form.workShift)?.name || form.workShiftName || "—")
        : "—";
    const shiftTiming = shifts.find(s => s._id === form.workShift);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Cover + Avatar */}
            <div className="relative">
                <div className="h-32 sm:h-44 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-14 pb-4">
                        {/* Avatar */}
                        <div className="relative w-fit">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-blue-100 flex items-center justify-center">
                                {preview
                                    ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
                                    : <span className="text-3xl font-bold text-blue-600">{initials}</span>}
                            </div>
                            {isAdmin && editMode && (
                                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition">
                                    <Camera size={14} className="text-white" />
                                    <input type="file" name="profilePic" accept="image/*" onChange={handleChange} className="hidden" />
                                </label>
                            )}
                        </div>

                        {/* Name + actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pb-1">
                            <div className="sm:text-right">
                                <h1 className="text-xl font-bold text-gray-900">{form.firstName} {form.lastName}</h1>
                                <p className="text-sm text-gray-500">{form.role}{form.companyId ? ` · ${form.companyId}` : ""}</p>
                            </div>
                            {/* {isAdmin && (
                                !editMode ? (
                                    <button onClick={() => setEditMode(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition shadow-sm">
                                        <Pencil size={14} /> Edit Profile
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={handleCancel}
                                            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-sm transition">
                                            <X size={14} /> Cancel
                                        </button>
                                        <button onClick={handleSave} disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60">
                                            <Check size={14} /> {saving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                )
                            )} */}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                        { label: "Employee Code", value: form.employeeCode || "—",          icon: Briefcase,   color: "text-blue-600 bg-blue-50" },
                        { label: "Department",    value: form.department || "—",             icon: Building2,   color: "text-purple-600 bg-purple-50" },
                        { label: "Work Shift",    value: shiftDisplay,                       icon: Clock,       color: "text-green-600 bg-green-50" },
                        { label: "Emp. Status",   value: form.employmentStatusName || "—",   icon: ShieldCheck, color: "text-orange-600 bg-orange-50" },
                    ].map(s => (
                        <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                                <s.icon size={16} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-gray-400 truncate">{s.label}</p>
                                <p className="text-sm font-semibold text-gray-800 truncate">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-5">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t.key ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">

                    {/* ── Personal ── */}
                    {tab === "personal" && (
                        isAdmin && editMode ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label="First Name" icon={User}>
                                    <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="John" />
                                </Field>
                                <Field label="Last Name" icon={User}>
                                    <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" />
                                </Field>
                                <Field label="Email" icon={Mail}>
                                    <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="john@example.com" />
                                </Field>
                                <Field label="Phone" icon={Phone}>
                                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 00000 00000" />
                                </Field>
                                <Field label="Address" icon={MapPin}>
                                    <input name="address" value={form.address} onChange={handleChange} placeholder="123, Street, City, State - PIN" />
                                </Field>
                                <Field label="Gender">
                                    <select name="gender" value={form.gender} onChange={handleChange}>
                                        <option value="">Select gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </Field>
                                <Field label="Date of Birth" icon={Calendar}>
                                    <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
                                </Field>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                                <InfoRow icon={User}     label="First Name"    value={form.firstName} />
                                <InfoRow icon={User}     label="Last Name"     value={form.lastName} />
                                <InfoRow icon={Mail}     label="Email"         value={form.email} />
                                <InfoRow icon={Phone}    label="Phone"         value={form.phone} />
                                <InfoRow icon={MapPin}   label="Address"       value={form.address} />
                                <InfoRow icon={User}     label="Gender"        value={form.gender} />
                                <InfoRow icon={Calendar} label="Date of Birth" value={form.dateOfBirth} />
                            </div>
                        )
                    )}

                    {/* ── Employment ── */}
                    {tab === "employment" && (
                        isAdmin && editMode ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label="Employee Code" icon={Briefcase}>
                                    <input name="employeeCode" value={form.employeeCode} onChange={handleChange} placeholder="EMP-001" />
                                </Field>
                                <Field label="Joining Date" icon={Calendar}>
                                    <input type="date" name="joiningDate" value={form.joiningDate} onChange={handleChange} />
                                </Field>
                                <Field label="Work Shift" icon={Clock}>
                                    <select name="workShift" value={form.workShift} onChange={handleChange}>
                                        <option value="">No shift assigned</option>
                                        {shifts.map(s => (
                                            <option key={s._id} value={s._id}>
                                                {s.name} ({s.startTime} – {s.endTime})
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Employment Status" icon={ShieldCheck}>
                                    <input name="employmentStatus" value={form.employmentStatus} onChange={handleChange} placeholder="e.g. Full-time" />
                                </Field>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                                <InfoRow icon={Briefcase}   label="Employee Code"      value={form.employeeCode} />
                                <InfoRow icon={ShieldCheck} label="Role"               value={form.role} />
                                <InfoRow icon={Building2}   label="Company"            value={form.companyId} />
                                <InfoRow icon={Calendar}    label="Joining Date"       value={form.joiningDate} />
                                <InfoRow icon={Clock}       label="Work Shift"         value={shiftTiming ? `${shiftDisplay} (${shiftTiming.startTime} – ${shiftTiming.endTime})` : shiftDisplay} />
                                <InfoRow icon={ShieldCheck} label="Employment Status"  value={form.employmentStatusName} />
                                <InfoRow icon={Building2}   label="Department"         value={form.department} />
                                <InfoRow icon={User}        label="Designation"        value={form.designation} />
                                <InfoRow icon={User}        label="Reporting To"       value={form.reportingToName} />
                            </div>
                        )
                    )}

                    {/* ── Security ── */}
                    {tab === "security" && (
                        <div className="max-w-md space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Change Password</h3>
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div>
                                        <label className={labelCls}>Current Password</label>
                                        <div className="relative">
                                            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <input
                                                type={showCurrent ? "text" : "password"}
                                                value={pwForm.currentPassword}
                                                onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                                                placeholder="Enter current password"
                                                className={`${inputCls} pl-9 pr-10`}
                                            />
                                            <button type="button" onClick={() => setShowCurrent(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelCls}>New Password</label>
                                        <div className="relative">
                                            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <input
                                                type={showNew ? "text" : "password"}
                                                value={pwForm.newPassword}
                                                onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                                                placeholder="Min. 6 characters"
                                                className={`${inputCls} pl-9 pr-10`}
                                            />
                                            <button type="button" onClick={() => setShowNew(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Confirm New Password</label>
                                        <div className="relative">
                                            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <input
                                                type={showConfirmNew ? "text" : "password"}
                                                value={pwForm.confirmPassword}
                                                onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                                placeholder="Re-enter new password"
                                                className={`${inputCls} pl-9 pr-10 ${
                                                    pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword
                                                        ? "border-red-300 focus:ring-red-400" : ""
                                                }`}
                                            />
                                            <button type="button" onClick={() => setShowConfirmNew(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                {showConfirmNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                                            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                                        )}
                                    </div>

                                    <button type="submit" disabled={pwLoading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                        {pwLoading ? "Updating..." : "Update Password"}
                                    </button>
                                </form>
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700">
                                <Lock size={14} className="shrink-0 mt-0.5" />
                                <span>After changing your password you'll stay logged in. For security, log out and back in on other devices.</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
