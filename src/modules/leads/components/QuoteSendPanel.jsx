import { useState, useEffect, useRef } from "react";
import {
    Send, RotateCcw, Calendar, CheckCircle2, XCircle, Clock,
    History, List, ChevronDown, ChevronUp, Mail, Eye, EyeOff,
} from "lucide-react";
import { toast } from "react-toastify";
import {
    sendQuoteToCustomer, getQuoteSendDefaults, getQuoteById, addQuoteFollowUp,
    updateQuoteFollowUp, updateQuote,
} from "../services/quoteService";
import {
    DEFAULT_QUOTE_EMAIL_SUBJECT, DEFAULT_QUOTE_EMAIL_BODY,
    buildAllEmailPlaceholders, applyQuotePlaceholders,
    buildClientPlaceholderContext,
} from "./quoteEmailUtils";
import QuotePlaceholderPicker from "./QuotePlaceholderPicker";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const btnPrimary = "px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60 flex items-center gap-1.5";
const btnSecondary = "px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1.5";
const btnSuccess = "px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60 flex items-center gap-1.5";
const btnDanger = "px-4 py-2 text-sm font-medium rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-60 flex items-center gap-1.5";

const formatDateTime = (d) =>
    d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const userName = (u) =>
    u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "User" : "System";

const ACTION_LABELS = {
    created: "Created", updated: "Updated", sent: "Sent", resend: "Resent",
    send_failed: "Send failed", status_changed: "Status changed",
    follow_up_added: "Follow-up added", follow_up_updated: "Follow-up updated",
    follow_up_completed: "Follow-up done", follow_up_cancelled: "Follow-up cancelled",
    deleted: "Deleted",
};

const addDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
};

const Collapsible = ({ title, icon: Icon, badge, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                <span className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {Icon && <Icon size={13} />} {title}
                    {badge != null && badge > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold">{badge}</span>
                    )}
                </span>
                {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {open && <div className="p-4 space-y-3 bg-white">{children}</div>}
        </div>
    );
};

