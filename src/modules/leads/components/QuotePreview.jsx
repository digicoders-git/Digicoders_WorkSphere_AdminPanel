import { useState, useEffect } from "react";

import { Download, X, Pencil, Save, ArrowLeft, FileEdit } from "lucide-react";

import { toast } from "react-toastify";

import {

    getQuoteHTML,

    updateQuote,

    getQuoteById,

    generatePDFFromHTML,

    printPDFFromHTML,

    downloadQuoteAsText,

} from "../services/quoteService";

import { PROPOSED_SYSTEM_OPTIONS, quoteToForm } from "./quoteFormUtils";

import QuoteDocumentView from "./QuoteDocumentView";

import QuoteSendPanel from "./QuoteSendPanel";



const inp = "w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500";

const btn = "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors";

const btnPrimary = `${btn} bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60`;



const STATUS_STYLES = {

    draft: "bg-gray-100 text-gray-700",

    sent: "bg-blue-100 text-blue-800",

    accepted: "bg-emerald-100 text-emerald-800",

    rejected: "bg-red-100 text-red-800",

};



export default function QuotePreview({ quote: initialQuote, lead, onClose, onUpdated, onEditDraft }) {

    const [quote, setQuote] = useState(initialQuote);

    const [form, setForm] = useState(() => quoteToForm(initialQuote));

    const [editing, setEditing] = useState(false);

    const [saving, setSaving] = useState(false);

    const [pdfLoading, setPdfLoading] = useState(false);

    const [sendEmail, setSendEmail] = useState(initialQuote.leadId?.email || "");



    const reloadQuote = async () => {

        const res = await getQuoteById(initialQuote._id);

        const q = res.quote ?? res;

        setQuote(q);

        setForm(quoteToForm(q));

        return q;

    };



    useEffect(() => {

        reloadQuote().catch(() => toast.error("Failed to load quote details"));

    }, [initialQuote._id]);



    useEffect(() => {

        const email = lead?.email ?? quote.leadId?.email ?? "";

        if (email) setSendEmail(email);

    }, [lead?.email, quote.leadId?.email]);



    const handleQuoteUpdated = (q) => {

        setQuote(q);

        setForm(quoteToForm(q));

        onUpdated?.(q);

    };



    const handleSave = async () => {

        if (!form.systemName?.trim()) return toast.error("System name is required");

        try {

            setSaving(true);

            const payload = {

                title: form.title,

                proposedSystemCategory: form.proposedSystemCategory,

                proposedSystemOther: form.proposedSystemOther,

                systemName: form.systemName,

                notes: form.notes,

            };

            const res = await updateQuote(quote._id, payload);

            const q = res.quote ?? res;

            handleQuoteUpdated(q);

            setEditing(false);

            toast.success("Quote updated");

        } catch (e) {

            toast.error(e.response?.data?.message || "Failed to save quote");

        } finally {

            setSaving(false);

        }

    };



    const quotePdfName = () => `${(quote.systemName || "quote").replace(/\s+/g, "-")}-quote.pdf`;



    const handleDownloadPDF = async () => {

        try {

            setPdfLoading(true);

            const html = await getQuoteHTML(quote._id);

            await generatePDFFromHTML(html, quotePdfName());

            toast.success("PDF downloaded");

        } catch {

            toast.error("Failed to generate PDF");

        } finally {

            setPdfLoading(false);

        }

    };



    const handlePrintPDF = async () => {

        try {

            setPdfLoading(true);

            const html = await getQuoteHTML(quote._id);

            await printPDFFromHTML(html);

            toast.info('Choose "Save as PDF" or "Microsoft Print to PDF" in the print dialog for best quality');

        } catch {

            toast.error("Failed to open print preview");

        } finally {

            setPdfLoading(false);

        }

    };



    const statusClass = STATUS_STYLES[quote.status] || STATUS_STYLES.draft;



    return (

        <div className="flex flex-col h-full min-h-[480px]">

            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b shrink-0">

                <div className="flex items-center gap-2">

                    <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">

                        <ArrowLeft size={16} />

                    </button>

                    <div>

                        <h2 className="text-sm font-semibold text-gray-900">Quote preview</h2>

                        <div className="flex items-center gap-2 mt-0.5">

                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${statusClass}`}>

                                {quote.status}

                            </span>

                            {(quote.sendCount || 0) > 0 && (

                                <span className="text-[10px] text-gray-500">

                                    Sent {quote.sendCount}×

                                </span>

                            )}

                        </div>

                    </div>

                </div>

                <div className="flex flex-wrap items-center gap-2">

                    {editing ? (

                        <>

                            <button

                                type="button"

                                onClick={() => { setEditing(false); setForm(quoteToForm(quote)); }}

                                className={`${btn} bg-gray-100 text-gray-700`}

                            >

                                Cancel

                            </button>

                            <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>

                                <Save size={14} className="inline mr-1" />

                                {saving ? "Saving…" : "Save"}

                            </button>

                        </>

                    ) : (

                        <>

                            {quote.status === "draft" && onEditDraft && (

                                <button

                                    type="button"

                                    onClick={() => onEditDraft(quote)}

                                    className={`${btn} bg-emerald-50 text-emerald-800 border border-emerald-200`}

                                >

                                    <FileEdit size={14} className="inline mr-1" /> Full edit

                                </button>

                            )}

                            <button

                                type="button"

                                onClick={() => setEditing(true)}

                                className={`${btn} bg-amber-50 text-amber-800`}

                            >

                                <Pencil size={14} className="inline mr-1" /> Quick edit

                            </button>

                        </>

                    )}

                    <button type="button" onClick={handlePrintPDF} disabled={pdfLoading} className={btnPrimary} title="Best quality — use Save as PDF in print dialog">

                        <Download size={14} className="inline mr-1" />

                        {pdfLoading ? "…" : "Print / PDF"}

                    </button>

                    <button

                        type="button"

                        onClick={handleDownloadPDF}

                        disabled={pdfLoading}

                        className={`${btn} bg-gray-100 hover:bg-gray-200 text-gray-700`}

                        title="Quick download (may be slightly softer than Print)"

                    >

                        {pdfLoading ? "…" : "Download"}

                    </button>

                    <button type="button" onClick={() => downloadQuoteAsText(quote)} className={`${btn} bg-gray-100 text-gray-700`}>

                        TXT

                    </button>

                    <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">

                        <X size={16} />

                    </button>

                </div>

            </div>



            <div className="flex-1 overflow-y-auto py-4 space-y-4">

                {editing ? (

                    <div className="space-y-3 p-4 border border-amber-200 bg-amber-50/30 rounded-xl">

                        <p className="text-xs font-semibold text-amber-800">Edit mode — changes reflect in preview below after save</p>

                        <input

                            className={inp}

                            value={form.title}

                            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}

                            placeholder="Quote title"

                        />

                        <input

                            className={inp}

                            value={form.systemName}

                            onChange={(e) => setForm((p) => ({ ...p, systemName: e.target.value }))}

                            placeholder="System name"

                        />

                        <div className="flex flex-wrap gap-2">

                            {PROPOSED_SYSTEM_OPTIONS.map((opt) => (

                                <label

                                    key={opt}

                                    className={`px-2 py-1 rounded border text-xs cursor-pointer ${

                                        form.proposedSystemCategory === opt ? "bg-blue-600 text-white" : ""

                                    }`}

                                >

                                    <input

                                        type="radio"

                                        className="sr-only"

                                        checked={form.proposedSystemCategory === opt}

                                        onChange={() => setForm((p) => ({ ...p, proposedSystemCategory: opt }))}

                                    />

                                    {opt}

                                </label>

                            ))}

                        </div>

                        <textarea

                            className={inp}

                            rows={4}

                            value={form.notes}

                            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}

                            placeholder="Payment terms & notes"

                        />

                        <p className="text-[11px] text-gray-500">

                            Quick edit updates title and notes only. Use Full edit for pages, costs, and requirements (draft only).

                        </p>

                    </div>

                ) : null}



                <QuoteDocumentView quote={quote} form={form} editing={editing} lead={lead} />



                {!editing && (

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

    );

}

