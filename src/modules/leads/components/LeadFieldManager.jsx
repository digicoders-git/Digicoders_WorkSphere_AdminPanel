import { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Settings2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { toast } from "react-toastify";
import { getFieldConfig, saveFieldConfig } from "../services/leadService";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const FIELD_TYPES = [
    { value: "text",     label: "Text" },
    { value: "number",   label: "Number" },
    { value: "date",     label: "Date" },
    { value: "dropdown", label: "Dropdown" },
    { value: "table",    label: "Table (multi-row)" },
];

const COL_TYPES = [
    { value: "text",   label: "Text" },
    { value: "number", label: "Number" },
    { value: "date",   label: "Date" },
];

const genKey = (label) =>
    label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 30) +
    "_" + Date.now().toString(36).slice(-4);

const genColKey = (label) =>
    label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20);

const emptyField = (order) => ({
    key: "", label: "", type: "text", required: false,
    options: [], columns: [], placeholder: "", order, _open: true,
});

export default function LeadFieldManager({ isOpen, onClose, onSave }) {
    const [fields, setFields]   = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        getFieldConfig()
            .then(r => setFields((r.fields || []).map(f => ({
                ...f,
                columns: f.columns || [],
                placeholder: f.placeholder || "",
                _open: false,
            }))))
            .catch(() => toast.error("Failed to load field config"))
            .finally(() => setLoading(false));
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const fn = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [isOpen, onClose]);

    const addField = () => setFields(prev => [...prev, emptyField(prev.length)]);
    const update   = (i, patch) => setFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));
    const remove   = (i) => setFields(prev => prev.filter((_, idx) => idx !== i));

    // Dropdown options
    const addOption    = (i) => update(i, { options: [...(fields[i].options || []), { label: "", value: "" }] });
    const updateOption = (fi, oi, patch) => update(fi, { options: fields[fi].options.map((o, idx) => idx === oi ? { ...o, ...patch } : o) });
    const removeOption = (fi, oi) => update(fi, { options: fields[fi].options.filter((_, idx) => idx !== oi) });

    // Table columns
    const addColumn    = (i) => update(i, { columns: [...(fields[i].columns || []), { key: "", label: "", type: "text" }] });
    const updateColumn = (fi, ci, patch) => {
        const cols = fields[fi].columns.map((c, idx) => {
            if (idx !== ci) return c;
            const merged = { ...c, ...patch };
            if (patch.label !== undefined && !c._keyManual) merged.key = genColKey(patch.label);
            return merged;
        });
        update(fi, { columns: cols });
    };
    const removeColumn = (fi, ci) => update(fi, { columns: fields[fi].columns.filter((_, idx) => idx !== ci) });

    const handleSave = async () => {
        for (const f of fields) {
            if (!f.label.trim()) return toast.error("All fields need a label");
            if (!f.key.trim())   return toast.error(`Set a key for "${f.label}"`);
            if (f.type === "dropdown" && !f.options?.length)
                return toast.error(`Dropdown "${f.label}" needs at least one option`);
            if (f.type === "table" && !f.columns?.length)
                return toast.error(`Table "${f.label}" needs at least one column`);
            if (f.type === "table") {
                for (const c of f.columns) {
                    if (!c.label?.trim()) return toast.error(`All columns in "${f.label}" need a label`);
                    if (!c.key?.trim())   return toast.error(`All columns in "${f.label}" need a key`);
                }
            }
        }
        const keys = fields.map(f => f.key);
        if (new Set(keys).size !== keys.length) return toast.error("Field keys must be unique");

        try {
            setSaving(true);
            const clean = fields.map(({ _open, _keyManual, ...rest }, i) => ({ ...rest, order: i }));
            await saveFieldConfig(clean);
            toast.success("Fields saved");
            onSave?.();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save");
        } finally { setSaving(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full sm:max-w-xl max-h-[92vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <Settings2 size={16} className="text-blue-600" />
                        <h2 className="text-sm font-semibold text-gray-900">Manage Lead Form Fields</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={15} /></button>
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-2">

                    {/* Default fields */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1.5">Default fields (always shown)</p>
                        <div className="flex flex-wrap gap-1.5">
                            {["Contact Number *", "Organisation *", "Address", "Contact Person", "Email", "Status", "Assigned To"].map(f => (
                                <span key={f} className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-500">{f}</span>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {fields.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-4">No custom fields yet.</p>
                            )}

                            {fields.map((field, i) => (
                                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">

                                    {/* Row header */}
                                    <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 cursor-pointer"
                                        onClick={() => update(i, { _open: !field._open })}>
                                        <GripVertical size={13} className="text-gray-300 shrink-0" />
                                        <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                                            {field.label || <span className="text-gray-400 italic text-xs">Untitled</span>}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                            field.type === "table"
                                                ? "bg-purple-100 text-purple-700"
                                                : field.type === "dropdown"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-gray-100 text-gray-500"
                                        }`}>{field.type}</span>
                                        {field.required && <span className="text-[10px] text-red-400">*req</span>}
                                        <button onClick={e => { e.stopPropagation(); remove(i); }}
                                            className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={12} /></button>
                                        {field._open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                                    </div>

                                    {field._open && (
                                        <div className="px-4 py-3 space-y-3 border-t border-gray-100">

                                            {/* Label + Key */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Label *</label>
                                                    <input value={field.label}
                                                        onChange={e => {
                                                            const label = e.target.value;
                                                            update(i, { label, key: field._keyManual ? field.key : genKey(label) });
                                                        }}
                                                        placeholder="e.g. Module" className={inp} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Key</label>
                                                    <input value={field.key}
                                                        onChange={e => update(i, { key: e.target.value, _keyManual: true })}
                                                        placeholder="module" className={inp} />
                                                </div>
                                            </div>

                                            {/* Type + Required */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Type</label>
                                                    <select value={field.type}
                                                        onChange={e => update(i, { type: e.target.value })}
                                                        className={inp}>
                                                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex items-end pb-1">
                                                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                                        <input type="checkbox" checked={field.required}
                                                            onChange={e => update(i, { required: e.target.checked })} className="rounded" />
                                                        Required
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Placeholder (text / number / date) */}
                                            {["text", "number", "date"].includes(field.type) && (
                                                <div>
                                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Placeholder</label>
                                                    <input value={field.placeholder || ""}
                                                        onChange={e => update(i, { placeholder: e.target.value })}
                                                        placeholder="e.g. Enter budget amount…" className={inp} />
                                                </div>
                                            )}

                                            {/* Dropdown options */}
                                            {field.type === "dropdown" && (
                                                <div>
                                                    <p className="text-[10px] font-medium text-gray-500 mb-1.5">Options</p>
                                                    <div className="space-y-1.5">
                                                        {(field.options || []).map((opt, oi) => (
                                                            <div key={oi} className="flex gap-1.5 items-center">
                                                                <input value={opt.label}
                                                                    onChange={e => updateOption(i, oi, {
                                                                        label: e.target.value,
                                                                        value: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                                                                    })}
                                                                    placeholder="Option label" className={`${inp} flex-1`} />
                                                                <button onClick={() => removeOption(i, oi)}
                                                                    className="p-1.5 text-red-400 hover:text-red-600 shrink-0"><Trash2 size={12} /></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => addOption(i)}
                                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                                                            <Plus size={11} /> Add option
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Table columns */}
                                            {field.type === "table" && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                                            Columns <span className="text-gray-400 font-normal">(define the sub-fields per row)</span>
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(field.columns || []).map((col, ci) => (
                                                            <div key={ci} className="flex gap-2 items-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                                <GripVertical size={12} className="text-gray-300 shrink-0" />
                                                                <input value={col.label}
                                                                    onChange={e => updateColumn(i, ci, { label: e.target.value })}
                                                                    placeholder="Column name" className={`${inp} flex-1`} />
                                                                <select value={col.type}
                                                                    onChange={e => updateColumn(i, ci, { type: e.target.value })}
                                                                    className="px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shrink-0">
                                                                    {COL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                                </select>
                                                                <button onClick={() => removeColumn(i, ci)}
                                                                    className="p-1 text-red-400 hover:text-red-600 shrink-0"><Trash2 size={12} /></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => addColumn(i)}
                                                            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium">
                                                            <Plus size={11} /> Add column
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-2">
                                                        At lead entry time, users can add unlimited rows — each row fills in these columns.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button onClick={addField}
                                className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-blue-200 hover:border-blue-400 text-blue-500 hover:text-blue-700 rounded-xl text-sm font-medium transition">
                                <Plus size={14} /> Add Custom Field
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t flex justify-end gap-2 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        <Save size={13} /> {saving ? "Saving…" : "Save Fields"}
                    </button>
                </div>
            </div>
        </div>
    );
}
