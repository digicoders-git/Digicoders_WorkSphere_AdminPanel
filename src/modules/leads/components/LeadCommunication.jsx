import { useState } from "react";
import { MessageSquare, Plus, ChevronDown, ChevronUp, Send } from "lucide-react";
import { toast } from "react-toastify";
import { addCommunication } from "../services/leadService";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const fmtDate = (d) =>
    new Date(d).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

const LeadCommunication = ({ leadId, communications = [], onAdded }) => {
    const [showAll, setShowAll] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!description.trim()) return toast.error("Description is required");
        try {
            setSaving(true);
            const res = await addCommunication(leadId, { subject: subject.trim(), description: description.trim() });
            toast.success("Communication added");
            setSubject("");
            setDescription("");
            setShowForm(false);
            onAdded?.(res.communication);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to add");
        } finally { setSaving(false); }
    };

    // newest first
    const sorted = [...communications].reverse();
    const visible = showAll ? sorted : sorted.slice(0, 1);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-blue-500" />
                    <span className="text-sm font-semibold text-gray-800">
                        Communications
                        {communications.length > 0 && (
                            <span className="ml-1.5 text-xs font-normal text-gray-400">({communications.length})</span>
                        )}
                    </span>
                </div>
                <button
                    onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium"
                >
                    <Plus size={11} /> Add
                </button>
            </div>

            {showForm && (
                <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                    <input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Subject"
                        className={inp}
                    />
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Description…"
                        rows={3}
                        className={inp}
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => { setShowForm(false); setSubject(""); setDescription(""); }}
                            className="px-3 py-1.5 text-xs border border-gray-200 bg-white rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60"
                        >
                            <Send size={11} /> {saving ? "Saving…" : "Submit"}
                        </button>
                    </div>
                </div>
            )}

            {communications.length === 0 ? (
                <p className="text-xs text-gray-400 py-1">No communications yet.</p>
            ) : (
                <div className="space-y-2">
                    {visible.map((c, i) => (
                        <div key={c._id || i} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-gray-800">{c.subject}</p>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">{fmtDate(c.addedAt)}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{c.description}</p>
                            {c.addedBy && (
                                <p className="text-[10px] text-gray-400 mt-1.5">
                                    — {c.addedBy.firstName} {c.addedBy.lastName}
                                </p>
                            )}
                        </div>
                    ))}

                    {communications.length > 1 && (
                        <button
                            onClick={() => setShowAll(v => !v)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium pt-1"
                        >
                            {showAll
                                ? <><ChevronUp size={12} /> Show less</>
                                : <><ChevronDown size={12} /> View all {communications.length} communications</>
                            }
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default LeadCommunication;
