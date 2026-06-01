import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const P = ENDPOINTS.PROPOSAL;

export const getLeadFields       = ()           => api.get(P.LEAD_FIELDS).then(r => r.data);
export const getTemplates        = ()           => api.get(P.TEMPLATES).then(r => r.data);
export const getTemplateById     = (id)         => api.get(P.TEMPLATE_BY_ID(id)).then(r => r.data);
export const createTemplate      = (data)       => api.post(P.TEMPLATES, data).then(r => r.data);
export const updateTemplate      = (id, data)   => api.patch(P.TEMPLATE_BY_ID(id), data).then(r => r.data);
export const deleteTemplate      = (id)         => api.delete(P.TEMPLATE_BY_ID(id)).then(r => r.data);

export const generateProposal    = (data)       => api.post(P.GENERATE, data).then(r => r.data);
export const previewProposal     = (data)       => api.post(P.PREVIEW, data).then(r => r.data);

export const getProposalsByLead  = (leadId)     => api.get(P.BY_LEAD(leadId)).then(r => r.data);
export const getProposalById     = (id)         => api.get(P.BY_ID(id)).then(r => r.data);
export const deleteProposal      = (id)         => api.delete(P.DELETE(id)).then(r => r.data);

export const downloadProposal = (pdfData, filename = "proposal.pdf") => {
    const bytes  = Uint8Array.from(atob(pdfData), c => c.charCodeAt(0));
    const blob   = new Blob([bytes], { type: "application/pdf" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
