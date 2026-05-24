import { createBrowserRouter } from "react-router-dom";
import Home from "../Pages/Home";
import Settings from "../Pages/Settings";
import Profile from "../Pages/Profile";
import WebLayout from "../layout/WebLayout";
import Login from "../modules/auth/pages/Login";
import AuthLayout from "../layout/AuthLayout";
import Role from "../modules/roles/pages/Role";
import Company from "../modules/company/pages/Company";
import User from "../modules/employee/pages/User";
import Department from "../modules/department/pages/department";
import Attendance from "../modules/attendance/pages/Attendance";
import WorkShift from "../modules/workshift/pages/WorkShift";
import Notifications from "../modules/notifications/pages/Notifications";
import EmploymentStatus from "../modules/employmentStatus/pages/EmploymentStatus";
import LeaveManagement from "../Pages/LeaveManagement";
import AssignLeave from "../modules/leave/pages/AssignLeave";
import Holiday from "../modules/leave/pages/Holiday";
import LeaveType from "../modules/leave/pages/LeaveType";
import Payroll from "../modules/payroll/pages/Payroll";
import Projects from "../modules/projects/pages/Projects";
import ProjectDetail from "../modules/projects/pages/ProjectDetail";
import Leads from "../modules/leads/pages/Leads";
import QuoteManagement from "../modules/quotes/pages/QuoteManagement";
import PaymentAccounts from "../modules/quotes/pages/PaymentAccounts";

const AppRoute = createBrowserRouter([
    {
        path: "/auth", element: <AuthLayout />,
        children: [
            { path: "/auth/login", element: <Login /> },
        ],
    },
    {
        path: "/", element: <WebLayout />,
        children: [
            { index: true, element: <Home /> },
            { path: "/users", element: <User/> },
            {path:"/companies", element: <Company/>},
            {path:"/departments", element: <Department/>},
            { path: "/attendance", element: <Attendance /> },
            { path: "/work-shifts", element: <WorkShift /> },
            { path: "/employment-status", element: <EmploymentStatus /> },
            { path: "/leave-management",  element: <LeaveManagement /> },
            { path: "/leave/assign",       element: <AssignLeave /> },
            { path: "/leave/holidays",     element: <Holiday /> },
            { path: "/leave/types",         element: <LeaveType /> },
            { path: "/payroll", element: <Payroll /> },
            { path: "/projects", element: <Projects /> },
            { path: "/projects/:id", element: <ProjectDetail /> },
            { path: "/leads", element: <Leads /> },
            { path: "/quotes", element: <QuoteManagement /> },
            { path: "/payment-accounts", element: <PaymentAccounts /> },
            { path: "/notifications", element: <Notifications /> },
            { path: "/settings", element: <Settings /> },
            { path: "/settings/roles", element: <Role /> },
            { path: "/settings/companies", element: <Company/> },
            { path: "/settings/user", element: <User/> },
            { path: "/profile", element: <Profile /> },
            { path: "*", element: <Home /> }
        ]
    },
]);

export default AppRoute;