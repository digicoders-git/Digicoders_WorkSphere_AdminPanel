import React, { useEffect, useState, useRef } from "react";
import { X, User, Mail, Phone, Lock, Briefcase, Calendar, Building2, ShieldCheck, Eye, EyeOff, Clock, Users, Search, ChevronDown, MapPin } from "lucide-react";

const Field = ({ label, icon: Icon, children }) => (
    <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
        <div className="relative">
            {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
            {React.cloneElement(children, {
                className: `w-full border border-gray-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${Icon ? "pl-9 pr-3" : "px-3"} ${children.props.className || ""}`,
            })}
        </div>
    </div>
);

// ── Searchable Manager Picker ─────────────────────────────────────────────────
const ManagerPicker = ({ value, onChange, options }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef(null);

    const selected = options.find(u => u._id === value);

    const filtered = options.filter(u => {
        const q = search.toLowerCase();
        return (
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
            (u.employeeCode || "").toLowerCase().includes(q) ||
            (u.role?.name || "").toLowerCase().includes(q)
        );
    });

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const select = (id) => { onChange(id); setOpen(false); setSearch(""); };

    return (
        <div className="relative" ref={ref}>
            {/* Trigger */}
            <button type="button" onClick={() => setOpen(p => !p)}
                className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-left">
                {selected ? (
                    <div className="flex items-center gap-2 min-w-0">
                        {selected.profilePic?.url
                            ? <img src={selected.profilePic.url} className="w-5 h-5 rounded-full object-cover shrink-0" alt="" />
                            : <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">{selected.firstName?.[0]}{selected.lastName?.[0]}</div>}
                        <span className="truncate text-gray-800">{selected.firstName} {selected.lastName}</span>
                        {selected.employeeCode && <span className="text-gray-400 text-xs shrink-0">({selected.employeeCode})</span>}
                    </div>
                ) : (
                    <span className="text-gray-400">No manager assigned</span>
                )}
                <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name, code or role..."
                                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="max-h-52 overflow-y-auto">
                        {/* Clear option */}
                        <button type="button" onClick={() => select("")}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-gray-400 ${!value ? "bg-blue-50 text-blue-600" : ""}`}>
                            <X size={13} /> No manager assigned
                        </button>

                        {filtered.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-gray-400 text-center">No employees found</p>
                        ) : filtered.map(u => (
                            <button type="button" key={u._id} onClick={() => select(u._id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition text-left ${value === u._id ? "bg-blue-50" : ""}`}>
                                {u.profilePic?.url
                                    ? <img src={u.profilePic.url} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                                    : <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{u.firstName?.[0]}{u.lastName?.[0]}</div>}
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{u.firstName} {u.lastName}</p>
                                    <p className="text-xs text-gray-400 truncate">{u.role?.name || ""}{u.employeeCode ? ` · ${u.employeeCode}` : ""}</p>
                                </div>
                                {value === u._id && <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const EmployeeDrawer = ({ isOpen, onClose, initialData, companies, roles, shifts, employmentStatuses, departments, companyUsers, onSubmit, onCompanyChange, loading }) => {
    const isEdit = !!initialData;
    const [form, setForm] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setForm(initialData || {});
    }, [initialData, isOpen]);

    const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

    const handleCompanyChange = async (value) => {
        const updated = await onCompanyChange("companyId", value, { ...form, companyId: value, role: "", workShift: "", reportingTo: "", employmentStatus: "" });
        setForm(updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    if (!isOpen) return null;

    // Filter out the current employee from manager options
    const managerOptions = companyUsers.filter(u => u._id !== initialData?._id);

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-xl sm:max-w-xl bg-white h-full flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Employee" : "Add Employee"}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{isEdit ? "Update employee details" : "Fill in the details to create a new employee"}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Personal Info */}
                    <section>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <User size={13} /> Personal Information
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="First Name" icon={User}>
                                <input type="text" value={form.firstName || ""} onChange={(e) => set("firstName", e.target.value)} placeholder="John" required />
                            </Field>
                            <Field label="Last Name" icon={User}>
                                <input type="text" value={form.lastName || ""} onChange={(e) => set("lastName", e.target.value)} placeholder="Doe" required />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Field label="Gender">
                                <select value={form.gender || ""} onChange={(e) => set("gender", e.target.value)}>
                                    <option value="">Select gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </Field>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Contact */}
                    <section>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Mail size={13} /> Contact Details
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Email" icon={Mail}>
                                <input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" required />
                            </Field>
                            <Field label="Phone" icon={Phone}>
                                <input type="text" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="+91 00000 00000" />
                            </Field>
                        </div>
                        <div className="mt-4">
                            <Field label="Address" icon={MapPin}>
                                <input type="text" value={form.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="123, Street, City, State - PIN" />
                            </Field>
                        </div>
                        {!isEdit && (
                            <div className="mt-4">
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Password</label>
                                <div className="relative">
                                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={form.password || ""}
                                        onChange={(e) => set("password", e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full border border-gray-200 rounded-lg py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                    <button type="button" onClick={() => setShowPassword((p) => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    <hr className="border-gray-100" />

                    {/* Employment */}
                    <section>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Briefcase size={13} /> Employment Details
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Company" icon={Building2}>
                                <select value={form.companyId || ""} onChange={(e) => handleCompanyChange(e.target.value)} required>
                                    <option value="">Select company</option>
                                    {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Role" icon={ShieldCheck}>
                                <select value={form.role || ""} onChange={(e) => set("role", e.target.value)}>
                                    <option value="">Select role</option>
                                    {roles.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
                                </select>
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Field label="Employee Code" icon={Briefcase}>
                                <input type="text" value={form.employeeCode || ""} onChange={(e) => set("employeeCode", e.target.value)} placeholder="EMP-001" />
                            </Field>
                            <Field label="Joining Date" icon={Calendar}>
                                <input type="date" value={form.joiningDate || ""} onChange={(e) => set("joiningDate", e.target.value)} />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Field label="Work Shift" icon={Clock}>
                                <select value={form.workShift || ""} onChange={(e) => set("workShift", e.target.value)}>
                                    <option value="">Select shift</option>
                                    {shifts.map((s) => (
                                        <option key={s._id} value={s._id}>
                                            {s.name} ({s.startTime} – {s.endTime})
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Employment Status" icon={Briefcase}>
                                <select value={form.employmentStatus || ""} onChange={(e) => set("employmentStatus", e.target.value)}>
                                    <option value="">Select status</option>
                                    {employmentStatuses.map((s) => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Field label="Department" icon={Briefcase}>
                                <select value={form.department || ""} onChange={(e) => set("department", e.target.value)}>
                                    <option value="">Select department</option>
                                    {departments.map((d) => (
                                        <option key={d._id} value={d._id}>{d.name}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Date of Birth" icon={Calendar}>
                                <input type="date" value={form.dateOfBirth || ""} onChange={(e) => set("dateOfBirth", e.target.value)} />
                            </Field>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Hierarchy */}
                    <section>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Users size={13} /> Reporting Hierarchy
                        </p>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Reporting Manager</label>
                            <ManagerPicker
                                value={form.reportingTo || ""}
                                onChange={(id) => set("reportingTo", id)}
                                options={managerOptions}
                            />
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-white flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-60">
                        {loading ? "Saving..." : isEdit ? "Update Employee" : "Add Employee"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDrawer;
