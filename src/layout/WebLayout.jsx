import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Components/Navbar";

function WebLayout() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <main className="flex-1 flex flex-col min-w-0">
                <Navbar onMenuClick={() => setMobileOpen(true)} />
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default WebLayout;
