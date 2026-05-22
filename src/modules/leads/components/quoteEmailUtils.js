export const QUOTE_EMAIL_PLACEHOLDERS = [
    { key: "systemName", label: "System name", group: "quote" },
    { key: "quoteTitle", label: "Quote title", group: "quote" },
    { key: "proposedSystem", label: "Proposed system", group: "quote" },
    { key: "grandTotal", label: "Grand total", group: "quote" },
    { key: "quoteDate", label: "Quote date", group: "quote" },
    { key: "validityDays", label: "Validity (days)", group: "quote" },
    { key: "companyName", label: "Your company", group: "quote" },
    { key: "senderName", label: "Sender name", group: "quote" },
    { key: "senderEmail", label: "Sender email", group: "quote" },
];

export const LEAD_STANDARD_PLACEHOLDERS = [
    { key: "contactPerson", label: "Contact person", group: "lead" },
    { key: "orgName", label: "Organization", group: "lead" },
    { key: "email", label: "Lead email", group: "lead" },
    { key: "contactNumber", label: "Contact number", group: "lead" },
    { key: "address", label: "Lead address", group: "lead" },
    { key: "leadStatus", label: "Lead status", group: "lead" },
];

export const PLACEHOLDER_GROUP_LABELS = {
    quote: "Quote",
    lead: "Lead fields",
    custom: "Custom lead fields",
};

export const customFieldsToObject = (customFields) => {
    if (!customFields) return {};
    if (typeof customFields.get === "function") {
        return Object.fromEntries(customFields.entries());
    }
    if (customFields instanceof Map) {
        return Object.fromEntries(customFields);
    }
    if (typeof customFields === "object") return { ...customFields };
    return {};
};

export const placeholdersFromFieldConfig = (fieldConfig = []) =>
    [...(fieldConfig || [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((f) => ({
            key: f.key,
            label: f.label || f.key,
            group: "custom",
            isCustomField: true,
        }));

export const buildAllEmailPlaceholders = (fieldConfig = []) => [
    ...QUOTE_EMAIL_PLACEHOLDERS,
    ...LEAD_STANDARD_PLACEHOLDERS,
    ...placeholdersFromFieldConfig(fieldConfig),
];

export const DEFAULT_QUOTE_EMAIL_SUBJECT = "Project Quote — {{systemName}} for {{orgName}}";

export const DEFAULT_QUOTE_EMAIL_BODY = `Dear {{contactPerson}},

Please find attached our project quote for {{systemName}} ({{proposedSystem}}) prepared for {{orgName}}.

Offered price: {{grandTotal}}
Quote date: {{quoteDate}}
Valid for: {{validityDays}} days

If you have any questions or would like to discuss the proposal, please reply to this email.

Best regards,
{{senderName}}
{{companyName}}`;

export const applyQuotePlaceholders = (template, context) => {
    if (!template) return "";
    return String(template).replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, key) => {
        const val = context[key];
        return val !== undefined && val !== null ? String(val) : "";
    });
};

export const buildClientPlaceholderContext = (quote, lead, fieldConfig = []) => {
    const proposed =
        quote.proposedSystemCategory === "Other"
            ? quote.proposedSystemOther || "Other"
            : quote.proposedSystemCategory || quote.proposedSystem || "Website";

    const leadData = lead || quote.leadId || {};
    const custom = customFieldsToObject(leadData.customFields);

    const ctx = {
        systemName: quote.systemName || "Project",
        quoteTitle: quote.title || "Project Quote",
        proposedSystem: proposed,
        grandTotal: `₹ ${(Number(quote.grandTotal) || 0).toLocaleString("en-IN")} /-`,
        quoteDate: new Date(quote.createdAt || Date.now()).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
        }),
        validityDays: "30",
        companyName: "DigiCoders Technologies (P) Ltd.",
        senderName: "Team DigiCoders",
        senderEmail: "",
        contactPerson: leadData.contactPerson || "Sir/Ma'am",
        orgName: leadData.orgName || "your organization",
        email: leadData.email || "",
        contactNumber: leadData.contactNumber || "",
        address: leadData.address || "",
        leadStatus: leadData.status || "",
    };

    for (const f of fieldConfig) {
        if (f?.key) ctx[f.key] = custom[f.key] ?? "";
    }
    for (const [k, v] of Object.entries(custom)) {
        if (ctx[k] === undefined) ctx[k] = v ?? "";
    }

    return ctx;
};

export const groupPlaceholders = (placeholders) => {
    const groups = { quote: [], lead: [], custom: [] };
    for (const p of placeholders) {
        const g = p.group === "custom" ? "custom" : p.group === "lead" ? "lead" : "quote";
        groups[g].push(p);
    }
    return groups;
};
