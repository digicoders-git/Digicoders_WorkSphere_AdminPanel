import { useState, useEffect } from "react";
import { X, ArrowLeft, Printer, LayoutPanelLeft } from "lucide-react";
import { toast } from "react-toastify";
import { getQuoteHTML, getQuoteById, printPDFFromHTML } from "../services/quoteService";
import { listQuoteProfiles } from "../services/quoteProfileService";
import { getFieldConfig } from "../services/leadService";
import QuoteDocumentView from "./QuoteDocumentView";
import QuoteSendPanel from "./QuoteSendPanel";
import PageEditorFullscreen from "./PageEditorFullscreen";

const btn = "px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5";

const STATUS_STYLES = {
    draft:    "bg-gray-100 text-gray-600 border-gray-200",
    sent:     "bg-blue-100 text-blue-700 border-blue-200",
    accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-red-100 text-red-600 border-red-200",
};

export default function QuotePreview({ quote: initialQuote, lead, onClose, onUpdated }) {
    const [quote, setQuote]             = useState(initialQuote);
    const [quoteLoading, setQuoteLoading] = useState(true);
    const [pdfLoading, setPdfLoading]   = useState(false);
    const [sendEmail, setSendEmail]     = useState("");
    const [activePanel, setActivePanel] = useState("preview");
    const [pageEditorOpen, setPageEditorOpen] = useState(false);
    const [leadFieldConfig, setLeadFieldConfig] = useState([]);
    const [quoteProfiles, setQuoteProfiles] = useState([]);

    useEffect(() => {
        getFieldConfig()
            .then((r) => setLeadFieldConfig(r.fields || []))
            .catch(() => {});
        listQuoteProfiles()
            .then((list) => setQuoteProfiles(list))
            .catch(() => {});
    }, []);

    const reloadQuote = async () => {
        setQuoteLoading(true);
        try {
            const res = await getQuoteById(initialQuote._id);
            const q   = res.quote ?? res;
            setQuote(q);
            return q;
        } finally {
            setQuoteLoading(false);
        }
    };

    useEffect(() => {
        reloadQuote().catch(() => toast.error("Failed to load quote"));
    }, [initialQuote._id]);

    useEffect(() => {
        const email = lead?.email ?? quote.leadId?.email ?? "";
        setSendEmail(email);
    }, [lead?.email, quote.leadId?.email]);

    const handleQuoteUpdated = (q) => {
        setQuote(q);
        onUpdated?.(q);
    };

    const handlePagesSaved = (q) => {
        handleQuoteUpdated(q);
        setPageEditorOpen(false);
    };

    const handlePrintPDF = async () => {
        try {
            setPdfLoading(true);
            const html = await getQuoteHTML(quote._id);
            await printPDFFromHTML(html);
            toast.info('Use "Save as PDF" in the print dialog for best quality');
        } catch { toast.error("Failed to open print preview"); }
        finally { setPdfLoading(false); }
    };

    const statusClass = STATUS_STYLES[quote.status] || STATUS_STYLES.draft;
    const isDraft     = quote.status === "draft";

    const tabs = [
        { key: "preview", label: "📄 Document" },
        { key: "send",    label: "📨 Send & Follow-up" },
    ];

    return (
        <>
            <div className="flex flex-col h-full min-h-[480px]">

                <div className="flex items-center justify-between gap-2 pb-3 border-b shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <button type="button" onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">
                            <ArrowLeft size={16} />
                        </button>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                                {quote.title || "Quote Preview"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusClass}`}>
                                    {quote.status}
                                </span>
                                {(quote.sendCount || 0) > 0 && (
                                    <span className="text-[10px] text-gray-400">Sent {quote.sendCount}×</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <button
                            type="button"
                            onClick={() => setPageEditorOpen(true)}
                            className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}
                        >
                            <LayoutPanelLeft size={14} /> Edit
                        </button>
                        <button type="button" onClick={handlePrintPDF} disabled={pdfLoading}
                            className={`${btn} bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60`}
                            title="Open print dialog — choose Save as PDF">
                            <Printer size={14} /> {pdfLoading ? "…" : "Print / Save PDF"}
                        </button>
                        <button type="button" onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl my-3 shrink-0">
                    {tabs.map(({ key, label }) => (
                        <button key={key} type="button" onClick={() => setActivePanel(key)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                                activePanel === key
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {activePanel === "preview" && (
                        quoteLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <QuoteDocumentView quote={quote} lead={lead} leadFieldConfig={leadFieldConfig} />
                        )
                    )}
                    {activePanel === "send" && (
                        <QuoteSendPanel
                            quote={quote}
                            lead={lead}
                            sendEmail={sendEmail}
                            onSendEmailChange={setSendEmail}
                            onQuoteUpdated={handleQuoteUpdated}
                        />
                    )}
                </div>
            </div>

            {pageEditorOpen && (
                <PageEditorFullscreen
                    quote={quote}
                    lead={lead}
                    leadFieldConfig={leadFieldConfig}
                    quoteProfiles={quoteProfiles}
                    onClose={() => setPageEditorOpen(false)}
                    onSaved={handlePagesSaved}
                />
            )}
        </>
    );
}