export default function QuoteSendPanel({ quote, lead, onQuoteUpdated, sendEmail, onSendEmailChange }) {
    const [sendLoading, setSendLoading] = useState(false);
    const [emailSubject, setEmailSubject] = useState(DEFAULT_QUOTE_EMAIL_SUBJECT);
    const [emailBody, setEmailBody] = useState(DEFAULT_QUOTE_EMAIL_BODY);
    const [showPreview, setShowPreview] = useState(false);
    const [showEmailEditor, setShowEmailEditor] = useState(false);
    const [placeholders, setPlaceholders] = useState(() => buildAllEmailPlaceholders());
    const [leadFieldConfig, setLeadFieldConfig] = useState([]);
    const subjectRef = useRef(null);
    const bodyRef = useRef(null);
    const [followDate, setFollowDate] = useState("");
    const [followNote, setFollowNote] = useState("");
    const [followLoading, setFollowLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);

    useEffect(() => {
        if (!quote?._id) return;
        getQuoteSendDefaults(quote._id)
            .then((data) => {
                setEmailSubject(data.subjectTemplate || DEFAULT_QUOTE_EMAIL_SUBJECT);
                setEmailBody(data.bodyTemplate || DEFAULT_QUOTE_EMAIL_BODY);
                if (data.placeholders?.length) setPlaceholders(data.placeholders);
                if (data.leadFieldConfig) setLeadFieldConfig(data.leadFieldConfig);
            })
            .catch(() => {});
    }, [quote._id]);

    const previewContext = buildClientPlaceholderContext(quote, lead, leadFieldConfig);
    const subjectPreview = applyQuotePlaceholders(emailSubject, previewContext);
    const bodyPreview = applyQuotePlaceholders(emailBody, previewContext);

    const insertPlaceholder = (field, key) => {
        const token = `{{${key}}}`;
        if (field === "subject") {
            const el = subjectRef.current;
            const start = el?.selectionStart ?? emailSubject.length;
            const end = el?.selectionEnd ?? start;
            setEmailSubject(emailSubject.slice(0, start) + token + emailSubject.slice(end));
        } else {
            const el = bodyRef.current;
            const start = el?.selectionStart ?? emailBody.length;
            const end = el?.selectionEnd ?? emailBody.length;
            setEmailBody(emailBody.slice(0, start) + token + emailBody.slice(end));
        }
    };

    const refreshQuote = async (res) => {
        const q = res?.quote ?? res;
        if (!q?._id) {
            if (q) onQuoteUpdated?.(q);
            return q;
        }
        try {
            const full = await getQuoteById(q._id);
            const updated = full.quote ?? full;
            onQuoteUpdated?.(updated);
            return updated;
        } catch {
            onQuoteUpdated?.(q);
            return q;
        }
    };

    const handleSend = async (resend = false) => {
        const to = sendEmail?.trim();
        if (!to) return toast.error("Enter customer email");
        try {
            setSendLoading(true);
            const res = await sendQuoteToCustomer(quote._id, to, { resend, subject: emailSubject, body: emailBody });
            if (res.success === false) {
                toast.error(res.message || "Failed to send quote");
                if (res.quote) await refreshQuote(res);
                return;
            }
            toast.success(res.message || (resend ? "Quote resent" : "Quote sent with PDF"));
            await refreshQuote(res);
        } catch (e) {
            const partial = e.response?.data?.quote;
            if (partial) await refreshQuote({ quote: partial });
            const msg = e.response?.data?.message;
            if (e.code === "ECONNABORTED" || e.message?.includes("timeout")) {
                toast.error("Send timed out while generating the PDF. Try again — first send may take up to a minute.");
            } else if (msg) {
                toast.error(msg);
            } else {
                toast.error("Failed to send quote");
            }
        } finally { setSendLoading(false); }
    };

    const handleStatus = async (status) => {
        try {
            setStatusLoading(true);
            const res = await updateQuote(quote._id, { status });
            toast.success(`Marked as ${status}`);
            await refreshQuote(res);
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to update status");
        } finally { setStatusLoading(false); }
    };

    const handleAddFollowUp = async (presetDays) => {
        const scheduledAt = presetDays !== undefined ? addDays(presetDays) : followDate;
        if (!scheduledAt) return toast.error("Select a follow-up date");
        const defaultNote = presetDays === 1 ? "Call tomorrow" : presetDays === 3 ? "Call in 3 days" : presetDays === 7 ? "Follow up next week" : "";
        try {
            setFollowLoading(true);
            const res = await addQuoteFollowUp(quote._id, {
                scheduledAt: new Date(scheduledAt).toISOString(),
                note: followNote.trim() || defaultNote,
            });
            toast.success("Follow-up scheduled");
            setFollowDate(""); setFollowNote("");
            await refreshQuote(res);
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to schedule follow-up");
        } finally { setFollowLoading(false); }
    };

    const handleFollowUpAction = async (followUpId, status) => {
        try {
            setFollowLoading(true);
            const res = await updateQuoteFollowUp(quote._id, followUpId, { status });
            toast.success(status === "completed" ? "Marked as done" : "Follow-up cancelled");
            await refreshQuote(res);
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to update follow-up");
        } finally { setFollowLoading(false); }
    };

    const sendHistory = [...(quote.sendHistory || [])].reverse();
    const activityLog = [...(quote.activityLog || [])].reverse();
    const followUps = [...(quote.followUps || [])].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    const pendingFollowUps = followUps.filter((f) => f.status === "pending");
    const hasBeenSent = (quote.sendCount || 0) > 0 || sendHistory.some((s) => s.success);

    return (
        <div className="space-y-3">
            {/* Send Section */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                        <Send size={14} /> Send Quote
                    </h3>
                    {hasBeenSent && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">
                            Sent {quote.sendCount || 0}× {quote.lastSentAt && `· Last: ${formatDateTime(quote.lastSentAt)}`}
                        </span>
                    )}
                </div>

                {/* Email recipient */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Email</label>
                    <input type="email" value={sendEmail} onChange={(e) => onSendEmailChange(e.target.value)}
                        placeholder="customer@example.com" className={inp} />
                </div>

                {/* Email template toggle */}
                <div>
                    <button type="button" onClick={() => setShowEmailEditor(v => !v)}
                        className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors">
                        <Mail size={13} />
                        {showEmailEditor ? "Hide" : "Customize"} email subject & body
                        {showEmailEditor ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {showEmailEditor && (
                        <div className="mt-3 p-3 bg-white border border-blue-100 rounded-xl space-y-3">
                            {/* Subject */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-600">Subject</label>
                                    <button type="button" onClick={() => setShowPreview(v => !v)}
                                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700">
                                        {showPreview ? <EyeOff size={11} /> : <Eye size={11} />}
                                        {showPreview ? "Hide preview" : "Preview filled"}
                                    </button>
                                </div>
                                <input ref={subjectRef} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                                    placeholder="Project Quote — {{systemName}} for {{orgName}}" className={inp} />
                                {showPreview && (
                                    <p className="text-[11px] text-emerald-700 mt-1 bg-emerald-50 px-2 py-1 rounded-lg">{subjectPreview}</p>
                                )}
                            </div>

                            {/* Body */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
                                <textarea ref={bodyRef} value={emailBody} onChange={(e) => setEmailBody(e.target.value)}
                                    rows={7} className={`${inp} resize-y font-mono text-xs`}
                                    placeholder={"Dear {{contactPerson}},\n\nPlease find attached..."} />
                                {showPreview && (
                                    <pre className="text-[11px] text-gray-600 mt-1 bg-gray-50 border rounded-lg p-2 whitespace-pre-wrap max-h-32 overflow-y-auto">{bodyPreview}</pre>
                                )}
                            </div>

                            <QuotePlaceholderPicker
                                placeholders={placeholders}
                                onInsert={(key) => {
                                    const field = document.activeElement === subjectRef.current ? "subject" : "body";
                                    insertPlaceholder(field, key);
                                }}
                            />

                            <button type="button" onClick={() => { setEmailSubject(DEFAULT_QUOTE_EMAIL_SUBJECT); setEmailBody(DEFAULT_QUOTE_EMAIL_BODY); }}
                                className="text-[11px] text-gray-500 hover:text-gray-700 underline">
                                Reset to default template
                            </button>
                        </div>
                    )}
                </div>

                {/* Send buttons */}
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleSend(false)} disabled={sendLoading} className={btnPrimary}>
                        <Send size={14} /> {sendLoading ? "Sending…" : hasBeenSent ? "Send Again" : "Send PDF to Customer"}
                    </button>
                    {hasBeenSent && (
                        <button type="button" onClick={() => handleSend(true)} disabled={sendLoading} className={btnSecondary} title="Log as resend">
                            <RotateCcw size={14} /> Resend
                        </button>
                    )}
                </div>

                {/* Status update */}
                {quote.status === "sent" && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-blue-100">
                        <span className="text-xs text-gray-600 font-medium">Customer response:</span>
                        <button type="button" disabled={statusLoading} onClick={() => handleStatus("accepted")} className={btnSuccess}>
                            <CheckCircle2 size={14} /> Accepted
                        </button>
                        <button type="button" disabled={statusLoading} onClick={() => handleStatus("rejected")} className={btnDanger}>
                            <XCircle size={14} /> Rejected
                        </button>
                    </div>
                )}
            </div>

            {/* Follow-ups */}
            <Collapsible title="Follow-ups" icon={Calendar} badge={pendingFollowUps.length} defaultOpen={pendingFollowUps.length > 0}>
                {/* Quick presets */}
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Quick schedule</p>
                    <div className="flex flex-wrap gap-2">
                        {[{ label: "Tomorrow", days: 1 }, { label: "In 3 days", days: 3 }, { label: "Next week", days: 7 }].map(({ label, days }) => (
                            <button key={days} type="button" disabled={followLoading} onClick={() => handleAddFollowUp(days)}
                                className="px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-colors">
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Custom date & time</label>
                        <input type="datetime-local" value={followDate} onChange={(e) => setFollowDate(e.target.value)} className={inp} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Note</label>
                        <input value={followNote} onChange={(e) => setFollowNote(e.target.value)} placeholder="Call / email / meeting…" className={inp} />
                    </div>
                </div>
                <button type="button" disabled={followLoading || !followDate} onClick={() => handleAddFollowUp()}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60 flex items-center gap-1.5 w-fit">
                    <Calendar size={14} /> Schedule Follow-up
                </button>

                {/* Follow-up list */}
                {followUps.length > 0 && (
                    <div className="border rounded-xl overflow-hidden divide-y max-h-48 overflow-y-auto">
                        {followUps.map((f) => (
                            <div key={f._id} className="px-3 py-2.5 text-xs flex flex-wrap items-center gap-2 bg-white hover:bg-gray-50">
                                <Clock size={12} className="text-gray-400 shrink-0" />
                                <span className="font-medium text-gray-800">{formatDateTime(f.scheduledAt)}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                                    f.status === "pending" ? "bg-amber-100 text-amber-800" :
                                    f.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                                }`}>{f.status}</span>
                                {f.note && <span className="text-gray-500 truncate flex-1">{f.note}</span>}
                                {f.status === "pending" && (
                                    <div className="flex gap-1 ml-auto shrink-0">
                                        <button type="button" disabled={followLoading} onClick={() => handleFollowUpAction(f._id, "completed")}
                                            className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Mark done">
                                            <CheckCircle2 size={14} />
                                        </button>
                                        <button type="button" disabled={followLoading} onClick={() => handleFollowUpAction(f._id, "cancelled")}
                                            className="p-1 rounded-lg hover:bg-red-50 text-red-500" title="Cancel">
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Collapsible>

            {/* Send History */}
            {sendHistory.length > 0 && (
                <Collapsible title={`Send History (${sendHistory.length})`} icon={History}>
                    <div className="border rounded-xl overflow-hidden divide-y max-h-48 overflow-y-auto">
                        {sendHistory.map((entry, i) => (
                            <div key={entry._id || i} className={`px-3 py-2.5 text-xs ${entry.success ? "bg-white" : "bg-red-50"}`}>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-semibold ${entry.success ? "text-emerald-700" : "text-red-600"}`}>
                                        {entry.success ? "✓ Delivered" : "✗ Failed"}
                                    </span>
                                    {entry.isResend && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px]">Resend</span>}
                                    <span className="text-gray-400 ml-auto">{formatDateTime(entry.sentAt)}</span>
                                </div>
                                <p className="text-gray-600 mt-0.5">To: {entry.to}</p>
                                <p className="text-gray-400">By {userName(entry.sentBy)}</p>
                                {!entry.success && entry.error && <p className="text-red-600 mt-0.5">{entry.error}</p>}
                            </div>
                        ))}
                    </div>
                </Collapsible>
            )}

            {/* Activity Log */}
            <Collapsible title={`Activity Log (${activityLog.length})`} icon={List}>
                {activityLog.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No activity yet</p>
                ) : (
                    <div className="border rounded-xl overflow-hidden divide-y max-h-56 overflow-y-auto">
                        {activityLog.map((entry, i) => (
                            <div key={entry._id || i} className="px-3 py-2.5 text-xs bg-white hover:bg-gray-50">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-gray-800">{ACTION_LABELS[entry.action] || entry.action}</span>
                                    <span className="text-gray-400 ml-auto">{formatDateTime(entry.performedAt)}</span>
                                </div>
                                {entry.summary && <p className="text-gray-500 mt-0.5">{entry.summary}</p>}
                                <p className="text-gray-400 text-[10px] mt-0.5">{userName(entry.performedBy)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Collapsible>
        </div>
    );
}
