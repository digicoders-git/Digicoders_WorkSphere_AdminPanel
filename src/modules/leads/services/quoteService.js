import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";
import { renderHtmlToA4Pdf, printQuoteHtml } from "./quotePdfUtils";

const Q = ENDPOINTS.QUOTE;

export const createQuote = (data) => 
    api.post(Q.CREATE, data).then(r => r.data);

export const getQuotesByLead = (leadId, companyId) =>
    api.get(Q.GET_BY_LEAD(leadId), { params: { companyId } }).then(r => r.data.quotes ?? r.data);

export const getQuoteById = (quoteId) =>
    api.get(Q.GET_BY_ID(quoteId)).then(r => r.data.quote ?? r.data);

export const updateQuote = (quoteId, data) =>
    api.patch(Q.UPDATE(quoteId), data).then(r => r.data);

export const deleteQuote = (quoteId) =>
    api.delete(Q.DELETE(quoteId)).then(r => r.data);

export const getQuoteSendDefaults = (quoteId) =>
    api.get(Q.SEND_DEFAULTS(quoteId)).then((r) => r.data);

export const sendQuoteToCustomer = (quoteId, email, { resend = false, subject, body } = {}) =>
    api
        .post(Q.SEND(quoteId), {
            ...(email ? { email } : {}),
            resend,
            ...(subject !== undefined ? { subject } : {}),
            ...(body !== undefined ? { body } : {}),
        })
        .then((r) => r.data);

export const addQuoteFollowUp = (quoteId, data) =>
    api.post(Q.FOLLOW_UP(quoteId), data).then((r) => r.data);

export const updateQuoteFollowUp = (quoteId, followUpId, data) =>
    api.patch(Q.FOLLOW_UP_UPDATE(quoteId, followUpId), data).then((r) => r.data);

export const getQuoteHTML = (quoteId) =>
    api.get(Q.GET_HTML(quoteId), { responseType: "text" }).then(r => r.data);

/** Download A4 PDF file from server quote HTML */
export const generatePDFFromHTML = (htmlContent, filename = "quote.pdf") =>
    renderHtmlToA4Pdf(htmlContent, filename);

/** Open print dialog for sharpest PDF (Save as PDF in printer dialog) */
export const printPDFFromHTML = (htmlContent) => printQuoteHtml(htmlContent);

// Alternative: Generate PDF using jsPDF directly (simpler method)
export const downloadQuoteAsText = (quote) => {
    const lead = quote.leadId;
    const currentDate = new Date().toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
    });

    let text = `${quote.title}\n`;
    text += `Project Quote - ${quote.proposedSystem}\n\n`;
    text += `========================================\n\n`;
    
    text += `FOR ORGANIZATION: ${lead.orgName || "N/A"}\n`;
    text += `Contact Person: ${lead.contactPerson || "N/A"}\n`;
    text += `Email: ${lead.email || "N/A"}\n`;
    text += `Phone: ${lead.contactNumber || "N/A"}\n\n`;

    text += `SYSTEM NAME: ${quote.systemName}\n`;
    text += `QUOTE DATE: ${currentDate}\n`;
    text += `STATUS: ${quote.status}\n\n`;

    text += `========================================\n`;
    text += `PROPOSED SYSTEM - PAGES & FEATURES\n`;
    text += `========================================\n\n`;

    if (quote.pages && quote.pages.length > 0) {
        quote.pages.forEach((page, idx) => {
            text += `${idx + 1}. ${page.name}\n`;
            if (page.descriptions && page.descriptions.length > 0) {
                page.descriptions.forEach(desc => {
                    text += `   - ${desc}\n`;
                });
            }
            text += `   Cost: ₹${(page.cost || 0).toLocaleString("en-IN")}\n\n`;
        });
        text += `Subtotal (Pages): ₹${(quote.totalPagesCost || 0).toLocaleString("en-IN")}\n\n`;
    }

    if (quote.techStack && quote.techStack.length > 0) {
        text += `========================================\n`;
        text += `TECHNOLOGY STACK\n`;
        text += `========================================\n\n`;
        quote.techStack.forEach(tech => {
            text += `• ${tech.label}\n`;
        });
        text += `\n`;
    }

    if (quote.otherRequirements && quote.otherRequirements.length > 0) {
        text += `========================================\n`;
        text += `ADDITIONAL REQUIREMENTS\n`;
        text += `========================================\n\n`;
        quote.otherRequirements.forEach(req => {
            const clientSide =
                req.priceType === "client_side" ||
                (!(req.priceType === "amount") &&
                    (req.term || "").trim().toLowerCase() === "client side" &&
                    !(Number(req.price) > 0));
            text += `${req.requirement}\n`;
            if (req.term) text += `  Term: ${req.term}\n`;
            text += clientSide
                ? `  Price: Client Side\n\n`
                : `  Price: ₹${(req.price || 0).toLocaleString("en-IN")}\n\n`;
        });
        text += `Subtotal (Requirements): ₹${(quote.totalRequirementsCost || 0).toLocaleString("en-IN")}\n\n`;
    }

    text += `========================================\n`;
    text += `GRAND TOTAL: ₹${(quote.grandTotal || 0).toLocaleString("en-IN")}\n`;
    text += `========================================\n\n`;

    if (quote.notes) {
        text += `NOTES:\n${quote.notes}\n\n`;
    }

    text += `This quote is valid for 30 days from the date of issue.\n`;

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", `${quote.systemName}-quote.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};
