/** Pre-fill from client/public/Sample Quote.pdf — CRM Web Based proposal */
export const CRM_WEB_QUOTE_TEMPLATE = {
    title: "Proposal For Website/Application/Portal",
    proposedSystemCategory: "Application",
    proposedSystemOther: "",
    systemName: "CRM - Web Based",
    pages: [
        {
            name: "Staff Panel",
            cost: 12000,
            descriptions: [
                "Staff Login & Dashboard",
                "View total assigned leads, search and filter leads",
                "Smart calling screen with lead name, communication record & requirement",
                "Direct call and WhatsApp integration",
                "Call disposition popup — update status (Interested / Not interested / Busy / Wrong no.)",
                "Add call notes / remarks after each call",
                "Set next follow-up date, today's reminders, pending & closed leads",
                "Success rate, active working timer, script / pitch pop-up",
                "Performance & analytics, leaderboard, monthly report (talktime & conversions)",
                "Notifications, dark/light mode, change password, logout",
            ],
        },
        {
            name: "Admin Panel",
            cost: 18000,
            descriptions: [
                "Admin login & dashboard",
                "Add new leads, view and manage all leads",
                "Assign leads to staff, assign daily calling targets",
                "Monitor completed calls, staff success rate, live staff activity",
                "Manage pending leads, follow-ups, closed leads, call history",
                "Staff performance analytics, leaderboard",
                "Monthly & conversion reports, notifications",
                "Dark/light mode, talk time reports, data sync management",
                "Change password, logout",
            ],
        },
    ],
    techStack: [
        { label: "Web Front End — HTML, CSS, JS, Bootstrap / React JS, Tailwind CSS" },
        { label: "Web Back End — PHP Laravel or Node.js Express" },
        { label: "Database — MySQL or MongoDB" },
        { label: "Hosting — AWS or VPS" },
    ],
    otherRequirements: [
        {
            requirement: "Domain Name Registration",
            term: "Client Side",
            price: 0,
            priceType: "client_side",
        },
        {
            requirement: "Web Hosting Server (GoDaddy or Other)",
            term: "Client Side",
            price: 0,
            priceType: "client_side",
        },
        {
            requirement: "SSL Certificate",
            term: "Client Side",
            price: 0,
            priceType: "client_side",
        },
    ],
    notes: "",
};
