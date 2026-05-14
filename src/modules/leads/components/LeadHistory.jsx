import { useState } from "react";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";

const fmtDate = (d) =>
    new Date(d).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

// Resolve a value: if it looks like a 24-char hex ObjectId, look it up in users list
const resolveValue = (val, users) => {
    if (!val) return null;
    if (/^[a-f0-9]{24}$/i.test(String(val))) {
        const u = users.find(u => u._id === val || u._id?.toString() === val);
        return u ? `${u.firstName} ${u.lastName}` : val;
    }
    return val;
};

const ChangeRow = ({ field, from, to, users }) => (
    <div className="flex items-start gap-2 text-xs">
        <span className="text-gray-500 capitalize min-w-[90px] shrink-0">{field.replace(/([A-Z])/g, " $1")}</span>
        <span className="text-red-400 line-through truncate max-w-[120px]">{resolveValue(from, users) ?? "—"}</span>
        <span className="text-gray-400">→</span>
        <span className="text-green-600 truncate max-w-[120px]">{resolveValue(to, users) ?? "—"}</span>
    </div>
);

const LeadHistory = ({ history = [], users = [] }) => {
    const [showAll, setShowAll] = useState(false);

    // newest first
    const sorted = [...history].reverse();
    const visible = showAll ? sorted : sorted.slice(0, 1);

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-800">
                    History
                    {history.length > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">({history.length})</span>
                    )}
                </span>
            </div>

            {history.length === 0 ? (
                <p className="text-xs text-gray-400 py-1">No history yet.</p>
            ) : (
                <div className="space-y-2">
                    {visible.map((h, i) => (
                        <div key={h._id || i} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-gray-400">{fmtDate(h.changedAt)}</span>
                                {h.changedBy && (
                                    <span className="text-[10px] text-gray-500">
                                        {h.changedBy.firstName} {h.changedBy.lastName}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1">
                                {Object.entries(h.changes || {}).map(([field, { from, to }]) => (
                                    <ChangeRow key={field} field={field} from={from} to={to} users={users} />
                                ))}
                            </div>
                        </div>
                    ))}

                    {history.length > 1 && (
                        <button
                            onClick={() => setShowAll(v => !v)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium pt-1"
                        >
                            {showAll
                                ? <><ChevronUp size={12} /> Show less</>
                                : <><ChevronDown size={12} /> View all {history.length} history entries</>
                            }
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default LeadHistory;
