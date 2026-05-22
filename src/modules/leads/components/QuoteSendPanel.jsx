import { useState, useEffect, useRef } from "react";
import {
    Send,
    RotateCcw,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    History,
    List,
    ChevronDown,
    ChevronUp,
    Mail,
    Eye,
} from "lucide-react";
import { toast } from "react-toastify";
import {
    sendQuoteToCustomer,
    getQuoteSendDefaults,
    addQuoteFollowUp,
    updateQuoteFollowUp,
    updateQuote,
} from "../services/quoteService";
import {
    DEFAULT_QUOTE_EMAIL_SUBJECT,
    DEFAULT_QUOTE_EMAIL_BODY,
    buildAllEmailPlaceholders,
    applyQuotePlaceholders,
    buildClientPlaceholderContext,
    groupPlaceholders,
    PLACEHOLDER_GROUP_LABELS,
} from "./quoteEmailUtils";

const inp =
    "w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500";
const btn = "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors";
const btnPrimary = `${btn} bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60`;
const btnSecondary = `${btn} bg-gray-100 hover:bg-gray-200 text-gray-700`;
const btnSuccess = `${btn} bg-emerald-600 hover:bg-emerald-700 text-white`;
const btnDanger = `${btn} bg-red-50 hover:bg-red-100 text-red-600`;

const formatDateTime = (d) =>
    d
        ? new Date(d).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";

const userName = (u) =>
    u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "User" : "System";

const ACTION_LABELS = {
    created: "Created",
    updated: "Updated",
    sent: "Sent",
    resend: "Resent",
    send_failed: "Send failed",
    status_changed: "Status changed",
    follow_up_added: "Follow-up added",
    follow_up_updated: "Follow-up updated",
    follow_up_completed: "Follow-up done",
    follow_up_cancelled: "Follow-up cancelled",
    deleted: "Deleted",
};

const addDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
};

