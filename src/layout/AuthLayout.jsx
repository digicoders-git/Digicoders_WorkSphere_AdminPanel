import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { verifyToken } from "../modules/auth/services/authService";

function AuthLayout() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await verifyToken();
                // Already logged in — redirect away from login page
                navigate("/");
            } catch {
                // Not logged in — stay on login page
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, [navigate]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return <Outlet />;
}

export default AuthLayout;