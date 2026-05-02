import React, { useRef, useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, UserCircle, ChevronDown, Menu } from "lucide-react";
import { authlogout } from "../modules/auth/services/authService";
import NotificationBell from "./NotificationBell";

const ROUTE_LABELS = {
    "/": "Dashboard",
    "/users": "Employees",
    "/companies": "Companies",
    "/departments": "Departments",
    "/settings/roles": "Roles",
    "/work-shifts": "Work Shifts",
    "/employment-status": "Employment Status",
    "/attendance": "Attendance",
    "/settings": "Settings",
    "/profile": "Profile",
    "/notifications": "Notifications",
};

const Navbar = ({ onMenuClick }) => {
    const { user, logout } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const pageTitle = ROUTE_LABELS[location.pathname] || "HRMS";
    const handleLogout = () => { authlogout(); logout(); navigate("/auth/login"); };

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();

    return (
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 shrink-0">
            <div className="flex items-center gap-3">
                {/* Mobile hamburger inside navbar */}
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
                >
                    <Menu size={20} />
                </button>
                <div className="flex items-center gap-2">
                    {user?.companyId?.icon?.url && (
                        <img src={user.companyId.icon.url} alt="company" className="w-6 h-6 rounded object-cover hidden sm:block" />
                    )}
                    <div>
                        <h1 className="text-base font-semibold text-gray-800">{pageTitle}</h1>
                        <p className="text-xs text-gray-400 hidden sm:block">{user?.companyId?.name || "HRMS Platform"}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1">
                <NotificationBell />
                <div className="relative" ref={ref}>
                    <button
                        onClick={() => setOpen((p) => !p)}
                        className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition"
                    >
                        {user?.profilePic?.url ? (
                            <img src={user.profilePic.url} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {initials}
                            </div>
                        )}
                        <div className="text-left hidden sm:block">
                            <p className="text-sm font-medium text-gray-800 leading-tight">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-gray-400 leading-tight">{user?.role?.name}</p>
                        </div>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform hidden sm:block ${open ? "rotate-180" : ""}`} />
                    </button>

                    {open && (
                        <div className="absolute right-0 top-12 w-56 sm:w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-semibold text-gray-800">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                {user?.companyId?.name && <p className="text-xs text-blue-500 mt-0.5">{user.companyId.name}</p>}
                            </div>
                            <button onClick={() => { setOpen(false); navigate("/profile"); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                                <UserCircle size={16} /> My Profile
                            </button>
                            <div className="border-t border-gray-100 mt-1 pt-1">
                                <button onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition">
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
