import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "react-toastify";
import { getTemplates, deleteTemplate, getLeadFields } from "../services/proposalService";
import TemplateEditor from "../components/TemplateEditor";

export default function ProposalTemplateManager() {
    const [templates, setTemplates]   = useState([]);
    const [leadFields, setLeadFields] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);

    const load = () => {
        Promise.all([getTemplates(), getLeadFields()])
            .then(([tRes, fRes]) => {
                setTemplates(tRes.templates || []);
                setLeadFields(fRes.fields || []);
            })
            .catch(() => toast.error("Failed to load templates"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this template?")) return;
        try {
            await deleteTemplate(id);
            setTemplates(prev => prev.filter(t => t._id !== id));
            toast.success("Template deleted");
        } catch { toast.error("Failed to delete"); }
    };

    const openEditor = (tpl = null) => { setEditTarget(tpl); setEditorOpen(true); };

    const handleSaved = (tpl) => {
        setTemplates(prev => {
            const idx = prev.findIndex(t => t._id === tpl._id);
            return idx >= 0 ? prev.map((t, i) => i === idx ? tpl : t) : [tpl, ...prev];
        });
        setEditorOpen(false);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Proposal Templates</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Upload master PDFs and place editable fields</p>
                </div>
                <button onClick={() => openEditor()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                    <Plus size={15} /> New Template
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <FileText size={48} className="text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium">No templates yet</p>
                    <p className="text-gray-400 text-sm mt-1 mb-4">Upload a PDF and place fields to create your first template</p>
                    <button onClick={() => openEditor()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                        <Plus size={14} /> Create Template
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(t => (
                        <div key={t._id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {t.pageCount} page{t.pageCount !== 1 ? "s" : ""} · {(t.fields || []).length} field{(t.fields || []).length !== 1 ? "s" : ""}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(t.createdAt).toLocaleDateString("en-IN")}
                                    </p>
                                </div>
                                <FileText size={20} className="text-blue-200 shrink-0 mt-0.5" />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => openEditor(t)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg">
                                    <Pencil size={12} /> Edit
                                </button>
                                <button onClick={() => handleDelete(t._id)}
                                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editorOpen && (
                <TemplateEditor
                    template={editTarget}
                    leadFields={leadFields}
                    onSaved={handleSaved}
                    onClose={() => setEditorOpen(false)}
                />
            )}
        </div>
    );
}
