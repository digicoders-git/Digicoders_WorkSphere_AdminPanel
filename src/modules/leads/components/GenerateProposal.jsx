import { useState, useEffect } from "react";
import { Download, Trash2, FileText, Plus, Eye, X } from "lucide-react";
import { toast } from "react-toastify";
import {
    getTemplates, getLeadFields, previewProposal, generateProposal,
    getProposalsByLead, deleteProposal, downloadProposal,
} from "../services/proposalService";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function PdfViewer({ pdfBase64, onClose }) {
    const url = `data:application/pdf;base64,${pdfBase64}`;
    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/80">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
                <span className="text-sm font-medium text-white">Proposal Preview</span>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"><X size={16} /></button>
            </div>
            <iframe src={url} className="flex-1 w-full border-0" title="Proposal Preview" />
        </div>
    );
}

export default function GenerateProposal({ lead, companyId, onOpenTemplateEditor }) {
    const [templates, setTemplates]     = useState([]);
    const [leadFields, setLeadFields]   = useState([]);
    const [proposals, setProposals]     = useState([]);
    const [selectedTpl, setSelectedTpl] = useState("");
    const [fieldValues, setFieldValues] = useState({});
    const [previewPdf, setPreviewPdf]   = useState(null);
    const [viewPdf, setViewPdf]         = useState(null);
    const [generating, setGenerating]   = useState(false);
    const [previewing, setPreviewing]   = useState(false);
    const [loading, setLoading]         = useState(true);
    const [tab, setTab]                 = useState("generate"); // generate | saved

    useEffect(() => {
        Promise.all([getTemplates(), getLeadFields(), getProposalsByLead(lead._id)])
            .then(([tplRes, fldRes, propRes]) => {
                setTemplates(tplRes.templates || []);
                setLeadFields(fldRes.fields || []);
                setProposals(propRes.proposals || []);
            })
            .catch(() => toast.error("Failed to load data"))
            .finally(() => setLoading(false));
    }, [lead._id]);

    // When template changes, auto-fill lead values
    useEffect(() => {
        if (!selectedTpl) return;
        const tpl = templates.find(t => t._id === selectedTpl);
        if (!tpl) return;
        const auto = {};
        leadFields.forEach(f => {
            const val = f.key === "orgName"       ? lead.orgName
                      : f.key === "contactPerson" ? lead.contactPerson
                      : f.key === "email"         ? lead.email
                      : f.key === "contactNumber" ? lead.contactNumber
                      : f.key === "address"       ? lead.address
                      : f.key === "status"        ? lead.status
                      : (lead.customFields?.[f.key]) ?? "";
            auto[f.key] = val || "";
        });
        setFieldValues(auto);
        setPreviewPdf(null);
    }, [selectedTpl, templates, leadFields, lead]);

    const tplFields = (() => {
        const tpl = templates.find(t => t._id === selectedTpl);
        if (!tpl) return [];
        const keys = [...new Set(tpl.fields.map(f => f.key))];
        return keys.map(k => leadFields.find(f => f.key === k) || { key: k, label: k });
    })();

    const handlePreview = async () => {
        if (!selectedTpl) return toast.error("Select a template first");
        try {
            setPreviewing(true);
            const res = await previewProposal({ templateId: selectedTpl, leadId: lead._id, fieldValues });
            setPreviewPdf(res.pdfData);
        } catch (e) {
            toast.error(e.response?.data?.message || "Preview failed");
        } finally { setPreviewing(false); }
    };

    const handleGenerate = async () => {
        if (!selectedTpl) return toast.error("Select a template first");
        try {
            setGenerating(true);
            const res = await generateProposal({
                templateId: selectedTpl, leadId: lead._id,
                name: `${lead.orgName} — ${templates.find(t => t._id === selectedTpl)?.name}`,
                fieldValues,
            });
            toast.success("Proposal saved");
            setProposals(prev => [res.proposal, ...prev]);
            downloadProposal(res.proposal.pdfData, `${lead.orgName}-proposal.pdf`);
            setTab("saved");
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to generate proposal");
        } finally { setGenerating(false); }
    };

    const handleDelete = async (id) => {
        try {
            await deleteProposal(id);
            setProposals(prev => prev.filter(p => p._id !== id));
            toast.success("Deleted");
        } catch { toast.error("Failed to delete"); }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {[{ key: "generate", label: "🚀 Generate" }, { key: "saved", label: `📁 Saved (${proposals.length})` }].map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setTab(key)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === key ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === "generate" ? (
                <div className="space-y-4">
                    {templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                            <FileText size={36} className="text-gray-200 mb-3" />
                            <p className="text-sm font-medium text-gray-500">No templates yet</p>
                            <p className="text-xs text-gray-400 mt-1 mb-4">Create a master PDF template first</p>
                            <button onClick={onOpenTemplateEditor}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <Plus size={14} /> Create Template
                            </button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Select Template</label>
                                <select value={selectedTpl} onChange={e => setSelectedTpl(e.target.value)} className={inp}>
                                    <option value="">— Choose a template —</option>
                                    {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                </select>
                            </div>

                            {selectedTpl && tplFields.length > 0 && (
                                <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Edit Field Values</p>
                                    {tplFields.map(f => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                                            <input value={fieldValues[f.key] || ""}
                                                onChange={e => setFieldValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                className={inp} placeholder={`Enter ${f.label}…`} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedTpl && (
                                <div className="flex gap-2">
                                    <button onClick={handlePreview} disabled={previewing}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                                        <Eye size={14} /> {previewing ? "Loading…" : "Preview"}
                                    </button>
                                    <button onClick={handleGenerate} disabled={generating}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                        <Download size={14} /> {generating ? "Generating…" : "Save & Download"}
                                    </button>
                                </div>
                            )}

                            {previewPdf && (
                                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <span className="text-xs text-emerald-700 font-medium">Preview ready</span>
                                    <button onClick={() => setViewPdf(previewPdf)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                                        <Eye size={12} /> View PDF
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {proposals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText size={36} className="text-gray-200 mb-3" />
                            <p className="text-sm text-gray-400">No proposals generated yet</p>
                        </div>
                    ) : proposals.map(p => (
                        <div key={p._id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {p.templateId?.name} · {new Date(p.createdAt).toLocaleDateString("en-IN")}
                                </p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                <button onClick={() => setViewPdf(p.pdfData)}
                                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600" title="View">
                                    <Eye size={14} />
                                </button>
                                <button onClick={() => downloadProposal(p.pdfData, `${p.name}.pdf`)}
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600" title="Download">
                                    <Download size={14} />
                                </button>
                                <button onClick={() => handleDelete(p._id)}
                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500" title="Delete">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewPdf && <PdfViewer pdfBase64={viewPdf} onClose={() => setViewPdf(null)} />}
        </div>
    );
}
