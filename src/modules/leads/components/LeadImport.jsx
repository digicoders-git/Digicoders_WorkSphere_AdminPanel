import { useState, useRef } from "react";
import { X, Upload, FileText, CheckCircle, AlertCircle, Download, Loader, RefreshCw, Eye } from "lucide-react";
import { toast } from "react-toastify";
import { parse } from "papaparse";
import { importLeadsBatch } from "../services/leadService";

// ─── constants ────────────────────────────────────────────────────────────────
const BATCH_SIZE   = 100;
const PREVIEW_ROWS = 3;

const VALID_STATUSES = ["New Lead", "Contacted", "Meeting Scheduled", "Proposal Sent",
    "Sent to Project Team", "Project Done", "On Hold", "Cancelled"];

const FIELD_MAP = {
    contactnumber: "contactNumber", contact_number: "contactNumber",
    orgname: "orgName", org_name: "orgName", organisation: "orgName", company: "orgName",
    address: "address",
    contactperson: "contactPerson", contact_person: "contactPerson",
    designation: "designation",
    cellnumber: "cellNumber", cell_number: "cellNumber",
    email: "email",
    rooms: "rooms",
    extra: "extra",
    status: "status",
    communication: "communication", note: "communication", notes: "communication",
};

const SAMPLE_CSV = [
    "contactNumber,orgName,address,contactPerson,designation,cellNumber,email,rooms,extra,status,communication",
    "3238438400,Acme Corp,123 Main St Los Angeles,John Doe,Manager,3238438401,john@acme.com,3BHK,Corner unit,New Lead,Interested in 3BHK units",
    "3238438402,Beta LLC,456 Oak Ave New York,Jane Smith,Director,3238438403,jane@beta.com,2BHK,,Contacted,Called and left voicemail",
    "3238438404,Gamma Inc,789 Pine Rd Chicago,Bob Lee,CEO,,,Studio,,New Lead,",
].join("\n");

// ─── helpers ──────────────────────────────────────────────────────────────────
const downloadBlob = (content, name, type = "text/csv") => {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
};

const normaliseRow = (raw) => {
    const out = {};
    for (const k of Object.keys(raw)) {
        const mapped = FIELD_MAP[k.toLowerCase().replace(/\s+/g, "")];
        if (mapped) out[mapped] = raw[k]?.trim() || "";
    }
    return out;
};

const validateRow = (row, rowNum) => {
    const errors = [];
    const cn = (row.contactNumber || "").replace(/\D/g, "").slice(-10);
    if (!cn || cn.length !== 10)
        errors.push(`C${rowNum}: Invalid contact number "${row.contactNumber || ""}"`);
    if (!(row.orgName || "").trim())
        errors.push(`C${rowNum}: Organisation name is required`);
    return errors;
};

