import { useState, useEffect, useRef, useCallback } from "react";
import { X, Trash2, Save, ChevronLeft, ChevronRight, GripVertical, ZoomIn, ZoomOut, RotateCcw, Eye, Play } from "lucide-react";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";
import { createTemplate, updateTemplate, previewProposal } from "../services/proposalService";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

const uid = () => Math.random().toString(36).slice(2, 9);
const ZOOM_STEPS    = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const THUMB_SCALE   = 0.18;
const RENDER_SCALE  = 1.5;  // scale used when rendering PDF to canvas — must match renderPage
const FONT_OPTIONS  = ["Helvetica", "Times-Roman", "Courier", "Arial", "Georgia", "Verdana"];

// ── Draggable field pin ───────────────────────────────────────────────────────
// ── Single rendered page for preview ────────────────────────────────────────
function PreviewPage({ doc, pageIdx }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!doc || !ref.current) return;
        let cancelled = false;
        doc.getPage(pageIdx + 1).then(page => {
            if (cancelled) return;
            const vp = page.getViewport({ scale: 1.4 });
            const c = ref.current;
            c.width = vp.width;
            c.height = vp.height;
            page.render({ canvasContext: c.getContext("2d"), viewport: vp });
        });
        return () => { cancelled = true; };
    }, [doc, pageIdx]);
    return (
        <div className="flex flex-col items-center gap-1">
            <canvas ref={ref} className="shadow-2xl rounded-lg block" />
            <span className="text-[10px] text-gray-400 font-medium">Page {pageIdx + 1}</span>
        </div>
    );
}