export default function QuoteSendPanel({ quote, lead, onQuoteUpdated, sendEmail, onSendEmailChange }) {
    const [sendLoading, setSendLoading] = useState(false);
    const [emailSubject, setEmailSubject] = useState(DEFAULT_QUOTE_EMAIL_SUBJECT);
    const [emailBody, setEmailBody] = useState(DEFAULT_QUOTE_EMAIL_BODY);
    const [showPreview, setShowPreview] = useState(false);
    const [placeholders, setPlaceholders] = useState(() => buildAllEmailPlaceholders());
    const [leadFieldConfig, setLeadFieldConfig] = useState([]);
    const subjectRef = useRef(null);
    const bodyRef = useRef(null);
    const [followDate, setFollowDate] = useState("");
    const [followNote, setFollowNote] = useState("");
    const [followLoading, setFollowLoading] = useState(false);
    const [showActivity, setShowActivity] = useState(true);
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
            .catch(() => {
                setEmailSubject(DEFAULT_QUOTE_EMAIL_SUBJECT);
                setEmailBody(DEFAULT_QUOTE_EMAIL_BODY);
            });
    }, [quote._id]);

    const previewContext = buildClientPlaceholderContext(quote, lead, leadFieldConfig);
    const placeholderGroups = groupPlaceholders(placeholders);
    const subjectPreview = applyQuotePlaceholders(emailSubject, previewContext);
    const bodyPreview = applyQuotePlaceholders(emailBody, previewContext);

    const insertPlaceholder = (field, key) => {
        const token = `{{${key}}}`;
        if (field === "subject") {
            const el = subjectRef.current;
            const start = el?.selectionStart ?? emailSubject.length;
            const end = el?.selectionEnd ?? start;
            const next = emailSubject.slice(0, start) + token + emailSubject.slice(end);
            setEmailSubject(next);
        } else {
            const el = bodyRef.current;
            const start = el?.selectionStart ?? emailBody.length;
            const end = el?.selectionEnd ?? emailBody.length;
            const next = emailBody.slice(0, start) + token + emailBody.slice(end);
            setEmailBody(next);
        }
    };

    const resetEmailTemplates = () => {
        setEmailSubject(DEFAULT_QUOTE_EMAIL_SUBJECT);
        setEmailBody(DEFAULT_QUOTE_EMAIL_BODY);
    };

    const sendHistory = [...(quote.sendHistory || [])].reverse();
    const activityLog = [...(quote.activityLog || [])].reverse();
    const followUps = [...(quote.followUps || [])].sort(
        (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
    );
    const pendingFollowUps = followUps.filter((f) => f.status === "pending");
    const hasBeenSent = (quote.sendCount || 0) > 0 || sendHistory.some((s) => s.success);

    const refreshQuote = (res) => {
        const q = res?.quote ?? res;
        if (q) onQuoteUpdated?.(q);
        return q;
    };

    const handleSend = async (resend = false) => {
        const to = sendEmail?.trim();
        if (!to) return toast.error("Enter customer email to send quote");
        try {
            setSendLoading(true);
            const res = await sendQuoteToCustomer(quote._id, to, {
                resend,
                subject: emailSubject,
                body: emailBody,
            });
            toast.success(res.message || (resend ? "Quote resent with PDF" : "Quote sent with PDF attachment"));
            refreshQuote(res);
        } catch (e) {
            const partial = e.response?.data?.quote;
            if (partial) refreshQuote({ quote: partial });
            toast.error(e.response?.data?.message || "Failed to send quote");
        } finally {
            setSendLoading(false);
        }
    };

    const handleStatus = async (status) => {
        try {
            setStatusLoading(true);
            const res = await updateQuote(quote._id, { status });
            toast.success(`Marked as ${status}`);
            refreshQuote(res);
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to update status");
        } finally {
            setStatusLoading(false);
        }
    };

    const handleAddFollowUp = async (presetDays) => {
        const scheduledAt = presetDays !== undefined ? addDays(presetDays) : followDate;
        if (!scheduledAt) return toast.error("Select a follow-up date");
        try {
            setFollowLoading(true);
            const res = await addQuoteFollowUp(quote._id, {
                scheduledAt: new Date(scheduledAt).toISOString(),
                note: followNote.trim() || (presetDays === 1 ? "Call tomorrow" : presetDays === 3 ? "Call in 3 days" : presetDays === 7 ? "Follow up next week" : ""),
            });
            toast.success("Follow-up scheduled");
            setFollowDate("");
            setFollowNote("");
            refreshQuote(res);
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to schedule follow-up");
        } finally {
            setFollowLoading(false);
        }
    };

    const handleFollowUpAction = async (followUpId, status) => {
        try {
            setFollowLoading(true);
            const res = await updateQuoteFollowUp(quote._id, followUpId, { status });
            toast.success(status === "completed" ? "Follow-up completed" : "Follow-up cancelled");
            refreshQuote(res);
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to update follow-up");
        } finally {
            setFollowLoading(false);
        }
    };

    return (
        <div className="space-y-4 border-t pt-4">
            {/* Send / Resend */}
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1.5">
                    <Send size={14} /> Send quote (PDF attached)
                    {hasBeenSent && (
                        <span className="ml-auto font-normal normal-case text-blue-700">
                            Sent {quote.sendCount || sendHistory.filter((s) => s.success).length} time
                            {(quote.sendCount || 0) !== 1 ? "s" : ""}
                            {quote.lastSentAt && ` · Last ${formatDateTime(quote.lastSentAt)}`}
                        </span>
                    )}
                </h3>
                <input
                    type="email"
                    value={sendEmail}
                    onChange={(e) => onSendEmailChange(e.target.value)}
                    placeholder="Customer email"
                    className={inp}
                />

                <div className="space-y-2 p-3 bg-white border border-blue-100 rounded-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                            <Mail size={12} /> Email subject &amp; body
                        </p>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setShowPreview((v) => !v)}
                                className={btnSecondary}
                            >
                                <Eye size={12} className="inline mr-1" />
                                {showPreview ? "Hide preview" : "Preview filled"}
                            </button>
                            <button type="button" onClick={resetEmailTemplates} className={btnSecondary}>
                                Reset templates
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 uppercase">Subject</label>
                        <input
                            ref={subjectRef}
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            placeholder="Project Quote — {{systemName}} for {{orgName}}"
                            className={inp}
                        />
                        {showPreview && (
                            <p className="text-[10px] text-emerald-700 mt-1 bg-emerald-50 px-2 py-1 rounded">
                                Preview: {subjectPreview}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 uppercase">Body</label>
                        <textarea
                            ref={bodyRef}
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            rows={8}
                            placeholder={"Dear {{contactPerson}},\n\nPlease find attached..."}
                            className={`${inp} resize-y font-mono text-xs`}
                        />
                        {showPreview && (
                            <pre className="text-[10px] text-gray-600 mt-1 bg-gray-50 border rounded p-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {bodyPreview}
                            </pre>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] text-gray-500 uppercase">Insert placeholder (click — uses cursor in Subject or Body)</p>
                        {["quote", "lead", "custom"].map((groupKey) =>
                            placeholderGroups[groupKey]?.length > 0 ? (
                                <div key={groupKey}>
                                    <p className="text-[10px] font-semibold text-gray-600 mb-1">
                                        {PLACEHOLDER_GROUP_LABELS[groupKey]}
                                        {groupKey === "custom" && (
                                            <span className="font-normal text-gray-400 ml-1">
                                                (from Lead → Manage fields)
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {placeholderGroups[groupKey].map((p) => (
                                            <button
                                                key={`${groupKey}-${p.key}`}
                                                type="button"
                                                title={p.label}
                                                onClick={() => {
                                                    const field =
                                                        document.activeElement === subjectRef.current
                                                            ? "subject"
                                                            : "body";
                                                    insertPlaceholder(field, p.key);
                                                }}
                                                className={`px-1.5 py-0.5 text-[10px] rounded hover:opacity-90 ${
                                                    groupKey === "custom"
                                                        ? "bg-violet-100 text-violet-800"
                                                        : groupKey === "lead"
                                                          ? "bg-emerald-100 text-emerald-800"
                                                          : "bg-blue-100 text-blue-800"
                                                }`}
                                            >
                                                {`{{${p.key}}}`}
                                                <span className="opacity-70 ml-0.5">· {p.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : groupKey === "custom" ? (
                                <p key={groupKey} className="text-[10px] text-gray-400 italic">
                                    No custom lead fields — add them under Leads → Manage fields (admin).
                                </p>
                            ) : null
                        )}
                        <p className="text-[10px] text-gray-400">
                            Custom fields use the same key as in lead setup (e.g. <code className="bg-gray-100 px-1 rounded">{`{{budget}}`}</code>).
                            PDF is attached automatically on send.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => handleSend(false)}
                        disabled={sendLoading}
                        className={btnPrimary}
                    >
                        <Send size={14} className="inline mr-1" />
                        {sendLoading ? "Sending…" : hasBeenSent ? "Send again" : "Send PDF to customer"}
                    </button>
                    {hasBeenSent && (
                        <button
                            type="button"
                            onClick={() => handleSend(true)}
                            disabled={sendLoading}
                            className={btnSecondary}
                            title="Log as resend in history"
                        >
                            <RotateCcw size={14} className="inline mr-1" />
                            Resend PDF
                        </button>
                    )}
                </div>

                {quote.status === "sent" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-[11px] text-gray-600 self-center">Customer response:</span>
                        <button
                            type="button"
                            disabled={statusLoading}
                            onClick={() => handleStatus("accepted")}
                            className={btnSuccess}
                        >
                            <CheckCircle2 size={14} className="inline mr-1" /> Accepted
                        </button>
                        <button
                            type="button"
                            disabled={statusLoading}
                            onClick={() => handleStatus("rejected")}
                            className={btnDanger}
                        >
                            <XCircle size={14} className="inline mr-1" /> Rejected
                        </button>
                    </div>
                )}
            </div>

            {/* Sent history */}
            {sendHistory.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                        <History size={14} /> Sent history
                    </h3>
                    <div className="border rounded-lg overflow-hidden divide-y max-h-48 overflow-y-auto">
                        {sendHistory.map((entry, i) => (
                            <div
                                key={entry._id || i}
                                className={`px-3 py-2 text-xs ${entry.success ? "bg-white" : "bg-red-50"}`}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`font-medium ${entry.success ? "text-emerald-700" : "text-red-700"}`}
                                    >
                                        {entry.success ? "Delivered" : "Failed"}
                                    </span>
                                    {entry.isResend && (
                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px]">
                                            Resend
                                        </span>
                                    )}
                                    <span className="text-gray-500 ml-auto">{formatDateTime(entry.sentAt)}</span>
                                </div>
                                <p className="text-gray-700 mt-0.5">To: {entry.to}</p>
                                <p className="text-gray-500">
                                    By {userName(entry.sentBy)}
                                    {entry.messageId && ` · ${entry.messageId.slice(0, 12)}…`}
                                </p>
                                {!entry.success && entry.error && (
                                    <p className="text-red-600 mt-0.5">{entry.error}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Follow-ups */}
            <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                    <Calendar size={14} /> Follow-ups
                    {pendingFollowUps.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px]">
                            {pendingFollowUps.length} pending
                        </span>
                    )}
                </h3>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={followLoading}
                        onClick={() => handleAddFollowUp(1)}
                        className={btnSecondary}
                    >
                        Tomorrow
                    </button>
                    <button
                        type="button"
                        disabled={followLoading}
                        onClick={() => handleAddFollowUp(3)}
                        className={btnSecondary}
                    >
                        In 3 days
                    </button>
                    <button
                        type="button"
                        disabled={followLoading}
                        onClick={() => handleAddFollowUp(7)}
                        className={btnSecondary}
                    >
                        Next week
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] text-gray-500 uppercase">Custom date</label>
                        <input
                            type="datetime-local"
                            value={followDate}
                            onChange={(e) => setFollowDate(e.target.value)}
                            className={inp}
                        />
                    </div>
                    <div className="flex-[2] min-w-[160px]">
                        <label className="text-[10px] text-gray-500 uppercase">Note</label>
                        <input
                            value={followNote}
                            onChange={(e) => setFollowNote(e.target.value)}
                            placeholder="Call / email / meeting…"
                            className={inp}
                        />
                    </div>
                    <button
                        type="button"
                        disabled={followLoading || !followDate}
                        onClick={() => handleAddFollowUp()}
                        className={btnPrimary}
                    >
                        Schedule
                    </button>
                </div>

                {followUps.length > 0 && (
                    <div className="border rounded-lg overflow-hidden divide-y max-h-40 overflow-y-auto bg-white">
                        {followUps.map((f) => (
                            <div key={f._id} className="px-3 py-2 text-xs flex flex-wrap items-center gap-2">
                                <Clock size={12} className="text-gray-400 shrink-0" />
                                <span className="font-medium">{formatDateTime(f.scheduledAt)}</span>
                                <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] capitalize ${
                                        f.status === "pending"
                                            ? "bg-amber-100 text-amber-800"
                                            : f.status === "completed"
                                              ? "bg-emerald-100 text-emerald-800"
                                              : "bg-gray-100 text-gray-600"
                                    }`}
                                >
                                    {f.status}
                                </span>
                                {f.note && <span className="text-gray-600 truncate flex-1">{f.note}</span>}
                                {f.status === "pending" && (
                                    <div className="flex gap-1 ml-auto shrink-0">
                                        <button
                                            type="button"
                                            disabled={followLoading}
                                            onClick={() => handleFollowUpAction(f._id, "completed")}
                                            className="p-1 rounded hover:bg-emerald-50 text-emerald-700"
                                            title="Mark done"
                                        >
                                            <CheckCircle2 size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={followLoading}
                                            onClick={() => handleFollowUpAction(f._id, "cancelled")}
                                            className="p-1 rounded hover:bg-red-50 text-red-600"
                                            title="Cancel"
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Activity log */}
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setShowActivity((v) => !v)}
                    className="w-full flex items-center justify-between text-xs font-bold text-gray-700 uppercase"
                >
                    <span className="flex items-center gap-1.5">
                        <List size={14} /> Activity log ({activityLog.length})
                    </span>
                    {showActivity ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showActivity && activityLog.length > 0 && (
                    <div className="border rounded-lg overflow-hidden divide-y max-h-56 overflow-y-auto">
                        {activityLog.map((entry, i) => (
                            <div key={entry._id || i} className="px-3 py-2 text-xs bg-gray-50/50">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="font-semibold text-gray-800">
                                        {ACTION_LABELS[entry.action] || entry.action}
                                    </span>
                                    <span className="text-gray-400 ml-auto">
                                        {formatDateTime(entry.performedAt)}
                                    </span>
                                </div>
                                {entry.summary && <p className="text-gray-600 mt-0.5">{entry.summary}</p>}
                                <p className="text-gray-400 text-[10px] mt-0.5">
                                    {userName(entry.performedBy)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
                {showActivity && activityLog.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">No activity yet</p>
                )}
            </div>
        </div>
    );
}
