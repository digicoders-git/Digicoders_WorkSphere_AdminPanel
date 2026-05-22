import { calcQuoteTotals, formatReqPrice } from "./quoteFormUtils";

const proposedLabel = (quote) =>
    quote.proposedSystemCategory === "Other"
        ? quote.proposedSystemOther || "Other"
        : quote.proposedSystemCategory || quote.proposedSystem;

/** Read-only document layout aligned with Sample Quote.pdf */
export default function QuoteDocumentView({ quote, form, editing, lead: leadOverride }) {
    const data = editing ? form : quote;
    const lead = leadOverride ?? quote.leadId;
    const { totalPages, totalReqs, grandTotal } = editing ? calcQuoteTotals(form) : {
        totalPages: quote.totalPagesCost || 0,
        totalReqs: quote.totalRequirementsCost || 0,
        grandTotal: quote.grandTotal || 0,
    };

    const currentDate = new Date(quote.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const pages = data.pages?.filter((p) => p.name) || [];
    const tech = data.techStack?.filter((t) => t.label) || [];
    const reqs = data.otherRequirements?.filter((r) => r.requirement) || [];

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden text-sm">
            <div className="text-center py-6 px-4 border-b-2 border-blue-800 bg-gradient-to-b from-slate-50 to-white">
                <img src="/logo.png" alt="DigiCoders" className="h-12 mx-auto mb-2 object-contain" />
                <h1 className="text-lg font-bold text-blue-900">
                    Proposal For {proposedLabel(data)} from #TeamDigiCoders
                </h1>
                <p className="text-xs text-slate-600 mt-1 font-medium">DigiCoders Technologies (P) Ltd.</p>
            </div>

            <div className="p-5 space-y-5">
                <div className="bg-slate-50 border-l-4 border-blue-700 pl-4 py-3 text-slate-600 text-xs leading-relaxed">
                    Hello <strong>{lead?.contactPerson || "Sir/Ma'am"}</strong>, proposal for{" "}
                    <strong>{lead?.orgName || "your organization"}</strong> — quote date {currentDate}.
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-blue-700">Proposed System for → {proposedLabel(data)}</p>
                    <p className="text-lg font-bold text-blue-900 mt-1">
                        1. System Name → {editing ? form.systemName : quote.systemName}
                    </p>
                </div>

                {pages.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-3">Modules & features</h3>
                        <div className="space-y-3">
                            {pages.map((page, idx) => (
                                <div key={idx} className="border rounded-lg p-3">
                                    <div className="flex flex-wrap justify-between gap-2 font-semibold text-slate-800">
                                        <span>{String.fromCharCode(97 + idx)}. {page.name}</span>
                                        <span className="text-blue-700 text-xs">
                                            [Cost: ₹ {(page.cost || 0).toLocaleString("en-IN")} /-]
                                        </span>
                                    </div>
                                    {page.descriptions?.filter(Boolean).length > 0 && (
                                        <ul className="mt-2 list-disc list-inside text-xs text-slate-600 space-y-0.5">
                                            {page.descriptions.filter(Boolean).map((d, i) => (
                                                <li key={i}>{d}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tech.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-2">Tech Stack</h3>
                        <div className="space-y-1.5">
                            {tech.map((t, i) => (
                                <div key={i} className="text-xs bg-slate-50 border-l-2 border-blue-400 pl-3 py-1.5">
                                    {t.label}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {reqs.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-2">
                            Other Requirements for → {editing ? form.systemName : quote.systemName}
                        </h3>
                        <table className="w-full text-xs border rounded-lg overflow-hidden">
                            <thead className="bg-blue-800 text-white">
                                <tr>
                                    <th className="text-left p-2">Requirement</th>
                                    <th className="text-left p-2">Term</th>
                                    <th className="text-right p-2">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reqs.map((r, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="p-2">{r.requirement}</td>
                                        <td className="p-2 text-slate-500">{r.term || "—"}</td>
                                        <td className="p-2 text-right font-medium">{formatReqPrice(r)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div>
                    <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-2">Costing for development</h3>
                    <table className="w-full text-xs border rounded-lg overflow-hidden">
                        <thead className="bg-blue-800 text-white">
                            <tr>
                                <th className="text-left p-2">Module / Page</th>
                                <th className="text-left p-2">Term</th>
                                <th className="text-right p-2">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pages.map((p, i) => (
                                <tr key={i} className="border-t">
                                    <td className="p-2 font-medium">{p.name}</td>
                                    <td className="p-2">One Time</td>
                                    <td className="p-2 text-right">₹ {(p.cost || 0).toLocaleString("en-IN")} /-</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-100 font-semibold border-t">
                                <td colSpan={2} className="p-2">Sub Total</td>
                                <td className="p-2 text-right">₹ {totalPages.toLocaleString("en-IN")} /-</td>
                            </tr>
                            {totalReqs > 0 && (
                                <tr className="bg-slate-100 font-semibold">
                                    <td colSpan={2} className="p-2">Other requirements</td>
                                    <td className="p-2 text-right">₹ {totalReqs.toLocaleString("en-IN")} /-</td>
                                </tr>
                            )}
                            <tr className="bg-amber-50 text-amber-900 text-[11px]">
                                <td colSpan={2} className="p-2">18% GST (Tax) — Excluded</td>
                                <td className="p-2 text-right">—</td>
                            </tr>
                            <tr className="bg-blue-800 text-white font-bold">
                                <td colSpan={2} className="p-2">Offered Price / Net Amount</td>
                                <td className="p-2 text-right text-sm">
                                    ₹ {grandTotal.toLocaleString("en-IN")} /-
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {(editing ? form.notes : quote.notes) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 whitespace-pre-wrap">
                        {(editing ? form.notes : quote.notes)}
                    </div>
                )}
            </div>
        </div>
    );
}