// ── Formula Builder ───────────────────────────────────────────────────────────────
function FormulaBuilder({ fields, formula, onChange }) {
    const [numInput, setNumInput] = useState("");

    const tokens = (() => {
        if (!(formula || "").length) return [];
        const parts = [];
        const chunks = formula.split(/(\{\{[^}]+\}\}|[+\-*/%|])/);
        chunks.forEach(chunk => {
            if (!chunk) return;
            if (/^[+\-*/%]$/.test(chunk)) {
                const lbl = { "+":"+", "-":"-", "*":"×", "/":"÷", "%":"mod" };
                parts.push({ type:"op", value:chunk, display: lbl[chunk]||chunk }); return;
            }
            if (chunk === "|") { parts.push({ type:"concat", value:"|", display:"JOIN" }); return; }
            const m = chunk.match(/^\{\{([^}]+)\}\}$/);
            if (m) {
                const fd = fields.find(f => f.key === m[1].trim());
                parts.push({ type:"field", value:chunk, display: fd?.label || m[1].trim() }); return;
            }
            if (chunk.trim()) parts.push({ type:"num", value:chunk.trim(), display:chunk.trim() });
        });
        return parts;
    })();

    const append = (str) => onChange((formula || "") + str);

    const removeLast = () => {
        if (!tokens.length) return;
        const last = tokens[tokens.length - 1];
        onChange((formula || "").slice(0, (formula || "").length - last.value.length));
    };

    const addNumber = () => {
        const n = numInput.trim();
        if (!n || isNaN(Number(n))) return;
        append(n); setNumInput("");
    };

    return (
        <div className="space-y-2.5">
            {/* Token display */}
            <div className="min-h-[36px] flex flex-wrap items-center gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                {tokens.length === 0
                    ? <span className="text-[10px] text-gray-400 italic">Empty — build formula below</span>
                    : tokens.map((t, i) => (
                        <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.type==="field"  ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            t.type==="concat" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                            t.type==="op"     ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                               "bg-gray-100 text-gray-700 border border-gray-200"
                        }`}>{t.display}</span>
                    ))
                }
            </div>

            {/* Field picker */}
            <select onChange={e => { if (e.target.value) { append(`{{${e.target.value}}}`); e.target.value=""; } }}
                className="w-full text-[11px] border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">+ Add field…</option>
                {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>

            {/* Number input */}
            <div className="flex gap-1.5">
                <input type="number" value={numInput}
                    onChange={e => setNumInput(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && addNumber()}
                    placeholder="Literal number e.g. 1.18, 100"
                    className="flex-1 text-[11px] border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={addNumber}
                    disabled={!numInput.trim() || isNaN(Number(numInput))}
                    className="px-3 py-1.5 text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg disabled:opacity-40">
                    Add
                </button>
            </div>

            {/* Operators */}
            <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[10px] text-gray-400 mr-1">Ops:</span>
                {[["+","+"],["-","-"],["*","×"],["/","÷"],["%","mod"]].map(([op,lbl]) => (
                    <button key={op} type="button" onClick={() => append(op)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-lg">
                        {lbl}
                    </button>
                ))}
                <button type="button" onClick={() => append("|")} title="Concatenate / join text"
                    className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-lg">
                    JOIN
                </button>
            </div>

            {/* Actions */}
            <div className="flex gap-1.5">
                <button type="button" onClick={removeLast} disabled={!tokens.length}
                    className="px-3 py-1.5 text-[11px] font-medium bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg disabled:opacity-40">
                    ← Undo last
                </button>
                <button type="button" onClick={() => onChange("")}
                    className="px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg">
                    Clear all
                </button>
            </div>

            {/* Examples */}
            <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-200 space-y-1">
                <p className="text-[10px] font-semibold text-amber-800">Examples</p>
                <p className="text-[10px] text-gray-600">Concat: <code className="font-mono bg-white px-1 rounded border border-amber-200">{'{{orgName}}|{{contactPerson}}'}</code></p>
                <p className="text-[10px] text-gray-600">GST: <code className="font-mono bg-white px-1 rounded border border-amber-200">{'{{amount}}*1.18'}</code></p>
                <p className="text-[10px] text-gray-600">Mod: <code className="font-mono bg-white px-1 rounded border border-amber-200">{'{{total}}%100'}</code> (remainder)</p>
                <p className="text-[10px] text-gray-600">Sum: <code className="font-mono bg-white px-1 rounded border border-amber-200">{'{{qty}}*{{rate}}+500'}</code></p>
            </div>
        </div>
    );
}

function FieldPin({ f, onMove, onRemove, isSelected, onSelect }) {
    const pinRef  = useRef(null);
    const drag    = useRef(false);
    const start   = useRef({});

    const onPointerDown = (e) => {
        e.stopPropagation();
        onSelect(f.id);
        drag.current  = true;
        start.current = { cx: e.clientX, cy: e.clientY, x: f.x, y: f.y };
        pinRef.current.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        if (!drag.current) return;
        const canvas = pinRef.current?.closest(".pdf-canvas-wrap")?.querySelector("canvas");
        if (!canvas) return;
        // Use getBoundingClientRect so zoom (CSS transform) is already factored in
        const rect = canvas.getBoundingClientRect();
        const dx = (e.clientX - start.current.cx) / rect.width  * 100;
        const dy = (e.clientY - start.current.cy) / rect.height * 100;
        const nx = Math.min(100, Math.max(0, start.current.x + dx));
        const ny = Math.min(100, Math.max(0, start.current.y + dy));
        onMove(f.id, nx, ny);
    };
    const onPointerUp = () => { drag.current = false; };

    return (
        <div
            ref={pinRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ position: "absolute", left: `${f.x}%`, top: `${f.y}%`, transform: "translateY(-50%)", touchAction: "none" }}
            className="group select-none"
        >
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded shadow-lg text-[10px] font-bold whitespace-nowrap cursor-grab active:cursor-grabbing transition-all ${
                isSelected
                    ? "bg-blue-600 text-white ring-2 ring-white"
                    : "bg-blue-500/90 text-white hover:bg-blue-600"
            }`}>
                <GripVertical size={9} className="opacity-50 shrink-0" />
                {f.label}
                <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onRemove(f.id); }}
                    className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-200 transition-opacity"
                ><X size={8} /></button>
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full border border-white shadow" />
        </div>
    );
}

