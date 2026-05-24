/** Profile payment fields for proposal preview (bank details from quote branding profile). */

const PAYMENT_DEFAULTS = {
    paymentTerms: `Payment Terms:
• 1st installment 40% in advance to start development.
• 2nd installment 30% at completion of 50% of working modules.
• Final 30% at delivery of all modules as per requirements.`,
    paymentBankDetails: `Bank / UPI:
DigiCoders Technologies Private Limited
Central Bank of India · A/c 3755419817 · IFSC CBIN0280145`,
    paymentTimeline:
        "Development timeline: Typically 20–25 working days for this scope (subject to client inputs and approvals).",
    paymentOtherNotes: "GST 18% excluded from offered development price unless specified.",
};

export const getQuoteProfile = (quote) => {
    const p = quote?.quoteProfileId;
    if (!p || typeof p !== "object") return null;
    return p;
};

/** Normalized payment fields with fallbacks when profile fields are empty */
export const getProfilePaymentFields = (profile) => {
    if (!profile) {
        return { ...PAYMENT_DEFAULTS, paymentQrUrl: null };
    }
    return {
        paymentTerms: (profile.paymentTerms || "").trim() || PAYMENT_DEFAULTS.paymentTerms,
        paymentBankDetails: (profile.paymentBankDetails || "").trim() || PAYMENT_DEFAULTS.paymentBankDetails,
        paymentTimeline: (profile.paymentTimeline || "").trim() || PAYMENT_DEFAULTS.paymentTimeline,
        paymentOtherNotes: (profile.paymentOtherNotes || "").trim() || PAYMENT_DEFAULTS.paymentOtherNotes,
        paymentQrUrl: profile.paymentQr?.url || null,
    };
};

export const hasProfilePaymentContent = (profile) => Boolean(getProfilePaymentFields(profile));

/** HTML fragment for page-editor iframe preview */
export const buildProfilePaymentHtml = (profile, esc) => {
    const fields = getProfilePaymentFields(profile);
    if (!fields) return "";
    const blocks = [];
    if (fields.paymentTerms) {
        blocks.push(`<div class="pay-block"><p class="pay-label">Payment terms</p><div class="notes">${esc(fields.paymentTerms)}</div></div>`);
    }
    if (fields.paymentBankDetails) {
        blocks.push(`<div class="pay-block"><p class="pay-label">Bank &amp; payment details</p><div class="notes">${esc(fields.paymentBankDetails)}</div></div>`);
    }
    if (fields.paymentTimeline) {
        blocks.push(`<div class="pay-block"><p class="pay-label">Development timeline</p><div class="notes">${esc(fields.paymentTimeline)}</div></div>`);
    }
    if (fields.paymentOtherNotes) {
        blocks.push(`<div class="pay-block"><p class="pay-label">Additional notes</p><div class="notes">${esc(fields.paymentOtherNotes)}</div></div>`);
    }
    if (fields.paymentQrUrl) {
        blocks.push(
            `<div class="pay-block payment-qr-wrap"><p class="pay-label">Scan to pay (UPI / QR)</p><img class="payment-qr" src="${esc(fields.paymentQrUrl)}" alt="Payment QR" /></div>`
        );
    }
    return blocks.join("");
};
