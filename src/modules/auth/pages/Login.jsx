import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Eye, EyeOff, Mail, Lock, KeyRound, ArrowLeft } from "lucide-react";
import { login, forgotPassword, resetPassword } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../../context/StoreContext";

// step: "login" | "forgot-email" | "forgot-otp"
const Login = () => {
    const { setUser } = useStore();
    const navigate = useNavigate();
    const [step, setStep] = useState("login");
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [blocked, setBlocked] = useState(false);
    const [timer, setTimer] = useState(0);

    const [loginForm, setLoginForm] = useState({ email: "", password: "" });
    const [resetForm, setResetForm] = useState({ email: "", otp: "", newPassword: "", confirmPassword: "" });

    useEffect(() => {
        if (timer <= 0) return;
        const id = setInterval(() => setTimer(p => p - 1), 1000);
        return () => clearInterval(id);
    }, [timer]);

    const setL = (e) => setLoginForm(p => ({ ...p, [e.target.name]: e.target.value }));
    const setR = (e) => setResetForm(p => ({ ...p, [e.target.name]: e.target.value }));

    // ── Login ──────────────────────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        if (loading) return;
        setBlocked(false);
        try {
            setLoading(true);
            const data = await login({ email: loginForm.email, password: loginForm.password });
            if (!data.success) return toast.error(data.message);
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
            toast.success("Login successful");
            navigate("/");
        } catch (err) {
            if (err?.blocked) setBlocked(true);
            else toast.error(err?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    // ── Forgot — send OTP ──────────────────────────────────────────────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (loading) return;
        try {
            setLoading(true);
            const data = await forgotPassword({ email: resetForm.email });
            if (!data.success) return toast.error(data.message);
            toast.success(data.message);
            setStep("forgot-otp");
            setTimer(60);
        } catch (err) {
            toast.error(err?.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (timer > 0 || loading) return;
        try {
            setLoading(true);
            const data = await forgotPassword({ email: resetForm.email });
            if (data.success) { toast.success("OTP resent"); setTimer(60); }
            else toast.error(data.message);
        } catch (err) {
            toast.error(err?.message || "Failed to resend OTP");
        } finally {
            setLoading(false);
        }
    };

    // ── Forgot — verify OTP + reset password ──────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (loading) return;
        if (resetForm.newPassword !== resetForm.confirmPassword)
            return toast.error("Passwords do not match");
        if (resetForm.newPassword.length < 6)
            return toast.error("Password must be at least 6 characters");
        try {
            setLoading(true);
            const data = await resetPassword({
                email: resetForm.email,
                otp: resetForm.otp,
                newPassword: resetForm.newPassword,
            });
            if (!data.success) return toast.error(data.message);
            toast.success(data.message);
            setStep("login");
            setResetForm({ email: "", otp: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            toast.error(err?.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

    return (
        <div className="min-h-screen flex">
            {/* Left Panel */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-between p-12">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">HR</div>
                    <span className="text-white font-bold text-xl tracking-tight">HRMS</span>
                </div>
                <div>
                    <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                        Manage your workforce<br />with confidence.
                    </h2>
                    <p className="text-slate-400 text-base">
                        A complete HR platform for managing employees, roles, departments, attendance, and payroll — all in one place.
                    </p>
                </div>
                <p className="text-slate-600 text-sm">&copy; {new Date().getFullYear()} HRMS. All rights reserved.</p>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
                <div className="w-full max-w-md">

                    {/* ── Login Step ── */}
                    {step === "login" && (
                        <>
                            <div className="mb-8">
                                <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                                <p className="text-gray-500 text-sm mt-1">Sign in to your HRMS account</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                {blocked && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="text-red-500 text-base">🚫</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-red-700">Account Disabled</p>
                                            <p className="text-xs text-red-500 mt-0.5">Your account has been disabled. Please contact your administrator.</p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</label>
                                    <div className="relative">
                                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="email" name="email" value={loginForm.email} onChange={setL}
                                            placeholder="you@company.com" required
                                            className={inputCls} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Password</label>
                                    <div className="relative">
                                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type={showPass ? "text" : "password"} name="password" value={loginForm.password} onChange={setL}
                                            placeholder="••••••••" required
                                            className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                        <button type="button" onClick={() => setShowPass(p => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    <div className="flex justify-end mt-1.5">
                                        <button type="button" onClick={() => { setStep("forgot-email"); setBlocked(false); }}
                                            className="text-xs text-blue-600 hover:underline">
                                            Forgot password?
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60 mt-2">
                                    {loading ? "Signing in..." : "Sign In"}
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── Forgot — Enter Email ── */}
                    {step === "forgot-email" && (
                        <>
                            <div className="mb-8">
                                <button onClick={() => setStep("login")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
                                    <ArrowLeft size={15} /> Back to login
                                </button>
                                <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
                                <p className="text-gray-500 text-sm mt-1">Enter your email to receive a reset OTP</p>
                            </div>

                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</label>
                                    <div className="relative">
                                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="email" name="email" value={resetForm.email} onChange={setR}
                                            placeholder="you@company.com" required className={inputCls} />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
                                    {loading ? "Sending OTP..." : "Send OTP"}
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── Forgot — Enter OTP + New Password ── */}
                    {step === "forgot-otp" && (
                        <>
                            <div className="mb-8">
                                <button onClick={() => setStep("forgot-email")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
                                    <ArrowLeft size={15} /> Back
                                </button>
                                <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
                                <p className="text-gray-500 text-sm mt-1">Enter the OTP sent to <strong>{resetForm.email}</strong></p>
                            </div>

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">OTP Code</label>
                                    <div className="relative">
                                        <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" name="otp" value={resetForm.otp} onChange={setR}
                                            placeholder="Enter 6-digit OTP" required maxLength={6}
                                            className={`${inputCls} tracking-widest`} />
                                    </div>
                                    <div className="flex justify-end mt-1.5">
                                        <button type="button" onClick={handleResendOtp} disabled={timer > 0 || loading}
                                            className="text-xs text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline">
                                            {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">New Password</label>
                                    <div className="relative">
                                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type={showNewPass ? "text" : "password"} name="newPassword" value={resetForm.newPassword} onChange={setR}
                                            placeholder="Min. 6 characters" required
                                            className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                        <button type="button" onClick={() => setShowNewPass(p => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Confirm Password</label>
                                    <div className="relative">
                                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="password" name="confirmPassword" value={resetForm.confirmPassword} onChange={setR}
                                            placeholder="Re-enter new password" required
                                            className={inputCls} />
                                    </div>
                                </div>

                                <button type="submit" disabled={loading}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
                                    {loading ? "Resetting..." : "Reset Password"}
                                </button>
                            </form>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Login;
