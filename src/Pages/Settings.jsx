import React from "react";
import { Link } from "react-router-dom";
import { Building2, ShieldCheck, Users, ArrowRight } from "lucide-react";
import { useStore } from "../context/StoreContext";

const options = [
    {
        title: "Company Management",
        description: "Manage company info, addresses, domains, and admin accounts.",
        path: "/settings/companies",
        icon: Building2,
        color: "bg-blue-50 text-blue-600",
        perms: ["VIEW_COMPANY", "VIEW_ALL_COMPANIES"],
    },
    {
        title: "Role Management",
        description: "Create and manage roles with fine-grained permission control.",
        path: "/settings/roles",
        icon: ShieldCheck,
        color: "bg-green-50 text-green-600",
        perms: ["VIEW_ROLE", "VIEW_ALL_ROLES"],
    },
    {
        title: "User Management",
        description: "Add, edit, and manage employee accounts and access.",
        path: "/settings/user",
        icon: Users,
        color: "bg-purple-50 text-purple-600",
        perms: ["VIEW_USER", "VIEW_ALL_USERS"],
    },
];

const Settings = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const canSee = (perms) => !perms.length || perms.some((p) => permissions.includes(p));

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your organization's configuration.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {options.filter((o) => canSee(o.perms)).map((opt) => (
                    <Link
                        key={opt.path}
                        to={opt.path}
                        className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-blue-200 transition group flex flex-col gap-4"
                    >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${opt.color}`}>
                            <opt.icon size={22} />
                        </div>
                        <div className="flex-1">
                            <h2 className="font-semibold text-gray-800 group-hover:text-blue-600 transition">{opt.title}</h2>
                            <p className="text-sm text-gray-500 mt-1">{opt.description}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                            Manage <ArrowRight size={13} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Settings;
