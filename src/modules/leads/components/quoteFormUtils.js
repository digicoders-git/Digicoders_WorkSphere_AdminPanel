export const PROPOSED_SYSTEM_OPTIONS = [
    "Website",
    "Application",
    "Mobile App",
    "Desktop Application",
    "Other",
];

export const OTHER_REQ_PRICE_TYPES = [
    { value: "amount", label: "Amount (₹)" },
    { value: "client_side", label: "Client Side" },
];

export const isClientSidePrice = (req) => {
    if (!req) return false;
    if (req.priceType === "client_side") return true;
    if (req.priceType === "amount") return false;
    const term = (req.term || "").trim().toLowerCase();
    return term === "client side" && !(Number(req.price) > 0);
};

export const formatReqPrice = (req) => {
    if (isClientSidePrice(req)) return "Client Side";
    if (Number(req.price) > 0) return `₹ ${Number(req.price).toLocaleString("en-IN")} /-`;
    return "—";
};

export const resolveReqPriceType = (req) => (isClientSidePrice(req) ? "client_side" : "amount");

export const emptyQuoteForm = () => ({
    title: "Project Quote",
    quoteProfileId: "",
    proposedSystemCategory: "Website",
    proposedSystemOther: "",
    systemName: "",
    pages: [{ name: "", cost: 0, descriptions: [""] }],
    techStack: [{ label: "" }],
    otherRequirements: [{ requirement: "", term: "", price: 0, priceType: "amount" }],
    notes: "",
    leadFieldsToDisplay: [],
});

export const quoteToForm = (quote) => ({
    title: quote.title || "Project Quote",
    quoteProfileId: quote.quoteProfileId?._id || quote.quoteProfileId || "",
    proposedSystemCategory: quote.proposedSystemCategory || quote.proposedSystem || "Website",
    proposedSystemOther: quote.proposedSystemOther || "",
    systemName: quote.systemName || "",
    pages: quote.pages?.length
        ? quote.pages.map((p) => ({
              name: p.name || "",
              cost: p.cost || 0,
              descriptions: p.descriptions?.length ? [...p.descriptions] : [""],
          }))
        : [{ name: "", cost: 0, descriptions: [""] }],
    techStack: quote.techStack?.length
        ? quote.techStack.map((t) => ({ label: t.label || "", value: t.value || "" }))
        : [{ label: "" }],
    otherRequirements: quote.otherRequirements?.length
        ? quote.otherRequirements.map((r) => ({
              requirement: r.requirement || "",
              term: r.term || "",
              price: r.price || 0,
              priceType: r.priceType || resolveReqPriceType(r),
          }))
        : [{ requirement: "", term: "", price: 0, priceType: "amount" }],
    notes: quote.notes || "",
    leadFieldsToDisplay: quote.leadFieldsToDisplay || [],
});

export const calcQuoteTotals = (form) => {
    const totalPages = form.pages.reduce((s, p) => s + (Number(p.cost) || 0), 0);
    const totalReqs = form.otherRequirements.reduce(
        (s, r) => (isClientSidePrice(r) ? s : s + (Number(r.price) || 0)),
        0
    );
    return { totalPages, totalReqs, grandTotal: totalPages + totalReqs };
};

export const formToPayload = (form, leadId, companyId) => ({
    leadId,
    companyId,
    title: form.title,
    quoteProfileId: form.quoteProfileId || undefined,
    proposedSystemCategory: form.proposedSystemCategory,
    proposedSystemOther: form.proposedSystemOther,
    systemName: form.systemName,
    pages: form.pages,
    techStack: form.techStack,
    otherRequirements: form.otherRequirements,
    notes: form.notes,
    leadFieldsToDisplay: form.leadFieldsToDisplay || [],
});