// ── Page thumbnail (mini canvas) ──────────────────────────────────────────────
function PageThumb({ pdfDoc, pageIdx, isActive, hasFields, onClick }) {
    const ref = useRef(null);

    useEffect(() => {
        if (!pdfDoc || !ref.current) return;
        let cancelled = false;
        pdfDoc.getPage(pageIdx + 1).then(page => {
            if (cancelled) return;
            const vp = page.getViewport({ scale: THUMB_SCALE });
            const c  = ref.current;
            c.width  = vp.width;
            c.height = vp.height;
            page.render({ canvasContext: c.getContext("2d"), viewport: vp });
        });
        return () => { cancelled = true; };
    }, [pdfDoc, pageIdx]);

    return (
        <div
            onClick={onClick}
            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                isActive ? "border-blue-500 shadow-md" : "border-gray-200 hover:border-blue-300"
            }`}
        >
            <canvas ref={ref} className="block w-full" />
            {hasFields && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow" />
            )}
            <div className={`absolute bottom-0 inset-x-0 text-center text-[9px] font-semibold py-0.5 ${
                isActive ? "bg-blue-500 text-white" : "bg-black/40 text-white"
            }`}>
                {pageIdx + 1}
            </div>
        </div>
    );
}

// ── Inline preview pane (right column) ────────────────────────────────────────
function InlinePreviewPane({ templateId, templateData, onClose }) {
    const [leads, setLeads]         = useState([]);
    const [search, setSearch]       = useState("");
    const [selected, setSelected]   = useState(null);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [loading, setLoading]     = useState(false);

    useEffect(() => {
        api.get(ENDPOINTS.LEAD.GET_ALL).then(r => setLeads(r.data.leads || [])).catch(() => {});
    }, []);

    const filtered = leads.filter(l => {
        const q = search.toLowerCase();
        return (
            (l.contactPerson || "").toLowerCase().includes(q) ||
            (l.orgName || "").toLowerCase().includes(q) ||
            (l.email || "").toLowerCase().includes(q) ||
            (l.contactNumber || "").replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
            (l.contactNumber || "").toLowerCase().includes(q)
        );
    });

    const handlePreview = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            const res = await previewProposal({ templateId, templateData, leadId: selected._id });
            const b64 = res.pdfData || res.preview;
            const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
            const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
            setPreviewDoc(doc);
        } catch { toast.error("Preview failed"); }
        finally { setLoading(false); }
    };

    return (
        <div className="w-[420px] shrink-0 flex flex-col border-l border-gray-700 bg-gray-900 overflow-hidden">
            {/* header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center gap-2">
                    <Eye size={14} className="text-emerald-400" />
                    <span className="text-xs font-semibold text-gray-200">Preview with Lead</span>
                </div>
                <button onClick={onClose} className="p-1 rounded hover:bg-gray-700 text-gray-400">
                    <X size={14} />
                </button>
            </div>

            {/* lead search */}
            <div className="shrink-0 p-3 border-b border-gray-700 bg-gray-800 space-y-2">
                <div className="relative">
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search leads…"
                        className="w-full pl-8 pr-3 py-2 border border-gray-600 rounded-lg text-xs bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                    {filtered.slice(0, 30).map(l => (
                        <div key={l._id} onClick={() => setSelected(l)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                                selected?._id === l._id
                                    ? "bg-emerald-600 text-white"
                                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                            }`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                selected?._id === l._id ? "bg-white/20" : "bg-gray-600"
                            }`}>
                                {(l.orgName || l.contactPerson || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium truncate">{l.orgName || l.contactPerson}</p>
                                <p className="text-[10px] opacity-70 truncate">{l.contactPerson || l.email}</p>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <p className="text-center text-gray-500 text-xs py-3">No leads found</p>
                    )}
                </div>
                <button onClick={handlePreview} disabled={!selected || loading}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
                    {loading
                        ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                        : <><Play size={13} /> Generate Preview</>}
                </button>
            </div>

            {/* pages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-gray-800">
                {previewDoc ? (
                    Array.from({ length: previewDoc.numPages }, (_, i) => (
                        <PreviewPage key={i} doc={previewDoc} pageIdx={i} />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                        <Eye size={28} className="text-gray-600 mb-2" />
                        <p className="text-gray-500 text-xs">Select a lead and generate preview</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TemplateEditor({ template, leadFields, onSaved, onClose }) {
    const [name, setName]               = useState(template?.name || "");
    const [pdfBase64, setPdfBase64]     = useState(template?.pdfData || null);
    const [pageCount, setPageCount]     = useState(template?.pageCount || 1);
    const [currentPage, setCurrentPage] = useState(0);
    // fields: { id, key, label, page, x, y, fontSize, color }
    const [fields, setFields]           = useState(
        (template?.fields || []).map(f => ({ ...f, id: f.id || uid() }))
    );
    const [placing, setPlacing]         = useState(null);   // { key, label }
    const [draggingKey, setDraggingKey] = useState(null);
    const [selectedId, setSelectedId]   = useState(null);
    const [zoomIdx, setZoomIdx]         = useState(2); // index into ZOOM_STEPS; 2 → 1×
    const [saving, setSaving]           = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [pdfDoc, setPdfDoc]           = useState(null);

    const canvasRef  = useRef(null);
    const pdfDocRef  = useRef(null);
    const renderTask = useRef(null);

    const zoom = ZOOM_STEPS[zoomIdx];

    // ── Render page ────────────────────────────────────────────────────────
    const renderPage = useCallback(async (pageIdx) => {
        if (!pdfDocRef.current) return;
        if (renderTask.current) { renderTask.current.cancel(); renderTask.current = null; }
        const page = await pdfDocRef.current.getPage(pageIdx + 1);
        const vp   = page.getViewport({ scale: 1.5 });
        const c    = canvasRef.current;
        if (!c) return;
        c.width  = vp.width;
        c.height = vp.height;
        renderTask.current = page.render({ canvasContext: c.getContext("2d"), viewport: vp });
        await renderTask.current.promise.catch(() => {});
    }, []);

    useEffect(() => {
        if (!pdfBase64) return;
        const bytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
        pdfjsLib.getDocument({ data: bytes }).promise.then(doc => {
            pdfDocRef.current = doc;
            setPdfDoc(doc);
            setPageCount(doc.numPages);
            setCurrentPage(0);
            renderPage(0);
        }).catch(() => toast.error("Failed to load PDF"));
    }, [pdfBase64, renderPage]);

    useEffect(() => { renderPage(currentPage); }, [currentPage, renderPage]);

    // ── Upload ─────────────────────────────────────────────────────────────
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file || file.type !== "application/pdf") return toast.error("Please select a PDF file");
        const reader = new FileReader();
        reader.onload = ev => { setPdfBase64(ev.target.result.split(",")[1]); setFields([]); };
        reader.readAsDataURL(file);
    };

    // ── Place ──────────────────────────────────────────────────────────────
    const placeAt = (key, label, x, y) => {
        const id = uid();
        setFields(prev => [...prev, {
            id,
            type: "lead_field",   // server fillPdf switch key
            leadFieldKey: key,    // server reads this to look up values[leadFieldKey]
            key, label,           // client display
            page: currentPage, x, y,
            fontSize: 12, color: "#000000", align: "left", verticalAlign: "center",
        }]);
        setSelectedId(id);
        setPlacing(null);
        setDraggingKey(null);
    };

    // Coordinates are stored as % of the displayed canvas size.
    // rect dimensions already account for zoom (CSS transform), so we divide
    // directly by rect.width / rect.height — no manual zoom correction needed.
    const canvasPercent = (clientX, clientY) => {
        const c = canvasRef.current;
        if (!c) return null;
        const rect = c.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width)  * 100;
        const y = ((clientY - rect.top)  / rect.height) * 100;
        return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
    };

    const handleCanvasClick = (e) => {
        if (!placing) return;
        const pos = canvasPercent(e.clientX, e.clientY);
        if (!pos) return;
        placeAt(placing.key, placing.label, pos.x, pos.y);
    };

    const handleDragOver = (e) => { e.preventDefault(); };
    const handleDrop = (e) => {
        e.preventDefault();
        if (!draggingKey) return;
        const pos = canvasPercent(e.clientX, e.clientY);
        if (!pos) return;
        const fieldDef = leadFields.find(f => f.key === draggingKey);
        placeAt(draggingKey, fieldDef?.label || draggingKey, pos.x, pos.y);
    };

    const handlePaletteDragStart = (e, key) => {
        setDraggingKey(key);
        const ghost = document.createElement("div");
        ghost.textContent = leadFields.find(f => f.key === key)?.label || key;
        ghost.style.cssText = "position:fixed;top:-999px;background:#2563eb;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => document.body.removeChild(ghost), 0);
    };

    // ── Move / edit / remove ───────────────────────────────────────────────
    const moveField = (id, x, y) =>
        setFields(prev => prev.map(f => f.id === id ? { ...f, x, y } : f));

    const removeField = (id) => {
        setFields(prev => prev.filter(f => f.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const updateProp = (id, prop, value) =>
        setFields(prev => prev.map(f => {
            if (f.id !== id) return f;
            const updated = { ...f, [prop]: value };
            // keep type in sync: formula present → "formula", cleared → back to "lead_field"
            if (prop === "formula") {
                updated.type = value ? "formula" : "lead_field";
            }
            return updated;
        }));

    // ── Zoom ───────────────────────────────────────────────────────────────
    const zoomIn  = () => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1));
    const zoomOut = () => setZoomIdx(i => Math.max(0, i - 1));

    // ── Save ───────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!name.trim()) return toast.error("Template name is required");
        if (!pdfBase64)   return toast.error("Upload a PDF first");
        try {
            setSaving(true);
            const payload = { name, pdfData: pdfBase64, pageCount, fields };
            const res = template?._id
                ? await updateTemplate(template._id, payload)
                : await createTemplate(payload);
            toast.success(template?._id ? "Template updated" : "Template saved");
            onSaved(res.template);
        } catch { toast.error("Failed to save template"); }
        finally { setSaving(false); }
    };

    const pageFields   = fields.filter(f => f.page === currentPage);
    const selectedField = fields.find(f => f.id === selectedId);
    const placingLabel = placing?.label || null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">

            {/* ── Top bar ── */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <input value={name} onChange={e => setName(e.target.value)}
                        placeholder="Template name…"
                        className="text-sm font-semibold border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-500 bg-transparent w-56" />
                    {pdfBase64 && (
                        <span className="text-xs text-gray-400">
                            {pageCount} page{pageCount !== 1 ? "s" : ""} · {fields.length} field{fields.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {/* Zoom controls */}
                {pdfBase64 && (
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                        <button onClick={zoomOut} disabled={zoomIdx === 0}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600"><ZoomOut size={14} /></button>
                        <span className="text-xs font-semibold text-gray-600 w-10 text-center tabular-nums">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button onClick={zoomIn} disabled={zoomIdx === ZOOM_STEPS.length - 1}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600"><ZoomIn size={14} /></button>
                        <button onClick={() => setZoomIdx(2)} title="Reset zoom"
                            className="p-1 rounded hover:bg-gray-200 text-gray-400"><RotateCcw size={12} /></button>
                    </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                    {pdfBase64 && (
                        <button onClick={() => setShowPreview(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                showPreview
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}>
                            <Eye size={14} /> {showPreview ? "Hide Preview" : "Preview with Lead"}
                        </button>
                    )}
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                        <Save size={14} /> {saving ? "Saving…" : "Save Template"}
                    </button>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── Body: 3 columns ── */}
            <div className="flex-1 min-h-0 flex overflow-hidden">

                {/* ── LEFT: Fields panel ── */}
                <div className="w-72 shrink-0 flex flex-col bg-gradient-to-b from-slate-50 to-white border-r border-gray-200 overflow-hidden">

                    <div className="shrink-0 p-5 border-b border-gray-200 bg-white">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Upload PDF</label>
                        </div>
                        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 transition-all group">
                            <div className="flex flex-col items-center justify-center pt-2">
                                <svg className="w-6 h-6 text-blue-400 group-hover:text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-xs text-blue-600 font-medium">Click to upload PDF</p>
                            </div>
                            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>

                    {pdfBase64 && (
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

                            {/* Hint */}
                            {placingLabel ? (
                                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-white text-xs">📍</span>
                                        </div>
                                        <p className="text-xs text-blue-700 font-medium">
                                            Click on PDF to place <span className="font-bold">{placingLabel}</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200">
                                    <p className="text-[11px] text-gray-600 leading-relaxed">
                                        <span className="font-semibold text-gray-700">Drag</span> or <span className="font-semibold text-gray-700">click</span> a field below to place it on the PDF. Fields can be placed multiple times.
                                    </p>
                                </div>
                            )}

                            {/* Field palette — each click always places a new instance */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-emerald-100 rounded">
                                        <GripVertical size={12} className="text-emerald-600" />
                                    </div>
                                    <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Available Fields</p>
                                </div>
                                <div className="space-y-1.5">
                                    {leadFields.map(f => {
                                        const count = fields.filter(pf => pf.key === f.key && pf.page === currentPage).length;
                                        return (
                                            <div key={f.key} draggable
                                                onDragStart={e => handlePaletteDragStart(e, f.key)}
                                                onDragEnd={() => setDraggingKey(null)}
                                                onClick={() => setPlacing(
                                                    placing?.key === f.key ? null : { key: f.key, label: f.label }
                                                )}
                                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-grab active:cursor-grabbing select-none transition-all border-2 ${
                                                    placing?.key === f.key
                                                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg"
                                                        : draggingKey === f.key
                                                            ? "bg-blue-50 text-blue-700 border-blue-300 shadow-md"
                                                            : count > 0
                                                                ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200 hover:shadow-md"
                                                                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow"
                                                }`}>
                                                <div className="flex items-center gap-2">
                                                    <GripVertical size={12} className={placing?.key === f.key ? "text-white/60" : "text-gray-400"} />
                                                    <span>{f.label}</span>
                                                </div>
                                                {count > 0 && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        placing?.key === f.key ? "bg-white/25 text-white" : "bg-emerald-200 text-emerald-800"
                                                    }`}>{count}×</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Selected field properties */}
                            {selectedField && (
                                <div className="space-y-3 pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 -mx-4 px-4 py-3 border-b border-t border-purple-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">{selectedField.label.charAt(0)}</span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-800">{selectedField.label}</p>
                                        </div>
                                        <button onClick={() => removeField(selectedField.id)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">
                                            <Trash2 size={12} /> Remove
                                        </button>
                                    </div>
                                    
                                    <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                        <label className="text-[10px] font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Text Alignment</label>
                                        <div className="flex gap-1.5">
                                            {["left", "center", "right"].map(align => (
                                                <button key={align} onClick={() => updateProp(selectedField.id, "align", align)}
                                                    className={`flex-1 py-2 text-[11px] font-semibold rounded-lg border-2 transition-all ${
                                                        selectedField.align === align 
                                                            ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                                                            : "bg-white hover:bg-gray-50 border-gray-200 text-gray-600"
                                                    }`}>
                                                    {align.charAt(0).toUpperCase() + align.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                        <label className="text-[10px] font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Vertical Alignment (Pin Position)</label>
                                        <div className="flex gap-1.5">
                                            {["top", "center", "bottom"].map(vAlign => (
                                                <button key={vAlign} onClick={() => updateProp(selectedField.id, "verticalAlign", vAlign)}
                                                    className={`flex-1 py-2 text-[11px] font-semibold rounded-lg border-2 transition-all ${
                                                        (selectedField.verticalAlign || "center") === vAlign 
                                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md" 
                                                            : "bg-white hover:bg-gray-50 border-gray-200 text-gray-600"
                                                    }`}>
                                                    {vAlign.charAt(0).toUpperCase() + vAlign.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-gray-500 mt-1.5 italic">Controls how text aligns vertically relative to the pin</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                            <label className="text-[10px] font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Font Family</label>
                                            <select value={selectedField.fontFamily || "Helvetica"}
                                                onChange={e => updateProp(selectedField.id, "fontFamily", e.target.value)}
                                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                                {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                        </div>
                                        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                            <label className="text-[10px] font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Font Size</label>
                                            <input type="number" min="6" max="72" value={selectedField.fontSize}
                                                onChange={e => updateProp(selectedField.id, "fontSize", parseInt(e.target.value) || 12)}
                                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                        <label className="text-[10px] font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Text Color</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={selectedField.color}
                                                onChange={e => updateProp(selectedField.id, "color", e.target.value)}
                                                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                                            <input type="text" value={selectedField.color}
                                                onChange={e => updateProp(selectedField.id, "color", e.target.value)}
                                                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                            <label className="text-[10px] font-semibold text-gray-500 mb-2 block uppercase tracking-wide">X Position %</label>
                                            <input type="number" min="0" max="100" step="0.1"
                                                value={parseFloat(selectedField.x).toFixed(1)}
                                                onChange={e => updateProp(selectedField.id, "x", parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                            <label className="text-[10px] font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Y Position %</label>
                                            <input type="number" min="0" max="100" step="0.1"
                                                value={parseFloat(selectedField.y).toFixed(1)}
                                                onChange={e => updateProp(selectedField.id, "y", parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200">
                                        <label className="text-[10px] font-bold text-amber-800 mb-2 block uppercase tracking-wide">Formula (Concat/Math)</label>
                                        <FormulaBuilder fields={leadFields} formula={selectedField.formula || ""}
                                            onChange={val => updateProp(selectedField.id, "formula", val)} />
                                    </div>
                                </div>
                            )}

                            {/* Placed fields list */}
                            {pageFields.length > 0 && (
                                <div className="space-y-2 pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-blue-100 rounded">
                                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                                            Page {currentPage + 1} Fields
                                        </p>
                                        <span className="ml-auto text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                            {pageFields.length}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {pageFields.map(f => (
                                            <div key={f.id}
                                                onClick={() => setSelectedId(selectedId === f.id ? null : f.id)}
                                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer group transition-all border-2 ${
                                                    selectedId === f.id
                                                        ? "bg-blue-50 text-blue-700 border-blue-300 shadow-md"
                                                        : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow"
                                                }`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${
                                                        selectedId === f.id ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                                                    }`}>
                                                        {f.label.charAt(0)}
                                                    </div>
                                                    <span className="font-medium">{f.label}</span>
                                                </div>
                                                <button
                                                    onClick={e => { e.stopPropagation(); removeField(f.id); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 hover:text-red-600 transition-all">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── CENTER: Canvas ── */}
                <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-gray-300">
                    <div className="flex-1 min-h-0 overflow-auto">
                        <div className="flex justify-center items-start py-6 px-4 min-h-full">
                            {!pdfBase64 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                    <p className="text-lg font-medium">Upload a PDF to start</p>
                                </div>
                            ) : (
                                /* zoom wrapper — scale from top-left so scroll works naturally */
                                <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
                                    <div
                                        className="pdf-canvas-wrap relative shadow-2xl bg-white inline-block"
                                        style={{ cursor: placing ? "crosshair" : draggingKey ? "copy" : "default" }}
                                        onClick={handleCanvasClick}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    >
                                        <canvas ref={canvasRef} className="block" />

                                        {pageFields.map(f => (
                                            <FieldPin key={f.id} f={f}
                                                onMove={moveField} onRemove={removeField}
                                                isSelected={selectedId === f.id}
                                                onSelect={setSelectedId} />
                                        ))}

                                        {placing && <div className="absolute inset-0 border-4 border-dashed border-blue-400 pointer-events-none" />}
                                        {draggingKey && <div className="absolute inset-0 border-4 border-dashed border-emerald-400 bg-emerald-50/10 pointer-events-none" />}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Frozen bottom nav */}
                    {pdfBase64 && (
                        <div className="shrink-0 flex items-center justify-center gap-3 px-6 py-2.5 bg-gray-800 border-t border-gray-700">
                            <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
                                className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-30">
                                <ChevronLeft size={15} />
                            </button>
                            <span className="text-xs text-gray-300 tabular-nums font-medium">
                                Page {currentPage + 1} / {pageCount}
                            </span>
                            <button onClick={() => setCurrentPage(p => Math.min(pageCount - 1, p + 1))} disabled={currentPage === pageCount - 1}
                                className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-30">
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Page thumbnail strip ── */}
                {pdfBase64 && (
                    <div className="w-36 shrink-0 flex flex-col bg-gray-900 border-l border-gray-700 overflow-hidden">
                        <div className="shrink-0 px-3 py-2 border-b border-gray-700">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Pages</p>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                            {Array.from({ length: pageCount }, (_, i) => (
                                <PageThumb
                                    key={i}
                                    pdfDoc={pdfDoc}
                                    pageIdx={i}
                                    isActive={i === currentPage}
                                    hasFields={fields.some(f => f.page === i)}
                                    onClick={() => setCurrentPage(i)}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {/* ── INLINE PREVIEW PANE ── */}
                {showPreview && (
                    <InlinePreviewPane
                        templateId={template?._id}
                        templateData={{ name, pdfData: pdfBase64, pageCount, fields }}
                        onClose={() => setShowPreview(false)}
                    />
                )}

            </div>
        </div>
    );
}
