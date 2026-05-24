import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
    FileText, Search, Filter, Eye, CheckCircle2, Clock,
    Send, ChevronLeft, ChevronRight, RefreshCw, IndianRupee, Calendar, CreditCard,
} from "lucide-react";
import { toast } from "react-toastify";
import { getAllQuotes } from "../../leads/services/quoteService";
import QuotePreview from "../../leads/components/QuotePreview";

const STATUS_META = {
    draft:    { label: "Draft",    color: "bg-gray-100 text-gray-600 border-gray-200",          dot: "bg-gray-400" },
    sent:     { label: "Sent",     color: "bg-blue-100 text-blue-700 border-blue-200",           dot: "bg-blue-500" },
    accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-600 border-red-200",              dot: "bg-red-500" },
};

const PAGE_LIMIT = 20;
const fmt     = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const StatCard = ({ icon: Icon, label, value, sub, color = "blue" }) => {
    const colors = {
        blue:    "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber:   "bg-amber-50 text-amber-600 border-amber-100",
        gray:    "bg-gray-50 text-gray-500 border-gray-100",
    };
    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${colors[color]}`}>
            <div className="p-2 rounded-lg bg-white/70"><Icon size={18} /></div>
            <div>
                <p className="text-xs font-medium opacity-70">{label}</p>
                <p className="text-lg font-bold leading-tight">{value}</p>
                {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const m = STATUS_META[status] || STATUS_META.draft;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${m.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
            {m.label}
        </span>
    );
};

export default function QuoteManagement() {
    const [quotes, setQuotes]           = useState([]);
    const [total, setTotal]             = useState(0);
    const [stats, setStats]             = useState({ draft: 0, sent: 0, accepted: 0, rejected: 0, revenue: 0, pending: 0 });
    const [statsLoaded, setStatsLoaded] = useState(false);
    const [page, setPage]               = useState(1);
    const [loading, setLoading]         = useState(false);
    const [search, setSearch]           = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [preview, setPreview]         = useState(null);
    const [tab, setTab]                 = useState("quotes");
    const debounceRef                   = useRef(null);

    // Fetch accurate global stats once (no filter, no search)
    const loadStats = useCallback(async () => {
        try {
            const [draftRes, sentRes, acceptedRes, rejectedRes] = await Promise.all([
                getAllQuotes({ status: "draft",    limit: 1 }),
                getAllQuotes({ status: "sent",     limit: 1 }),
                getAllQuotes({ status: "accepted", limit: 200 }),
                getAllQuotes({ status: "rejected", limit: 1 }),
            ]);
            const acceptedList = acceptedRes.quotes || [];
            setStats({
                draft:    draftRes.total    || 0,
                sent:     sentRes.total     || 0,
                accepted: acceptedRes.total || 0,
                rejected: rejectedRes.total || 0,
                revenue:  acceptedList.reduce((s, q) => s + (q.grandTotal || 0), 0),
                pending:  0, // updated from list load
            });
            setStatsLoaded(true);
        } catch { /* silent — stats are non-critical */ }
    }, []);

    const load = useCallback(async (pg, q, status) => {
        try {
            setLoading(true);
            const params = { page: pg, limit: PAGE_LIMIT };
            if (q)      params.search = q;
            if (status) params.status = status;
            const res  = await getAllQuotes(params);
            const list = res.quotes || [];
            setQuotes(list);
            setTotal(res.total || 0);
            // Update pending follow-up count from current page
            const pending = list.filter(q => (q.followUps || []).some(f => f.status === "pending")).length;
            setStats(prev => ({ ...prev, pending }));
        } catch {
            toast.error("Failed to load quotes");
        } finally {
            setLoading(false);
        }
    }, []);

    // Load stats once on mount
    useEffect(() => { loadStats(); }, [loadStats]);

    // Reload list whenever page / search / filter changes
    useEffect(() => {
        load(page, search, filterStatus);
    }, [page, search, filterStatus, load]);

    // Refresh stats after filter/search clears so numbers stay accurate
    useEffect(() => {
        if (!filterStatus && !search && statsLoaded) loadStats();
    }, [filterStatus, search]); // eslint-disable-line

    const handleSearch = (val) => {
        setSearchInput(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { setPage(1); setSearch(val); }, 400);
    };

    const handleStatusFilter = (s) => { setFilterStatus(s); setPage(1); };

    const handlePreviewUpdated = (q) => {
        setPreview(q);
        setQuotes(prev => prev.map(x => x._id === q._id ? { ...x, ...q } : x));
        // Refresh stats since status may have changed
        loadStats();
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {tab === "quotes" ? (
                            <><FileText size={22} className="text-blue-600" /> Quote Management</>
                        ) : (
                            <><CreditCard size={22} className="text-amber-600" /> Payment Accounts</>
                        )}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {tab === "quotes" 
                            ? (total > 0 ? `${total.toLocaleString()} total quotes` : "Track and manage all quotes")
                            : "Manage company branding, bank details and payment QR codes"
                        }
                    </p>
                </div>
                <button
                    onClick={() => { load(page, search, filterStatus); loadStats(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-6 shadow-sm">
                <button
                    onClick={() => setTab("quotes")}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                        tab === "quotes"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                >
                    Quotes
                </button>
                <button
                    onClick={() => setTab("payment-accounts")}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                        tab === "payment-accounts"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                >
                    Payment Settings
                </button>
            </div>

            {tab === "quotes" && (
            <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <StatCard icon={FileText}     label="Total"      value={total}                     color="gray" />
                <StatCard icon={Clock}        label="Draft"      value={stats.draft}               color="gray" />
                <StatCard icon={Send}         label="Sent"       value={stats.sent}                color="blue" />
                <StatCard icon={CheckCircle2} label="Accepted"   value={stats.accepted}            color="emerald" />
                <StatCard icon={IndianRupee}  label="Revenue"    value={`₹${fmt(stats.revenue)}`}  color="emerald" sub="accepted quotes" />
                <StatCard icon={Calendar}     label="Follow-ups" value={stats.pending}             color="amber"   sub="pending this page" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={searchInput}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search by system or title…"
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                </div>
                <div className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-lg">
                    <Filter size={13} className="text-gray-400 ml-2 shrink-0" />
                    {["", "draft", "sent", "accepted", "rejected"].map(s => (
                        <button
                            key={s}
                            onClick={() => handleStatusFilter(s)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                                filterStatus === s ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            {s || "All"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : quotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <FileText size={48} className="text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium">
                        {search || filterStatus ? "No quotes match your filters" : "No quotes yet"}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">Quotes are created from the Leads section</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Quote / System", "Lead / Client", "Amount", "Status", "Sent", "Follow-ups", "Created", ""].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {quotes.map(quote => {
                                    const lead      = quote.leadId;
                                    const pendingFU = (quote.followUps || []).filter(f => f.status === "pending").length;
                                    return (
                                        <tr key={quote._id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-gray-900 truncate max-w-[180px]">{quote.title}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-[180px]">{quote.systemName}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                                        <span className="text-[10px] font-bold text-blue-600">
                                                            {(lead?.orgName || "?")[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{lead?.orgName || "—"}</p>
                                                        <p className="text-xs text-gray-400 truncate max-w-[140px]">{lead?.contactPerson || lead?.email || ""}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="font-semibold text-gray-900">₹{fmt(quote.grandTotal)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={quote.status} />
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                {(quote.sendCount || 0) > 0
                                                    ? <span className="flex items-center gap-1"><Send size={11} /> {quote.sendCount}×</span>
                                                    : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {pendingFU > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                                                        <Calendar size={10} /> {pendingFU} pending
                                                    </span>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                                {fmtDate(quote.createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setPreview(quote)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg"
                                                    title="Preview quote"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                                {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, total)} of {total.toLocaleString()} quotes
                            </span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-600">
                                    <ChevronLeft size={15} />
                                </button>
                                <span className="text-xs text-gray-600 px-2">{page} / {totalPages}</span>
                                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-600">
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quote Preview Modal */}
            {preview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setPreview(null)} />
                    <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6">
                            <QuotePreview
                                quote={preview}
                                lead={preview.leadId}
                                onClose={() => setPreview(null)}
                                onUpdated={handlePreviewUpdated}
                            />
                        </div>
                    </div>
                </div>
            )}
            </>
            )}

            {tab === "payment-accounts" && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="text-center py-8">
                        <CreditCard size={48} className="text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Payment Accounts Management</h3>
                        <p className="text-gray-500 mb-6">Access payment accounts through the following options:</p>
                        <Link
                            to="/payment-accounts"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <CreditCard size={18} /> Go to Payment Accounts
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