// ─── stages: "idle" | "errors" | "preview" | "uploading" | "done" ─────────────
const LeadImport = ({ isOpen, onClose, onDone }) => {
    const [stage, setStage]         = useState("idle");
    const [file, setFile]           = useState(null);
    const [dragging, setDragging]   = useState(false);
    const [parsing, setParsing]     = useState(false);

    // parsed data
    const [headers, setHeaders]     = useState([]);
    const [validRows, setValidRows] = useState([]);
    const [rowErrors, setRowErrors] = useState([]);   // ["C29: ...", "C300: ..."]

    // upload progress
    const [uploaded, setUploaded]   = useState(0);
    const [total, setTotal]         = useState(0);
    const [inserted, setInserted]   = useState(0);
    const [skipped, setSkipped]     = useState(0);
    const [aborted, setAborted]     = useState(false);
    const abortRef = useRef(false);

    const inputRef = useRef(null);

    const reset = () => {
        setStage("idle"); setFile(null); setParsing(false);
        setHeaders([]); setValidRows([]); setRowErrors([]);
        setUploaded(0); setTotal(0); setInserted(0); setSkipped(0);
        setAborted(false); abortRef.current = false;
    };

    const handleClose = () => { reset(); onClose(); };

    // ── file pick ──────────────────────────────────────────────────────────────
    const handleFile = (f) => {
        if (!f) return;
        if (!f.name.endsWith(".csv")) return toast.error("Only .csv files are supported");
        if (f.size > 50 * 1024 * 1024) return toast.error("File must be under 50 MB");
        setFile(f);
        parseFile(f);
    };

    const handleDrop = (e) => {
        e.preventDefault(); setDragging(false);
        handleFile(e.dataTransfer.files[0]);
    };

    // ── parse CSV client-side ──────────────────────────────────────────────────
    const parseFile = (f) => {
        setParsing(true);
        parse(f, {
            header: true,
            skipEmptyLines: true,
            complete: ({ data, meta }) => {
                setParsing(false);
                const hdrs   = meta.fields || [];
                const errors = [];
                const valid  = [];

                data.forEach((raw, idx) => {
                    const rowNum = idx + 2; // +2: 1-based + header row
                    const row    = normaliseRow(raw);
                    // clean phone
                    row.contactNumber = (row.contactNumber || "").replace(/\D/g, "").slice(-10);
                    row.cellNumber    = (row.cellNumber    || "").replace(/\D/g, "").slice(-10);
                    row.email         = (row.email || "").toLowerCase();
                    if (!VALID_STATUSES.includes(row.status)) row.status = "New Lead";

                    const errs = validateRow(row, rowNum);
                    if (errs.length) errors.push(...errs);
                    else valid.push(row);
                });

                setHeaders(hdrs);
                setRowErrors(errors);
                setValidRows(valid);

                if (errors.length) setStage("errors");
                else               setStage("preview");
            },
            error: () => { setParsing(false); toast.error("Failed to parse CSV"); },
        });
    };

    // ── upload in batches ──────────────────────────────────────────────────────
    const handleUpload = async () => {
        setStage("uploading");
        setTotal(validRows.length);
        setUploaded(0); setInserted(0); setSkipped(0);
        setAborted(false); abortRef.current = false;

        let ins = 0, skp = 0, done = 0;

        for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
            if (abortRef.current) { setAborted(true); break; }

            const batch = validRows.slice(i, i + BATCH_SIZE);
            try {
                const res = await importLeadsBatch(batch);
                ins += res.inserted || 0;
                skp += res.skipped  || 0;
            } catch {
                // batch failed — continue with next batch, don't abort
            }
            done += batch.length;
            setUploaded(done);
            setInserted(ins);
            setSkipped(skp);
        }

        setStage("done");
        if (ins > 0) { toast.success(`${ins} leads imported`); onDone?.(); }
        else toast.info("Import complete — no new leads inserted");
    };

    const handleAbort = () => { abortRef.current = true; };

    // ── download helpers ───────────────────────────────────────────────────────
    const downloadSample = () => downloadBlob(SAMPLE_CSV, "leads_sample.csv");

    const downloadErrorLog = () => {
        const ts    = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const lines = ["#,Error", ...rowErrors.map((e, i) => `${i + 1},"${e.replace(/"/g, '""')}"`)]
        downloadBlob(lines.join("\n"), `import-errors-${ts}.csv`);
    };

    const downloadFixedTemplate = () => {
        // Download only the errored rows pre-filled so user can fix and re-upload
        const errorRowNums = new Set(
            rowErrors.map(e => parseInt(e.match(/^C(\d+)/)?.[1])).filter(Boolean)
        );
        // re-parse original file to get raw errored rows
        parse(file, {
            header: true, skipEmptyLines: true,
            complete: ({ data, meta }) => {
                const hdrs = meta.fields || [];
                const bad  = data.filter((_, idx) => errorRowNums.has(idx + 2));
                const lines = [hdrs.join(","), ...bad.map(r => hdrs.map(h => `"${(r[h] || "").replace(/"/g, '""')}"`).join(","))];
                downloadBlob(lines.join("\n"), `fix-these-rows.csv`);
            },
        });
    };

    if (!isOpen) return null;

    // ── DISPLAY COLUMNS for preview — only mapped fields that exist in CSV ─────
    const DISPLAY_FIELDS = ["contactNumber", "orgName", "address", "contactPerson",
        "designation", "cellNumber", "email", "rooms", "extra", "status", "communication"];
    const previewRows = validRows.slice(0, PREVIEW_ROWS);
    const previewCols = DISPLAY_FIELDS.filter(f => previewRows.some(r => r[f]));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={stage === "uploading" ? undefined : handleClose} />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <Upload size={16} className="text-blue-600" />
                        <h2 className="text-base font-semibold text-gray-900">Import Leads from CSV</h2>
                        {stage !== "idle" && file && (
                            <span className="text-xs text-gray-400 font-normal">{file.name}</span>
                        )}
                    </div>
                    {stage !== "uploading" && (
                        <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">

                    {/* ── STAGE: idle ── */}
                    {stage === "idle" && (
                        <>
                            {/* Column guide */}
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-600 mb-1.5">Expected CSV columns</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { col: "contactNumber", req: true }, { col: "orgName", req: true },
                                        { col: "address" }, { col: "contactPerson" }, { col: "designation" },
                                        { col: "cellNumber" }, { col: "email" }, { col: "rooms" },
                                        { col: "extra" }, { col: "status" }, { col: "communication" },
                                    ].map(({ col, req }) => (
                                        <span key={col} className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${req
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                            {col}{req && " *"}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2">
                                    * Required. Duplicates skipped. Phone numbers auto-cleaned (last 10 digits).
                                </p>
                            </div>

                            {/* Drop zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition
                                    ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
                            >
                                <input ref={inputRef} type="file" accept=".csv" className="hidden"
                                    onChange={e => handleFile(e.target.files[0])} />
                                {parsing ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader size={28} className="text-blue-400 animate-spin" />
                                        <p className="text-sm text-gray-500">Parsing CSV…</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload size={28} className="text-gray-300" />
                                        <p className="text-sm text-gray-500">Drop your CSV here or <span className="text-blue-600 font-medium">browse</span></p>
                                        <p className="text-xs text-gray-400">Max 50 MB</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── STAGE: errors ── */}
                    {stage === "errors" && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-red-700">
                                        {rowErrors.length} row{rowErrors.length > 1 ? "s" : ""} have issues
                                    </p>
                                    <p className="text-xs text-red-500 mt-0.5">
                                        {validRows.length} valid rows ready. Fix the errors below and re-upload.
                                    </p>
                                </div>
                            </div>

                            {/* Error list — first 5 inline */}
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-red-600">
                                        Showing first {Math.min(5, rowErrors.length)} of {rowErrors.length} errors
                                    </p>
                                    <div className="flex gap-2">
                                        <button onClick={downloadFixedTemplate}
                                            className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 hover:text-orange-700 bg-white border border-orange-200 px-2 py-1 rounded-lg">
                                            <Download size={10} /> Download error rows
                                        </button>
                                        {rowErrors.length > 5 && (
                                            <button onClick={downloadErrorLog}
                                                className="flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700 bg-white border border-red-200 px-2 py-1 rounded-lg">
                                                <Download size={10} /> Full log ({rowErrors.length})
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {rowErrors.slice(0, 5).map((e, i) => (
                                        <p key={i} className="text-[11px] text-red-600 font-mono bg-white rounded px-2 py-1 border border-red-100">{e}</p>
                                    ))}
                                    {rowErrors.length > 5 && (
                                        <p className="text-[10px] text-red-400 italic pt-1">… and {rowErrors.length - 5} more errors</p>
                                    )}
                                </div>
                            </div>

                            {validRows.length > 0 && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
                                    <CheckCircle size={14} />
                                    <span><strong>{validRows.length}</strong> valid rows can still be imported. You can proceed or fix errors first.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STAGE: preview ── */}
                    {stage === "preview" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                                <CheckCircle size={15} className="text-green-600" />
                                <p className="text-sm text-green-700 font-medium">
                                    All {validRows.length.toLocaleString()} rows validated — ready to import
                                </p>
                            </div>

                            {/* Preview table — first 3 rows */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Eye size={13} className="text-gray-400" />
                                    <p className="text-xs font-semibold text-gray-600">
                                        Preview — first {Math.min(PREVIEW_ROWS, validRows.length)} rows
                                    </p>
                                </div>
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                {previewCols.map(col => (
                                                    <th key={col} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{col}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {previewRows.map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    {previewCols.map(col => (
                                                        <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                                                            {row[col] || <span className="text-gray-300">—</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {validRows.length > PREVIEW_ROWS && (
                                    <p className="text-[10px] text-gray-400 mt-1.5 text-right">
                                        … and {(validRows.length - PREVIEW_ROWS).toLocaleString()} more rows
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── STAGE: uploading ── */}
                    {stage === "uploading" && (
                        <div className="space-y-5 py-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-600 tabular-nums">
                                    {uploaded.toLocaleString()}
                                    <span className="text-lg text-gray-400 font-normal"> / {total.toLocaleString()}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">rows processed</p>
                            </div>

                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${total ? (uploaded / total) * 100 : 0}%` }} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                                    <p className="text-xl font-bold text-green-600 tabular-nums">{inserted.toLocaleString()}</p>
                                    <p className="text-[10px] text-green-600 font-medium mt-0.5">Inserted</p>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-center">
                                    <p className="text-xl font-bold text-yellow-600 tabular-nums">{skipped.toLocaleString()}</p>
                                    <p className="text-[10px] text-yellow-600 font-medium mt-0.5">Skipped (duplicates)</p>
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 text-center">
                                Uploading in batches of {BATCH_SIZE} — already saved rows are safe if you stop
                            </p>
                        </div>
                    )}

                    {/* ── STAGE: done ── */}
                    {stage === "done" && (
                        <div className="space-y-4 py-2">
                            {aborted ? (
                                <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                                    <AlertCircle size={18} className="text-orange-500 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-orange-700">Import stopped early</p>
                                        <p className="text-xs text-orange-600 mt-0.5">
                                            Stopped at row {uploaded.toLocaleString()} of {total.toLocaleString()}. All processed rows are saved.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                                    <CheckCircle size={18} className="text-green-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-700">Import complete</p>
                                        <p className="text-xs text-green-600 mt-0.5">{uploaded.toLocaleString()} rows processed</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-green-600 tabular-nums">{inserted.toLocaleString()}</p>
                                    <p className="text-[10px] text-green-600 font-medium mt-0.5">Inserted</p>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-yellow-600 tabular-nums">{skipped.toLocaleString()}</p>
                                    <p className="text-[10px] text-yellow-600 font-medium mt-0.5">Skipped (dupes)</p>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-gray-600 tabular-nums">{uploaded.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">Rows uploaded</p>

                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex items-center justify-between shrink-0">
                    <button onClick={downloadSample}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition">
                        <Download size={13} /> Sample CSV
                    </button>

                    <div className="flex items-center gap-2">
                        {stage === "idle" && (
                            <button onClick={handleClose}
                                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                                Cancel
                            </button>
                        )}

                        {stage === "errors" && (
                            <>
                                <button onClick={reset}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                                    <RefreshCw size={13} /> Re-upload
                                </button>
                                {validRows.length > 0 && (
                                    <button onClick={() => setStage("preview")}
                                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                                        Continue with {validRows.length.toLocaleString()} valid rows →
                                    </button>
                                )}
                            </>
                        )}

                        {stage === "preview" && (
                            <>
                                <button onClick={reset}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                                    <RefreshCw size={13} /> Change file
                                </button>
                                <button onClick={handleUpload}
                                    className="flex items-center gap-1.5 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                                    <Upload size={13} /> Import {validRows.length.toLocaleString()} leads
                                </button>
                            </>
                        )}

                        {stage === "uploading" && (
                            <button onClick={handleAbort}
                                className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-medium">
                                Stop import
                            </button>
                        )}

                        {stage === "done" && (
                            <button onClick={handleClose}
                                className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                                Done
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadImport;
