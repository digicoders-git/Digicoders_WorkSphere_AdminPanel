import { useState, useEffect, useRef, useCallback } from "react";
import { X, Trash2, Save, ChevronLeft, ChevronRight, GripVertical, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";
import { createTemplate, updateTemplate } from "../services/proposalService";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const uid = () => Math.random().toString(36).slice(2, 9);
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const THUMB_SCALE = 0.18;

// ── Draggable field pin ───────────────────────────────────────────────────────
function FieldPin({ f, zoom, onMove, onRemove, isSelected, onSelect }) {
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
        const rect = canvas.getBoundingClientRect();
        // rect already reflects zoom (CSS transform), so divide by zoom to get logical px
        const logW = rect.width  / zoom;
        const logH = rect.height / zoom;
        const dx = (e.clientX - start.current.cx) / zoom;
        const dy = (e.clientY - start.current.cy) / zoom;
        const nx = Math.min(100, Math.max(0, start.current.x + (dx / logW) * 100));
        const ny = Math.min(100, Math.max(0, start.current.y + (dy / logH) * 100));
        onMove(f.id, nx, ny);
    };
    const onPointerUp = () => { drag.current = false; };

    return (
        <div
            ref={pinRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ position: "absolute", left: `${f.x}%`, top: `${f.y}%`, transform: "translate(-50%,-50%)", touchAction: "none" }}
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
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-1.5 h-1.5 bg-blue-600 rounded-full border border-white shadow" />
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
    const [zoom, setZoom]               = useState(1);
    const [saving, setSaving]           = useState(false);

    const canvasRef  = useRef(null);
    const pdfDocRef  = useRef(null);
    const renderTask = useRef(null);

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
        setFields(prev => [...prev, { id, key, label, page: currentPage, x, y, fontSize: 12, color: "#000000" }]);
        setSelectedId(id);
        setPlacing(null);
        setDraggingKey(null);
    };

    const handleCanvasClick = (e) => {
        if (!placing || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width)  * 100;
        const y = ((e.clientY - rect.top)  / rect.height) * 100;
        placeAt(placing.key, placing.label, x, y);
    };

    const handleDragOver = (e) => { e.preventDefault(); };
    const handleDrop = (e) => {
        e.preventDefault();
        if (!draggingKey || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width)  * 100;
        const y = ((e.clientY - rect.top)  / rect.height) * 100;
        const fieldDef = leadFields.find(f => f.key === draggingKey);
        placeAt(draggingKey, fieldDef?.label || draggingKey, x, y);
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
        setFields(prev => prev.map(f => f.id === id ? { ...f, [prop]: value } : f));

    // ── Zoom ───────────────────────────────────────────────────────────────
    const zoomIn  = () => setZoom(z => ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(z) + 1)] ?? z);
    const zoomOut = () => setZoom(z => ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(z) - 1)] ?? z);

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
                        <button onClick={zoomOut} disabled={zoom === ZOOM_STEPS[0]}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600"><ZoomOut size={14} /></button>
                        <span className="text-xs font-semibold text-gray-600 w-10 text-center tabular-nums">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button onClick={zoomIn} disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600"><ZoomIn size={14} /></button>
                        <button onClick={() => setZoom(1)} title="Reset zoom"
                            className="p-1 rounded hover:bg-gray-200 text-gray-400"><RotateCcw size={12} /></button>
                    </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
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
                <div className="w-64 shrink-0 flex flex-col bg-white border-r overflow-hidden">

                    <div className="shrink-0 p-4 border-b">
                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Upload PDF</label>
                        <input type="file" accept="application/pdf" onChange={handleFileUpload}
                            className="text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                    </div>

                    {pdfBase64 && (
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

                            {/* Hint */}
                            {placingLabel ? (
                                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
                                    📍 Click PDF to place <strong>{placingLabel}</strong>
                                </div>
                            ) : (
                                <p className="text-[11px] text-gray-400">
                                    <strong className="text-gray-600">Drag</strong> or <strong className="text-gray-600">click</strong> a field to place it.
                                    Same field can be placed multiple times.
                                </p>
                            )}

                            {/* Field palette — each click always places a new instance */}
                            <div className="space-y-1">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fields</p>
                                {leadFields.map(f => {
                                    const count = fields.filter(pf => pf.key === f.key && pf.page === currentPage).length;
                                    return (
                                        <div key={f.key} draggable
                                            onDragStart={e => handlePaletteDragStart(e, f.key)}
                                            onDragEnd={() => setDraggingKey(null)}
                                            onClick={() => setPlacing(
                                                placing?.key === f.key ? null : { key: f.key, label: f.label }
                                            )}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-grab active:cursor-grabbing select-none transition-colors ${
                                                placing?.key === f.key
                                                    ? "bg-blue-600 text-white"
                                                    : draggingKey === f.key
                                                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                                                        : count > 0
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent"
                                            }`}>
                                            <div className="flex items-center gap-1.5">
                                                <GripVertical size={11} className="opacity-40 shrink-0" />
                                                <span>{f.label}</span>
                                            </div>
                                            {count > 0 && (
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                    placing?.key === f.key ? "bg-white/20" : "bg-emerald-100 text-emerald-700"
                                                }`}>{count}×</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Selected field properties */}
                            {selectedField && (
                                <div className="space-y-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-gray-700">{selectedField.label}</p>
                                        <button onClick={() => removeField(selectedField.id)}
                                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-500 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={11} /> Remove
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-gray-400 mb-1 block">Font size</label>
                                            <input type="number" min="6" max="72" value={selectedField.fontSize}
                                                onChange={e => updateProp(selectedField.id, "fontSize", parseInt(e.target.value) || 12)}
                                                className={inp} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 mb-1 block">Color</label>
                                            <input type="color" value={selectedField.color}
                                                onChange={e => updateProp(selectedField.id, "color", e.target.value)}
                                                className="w-full h-9 rounded-lg border border-gray-200 cursor-pointer" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-gray-400 mb-1 block">X %</label>
                                            <input type="number" min="0" max="100" step="0.1"
                                                value={parseFloat(selectedField.x).toFixed(1)}
                                                onChange={e => updateProp(selectedField.id, "x", parseFloat(e.target.value) || 0)}
                                                className={inp} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 mb-1 block">Y %</label>
                                            <input type="number" min="0" max="100" step="0.1"
                                                value={parseFloat(selectedField.y).toFixed(1)}
                                                onChange={e => updateProp(selectedField.id, "y", parseFloat(e.target.value) || 0)}
                                                className={inp} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Placed fields list */}
                            {pageFields.length > 0 && (
                                <div className="space-y-1 pt-3 border-t border-gray-100">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                        On page {currentPage + 1} ({pageFields.length})
                                    </p>
                                    {pageFields.map(f => (
                                        <div key={f.id}
                                            onClick={() => setSelectedId(selectedId === f.id ? null : f.id)}
                                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer group transition-colors ${
                                                selectedId === f.id
                                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                                            }`}>
                                            <span className="font-medium truncate">{f.label}</span>
                                            <button
                                                onClick={e => { e.stopPropagation(); removeField(f.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 shrink-0">
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    ))}
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
                                            <FieldPin key={f.id} f={f} zoom={zoom}
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
                                    pdfDoc={pdfDocRef.current}
                                    pageIdx={i}
                                    isActive={i === currentPage}
                                    hasFields={fields.some(f => f.page === i)}
                                    onClick={() => setCurrentPage(i)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
