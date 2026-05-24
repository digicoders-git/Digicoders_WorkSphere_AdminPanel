import { useMemo } from "react";
import { formatReqPrice } from "./quoteFormUtils";
import { getQuoteProfile, getProfilePaymentFields } from "./quotePaymentDisplay";
import { buildClientPlaceholderContext, resolveQuoteText } from "./quoteEmailUtils";

const proposedLabel = (quote) =>
    quote.proposedSystemCategory === "Other"
        ? quote.proposedSystemOther || "Other"
        : quote.proposedSystemCategory || quote.proposedSystem;

/** Read-only document layout — mirrors the server PDF */
export default function QuoteDocumentView({ quote, lead: leadOverride, leadFieldConfig = [] }) {
    const lead = leadOverride ?? quote.leadId;
    const phCtx = useMemo(
        () => buildClientPlaceholderContext(quote, lead, leadFieldConfig),
        [quote, lead, leadFieldConfig]
    );
    const ph = (text) => resolveQuoteText(text, phCtx);

    const { totalPages, totalReqs, grandTotal } = {
        totalPages: quote.totalPagesCost || 0,
        totalReqs: quote.totalRequirementsCost || 0,
        grandTotal: quote.grandTotal || 0,
    };

    const currentDate = new Date(quote.createdAt || Date.now()).toLocaleDateString("en-IN", {
        year: "numeric", month: "long", day: "numeric",
    });

    const pages = quote.pages?.filter((p) => p.name) || [];
    const tech  = quote.techStack?.filter((t) => t.label) || [];
    const reqs  = quote.otherRequirements?.filter((r) => r.requirement) || [];

    const profile = getQuoteProfile(quote);
    const logoUrl = profile?.logo?.url || "/logo.png";
    const companyName = profile?.companyName || "";
    const tagline = profile?.tagline || "";
    const profileWebsite = profile?.website || "";
    const profileEmail = profile?.email || "";

    const notesTrimmed = ph(quote.notes || "").trim();
    const payment = getProfilePaymentFields(profile);

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden text-sm">
            <div className="text-center py-6 px-4 border-b-2 border-blue-800 bg-linear-to-b from-slate-50 to-white">
                <img src={logoUrl} alt="logo" className="h-12 mx-auto mb-2 object-contain"
                    onError={e => { e.target.src = "/logo.png"; }} />
                <h1 className="text-lg font-bold text-blue-900">
                    Proposal For {proposedLabel(quote)}
                </h1>
                {companyName && <p className="text-xs font-semibold text-slate-600 mt-1">{companyName}</p>}
                {(tagline || profileWebsite || profileEmail) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                        {[tagline, profileWebsite, profileEmail].filter(Boolean).join(" · ")}
                    </p>
                )}
                <p className="text-xs text-slate-400 mt-1">{currentDate}</p>
            </div>

            <div className="p-5 space-y-5">
                <div className="bg-slate-50 border-l-4 border-blue-700 pl-4 py-3 text-slate-600 text-xs leading-relaxed">
                    Hello <strong>{lead?.contactPerson || "Sir/Ma'am"}</strong>, proposal for{" "}
                    <strong>{lead?.orgName || "your organization"}</strong> — quote date {currentDate}.
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-blue-700">Proposed System for → {proposedLabel(quote)}</p>
                    <p className="text-lg font-bold text-blue-900 mt-1">1. System Name → {ph(quote.systemName)}</p>
                </div>

                {/* Lead Information Section */}
                {quote.leadFieldsToDisplay?.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-3">Prepared for</h3>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                            {quote.leadFieldsToDisplay.map((fieldKey) => {
                                let label = fieldKey;
                                let value = null;

                                // Handle standard fields
                                if (fieldKey === "contactNumber") {
                                    label = "Contact";
                                    value = lead?.contactNumber;
                                } else if (fieldKey === "address") {
                                    label = "Address";
                                    value = lead?.address;
                                } else if (fieldKey === "status") {
                                    label = "Lead Status";
                                    value = lead?.status;
                                } else {
                                    // Handle custom fields
                                    const fieldConfig = leadFieldConfig.find(f => f.key === fieldKey);
                                    if (fieldConfig) {
                                        label = fieldConfig.label;
                                        const customVal = lead?.customFields?.get?.(fieldKey) || lead?.customFields?.[fieldKey];
                                        value = customVal;
                                    }
                                }

                                return value ? (
                                    <div key={fieldKey} className="flex justify-between items-start text-xs">
                                        <span className="text-slate-600 font-medium">{label}</span>
                                        <span className="text-slate-800 font-semibold text-right max-w-xs">{value}</span>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    </div>
                )}

                {pages.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-3">Modules & features</h3>
                        <div className="space-y-3">
                            {pages.map((page, idx) => (
                                <div key={idx} className="border rounded-lg p-3">
                                    <div className="flex flex-wrap justify-between gap-2 font-semibold text-slate-800">
                                        <span>{String.fromCharCode(97 + idx)}. {ph(page.name)}</span>
                                        <span className="text-blue-700 text-xs">
                                            [Cost: ₹ {(page.cost || 0).toLocaleString("en-IN")} /-]
                                        </span>
                                    </div>
                                    {page.descriptions?.filter(Boolean).length > 0 && (
                                        <ul className="mt-2 list-disc list-inside text-xs text-slate-600 space-y-0.5">
                                            {page.descriptions.filter(Boolean).map((d, i) => <li key={i}>{ph(d)}</li>)}
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
                                <div key={i} className="text-xs bg-slate-50 border-l-2 border-blue-400 pl-3 py-1.5">{ph(t.label)}{t.value ? ` — ${ph(t.value)}` : ""}</div>
                            ))}
                        </div>
                    </div>
                )}

                {reqs.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-2">
                            Other Requirements for → {ph(quote.systemName)}
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
                                        <td className="p-2">{ph(r.requirement)}</td>
                                        <td className="p-2 text-slate-500">{ph(r.term || "—")}</td>
                                        <td className="p-2 text-right font-medium">{formatReqPrice(r)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {(pages.length > 0 || grandTotal > 0) && (
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
                                        <td className="p-2 font-medium">{ph(p.name)}</td>
                                        <td className="p-2">One Time</td>
                                        <td className="p-2 text-right">₹ {(p.cost || 0).toLocaleString("en-IN")} /-</td>
                                    </tr>
                                ))}
                                {pages.length > 0 && (
                                    <tr className="bg-slate-100 font-semibold border-t">
                                        <td colSpan={2} className="p-2">Sub Total</td>
                                        <td className="p-2 text-right">₹ {totalPages.toLocaleString("en-IN")} /-</td>
                                    </tr>
                                )}
                                {totalReqs > 0 && (
                                    <tr className="bg-slate-100 font-semibold">
                                        <td colSpan={2} className="p-2">Other requirements</td>
                                        <td className="p-2 text-right">₹ {totalReqs.toLocaleString("en-IN")} /-</td>
                                    </tr>
                                )}
                                <tr className="bg-amber-50 text-amber-900 text-[11px]">
                                    <td colSpan={2} className="p-2">{profile?.gstNote || "18% GST (Tax) — Excluded"}</td>
                                    <td className="p-2 text-right">—</td>
                                </tr>
                                <tr className="bg-blue-800 text-white font-bold">
                                    <td colSpan={2} className="p-2">Offered Price / Net Amount</td>
                                    <td className="p-2 text-right text-sm">₹ {grandTotal.toLocaleString("en-IN")} /-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {notesTrimmed && (
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-3">Notes & Terms</h3>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 whitespace-pre-wrap">
                            {notesTrimmed}
                        </div>
                    </div>
                )}

                <div>
                    <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-3">Payment method & terms</h3>
                    {payment ? (
                        <div className="space-y-2">
                            <div>
                                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Payment terms</p>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 whitespace-pre-wrap">{payment.paymentTerms}</div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Bank & payment details</p>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 whitespace-pre-wrap">{payment.paymentBankDetails}</div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Development timeline</p>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 whitespace-pre-wrap">{payment.paymentTimeline}</div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Additional notes</p>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 whitespace-pre-wrap">{payment.paymentOtherNotes}</div>
                            </div>
                            {payment.paymentQrUrl && (
                                <div className="text-center py-2">
                                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-2">Scan to pay (UPI / QR)</p>
                                    <img src={payment.paymentQrUrl} alt="Payment QR" className="h-28 w-28 object-contain mx-auto border border-gray-200 rounded-lg p-1 bg-white" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">
                            Select a branding profile with payment details, or set a company default profile.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
