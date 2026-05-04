import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";

function AuthLayout() {
    const { user } = useStore();

    // Already logged in — redirect to app
    if (user) return <Navigate to="/" replace />;

    return <Outlet />;
}

export default AuthLayout;