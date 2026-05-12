import { useState, useRef } from "react";
import { X, Upload, FileText, CheckCircle, AlertCircle, Download, Loader } from "lucide-react";
import { toast } from "react-toastify";
import { importLeadsCsv } from "../services/leadService";

const SAMPLE_CSV = [
    "contactNumber,orgName,address,contactPerson,designation,cellNumber,email,rooms,extra,status,communication",
    "3238438400,Acme Corp,123 Main St Los Angeles,John Doe,Manager,3238438401,john@acme.com,3BHK,Corner unit,New Lead,Interested in 3BHK units on upper floors",
    "3238438402,Beta LLC,456 Oak Ave New York,Jane Smith,Director,3238438403,jane@beta.com,2BHK,,Contacted,Called and left voicemail",
    "3238438404,Gamma Inc,789 Pine Rd Chicago,Bob Lee,CEO,,,Studio,,New Lead,",
].join("\n");

const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "leads_sample.csv"; a.click();
    URL.revokeObjectURL(url);
};

const downloadErrorLog = (errors, fileName) => {
    const ts    = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const lines = ["Row,Error", ...errors.map(e => `"${e.replace(/"/g, '""')}"`).map((e, i) => `${i + 1},${e}`)];
    const blob  = new Blob([lines.join("\n")], { type: "text/csv" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href = url; a.download = `import-errors-${fileName}-${ts}.csv`; a.click();
    URL.revokeObjectURL(url);
};

// How many errors to show inline before we only show the download button
const INLINE_LIMIT = 5;

const LeadImport = ({ isOpen, onClose, onDone }) => {
    const [file, setFile]           = useState(null);
    const [dragging, setDragging]   = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress]   = useState(0);
    const [result, setResult]       = useState(null);
    const inputRef = useRef(null);

    const reset = () => { setFile(null); setProgress(0); setResult(null); setUploading(false); };
    const handleClose = () => { reset(); onClose(); };

    const handleFile = (f) => {
        if (!f) return;
        if (!f.name.endsWith(".csv")) return toast.error("Only .csv files are supported");
        if (f.size > 50 * 1024 * 1024) return toast.error("File must be under 50 MB");
        setFile(f);
        setResult(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        try {
            setUploading(true);
            setProgress(0);
            const res = await importLeadsCsv(file, setProgress);
            setResult(res);
            if (res.inserted > 0) {
                toast.success(`${res.inserted} leads imported`);
                onDone?.();
            } else if (res.failed > 0) {
                toast.error(`Import finished with ${res.failed} failed rows`);
            } else {
                toast.info(res.message);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Import failed");
        } finally { setUploading(false); }
    };

    if (!isOpen) return null;

    const errors      = result?.errors || [];
    const hasErrors   = errors.length > 0;
    const bigLog      = errors.length > INLINE_LIMIT;
    const inlineErrors = bigLog ? errors.slice(0, INLINE_LIMIT) : errors;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <Upload size={16} className="text-blue-600" />
                        <h2 className="text-base font-semibold text-gray-900">Import Leads from CSV</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                        <X size={16} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4 overflow-y-auto">

                    {/* Column guide */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-600 mb-1.5">Expected CSV columns</p>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { col: "contactNumber", req: true },
                                { col: "orgName", req: true },
                                { col: "address" }, { col: "contactPerson" },
                                { col: "designation" }, { col: "cellNumber" },
                                { col: "email" }, { col: "rooms" },
                                { col: "extra" }, { col: "status" },
                                { col: "communication" },
                            ].map(({ col, req }) => (
                                <span key={col}
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${req
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
                    {!result && (
                        <div
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
                                ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
                        >
                            <input ref={inputRef} type="file" accept=".csv" className="hidden"
                                onChange={e => handleFile(e.target.files[0])} />
                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <FileText size={32} className="text-blue-500" />
                                    <p className="text-sm font-medium text-gray-800">{file.name}</p>
                                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                                    <button onClick={e => { e.stopPropagation(); reset(); }}
                                        className="text-xs text-red-500 hover:text-red-600 underline mt-1">
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload size={28} className="text-gray-300" />
                                    <p className="text-sm text-gray-500">Drop your CSV here or <span className="text-blue-600 font-medium">browse</span></p>
                                    <p className="text-xs text-gray-400">Max 50 MB</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Progress */}
                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <Loader size={12} className="animate-spin" /> Uploading & processing…
                                </span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-3">
                            {/* Summary cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-green-600">{result.inserted}</p>
                                    <p className="text-[10px] text-green-600 font-medium mt-0.5">Inserted</p>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                                    <p className="text-[10px] text-yellow-600 font-medium mt-0.5">Skipped</p>
                                </div>
                                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                                    <p className="text-[10px] text-red-500 font-medium mt-0.5">Failed</p>
                                </div>
                            </div>

                            {/* Error log */}
                            {hasErrors && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {errors.length} row error{errors.length > 1 ? "s" : ""}
                                            {bigLog && ` — showing first ${INLINE_LIMIT}`}
                                        </p>
                                        {/* Download full log if more than INLINE_LIMIT errors */}
                                        {bigLog && (
                                            <button
                                                onClick={() => downloadErrorLog(errors, file?.name?.replace(".csv", "") || "import")}
                                                className="flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700 bg-white border border-red-200 px-2 py-1 rounded-lg transition"
                                            >
                                                <Download size={11} /> Download full log ({errors.length})
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-0.5 max-h-28 overflow-y-auto">
                                        {inlineErrors.map((e, i) => (
                                            <p key={i} className="text-[10px] text-red-500 font-mono leading-relaxed">{e}</p>
                                        ))}
                                        {bigLog && (
                                            <p className="text-[10px] text-red-400 italic pt-1">
                                                … and {errors.length - INLINE_LIMIT} more. Download the full log above.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {result.inserted > 0 && (
                                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                    <CheckCircle size={15} /> Import complete
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex items-center justify-between shrink-0">
                    <button onClick={downloadSample}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition">
                        <Download size={13} /> Download sample CSV
                    </button>
                    <div className="flex items-center gap-2">
                        {result ? (
                            <button onClick={handleClose}
                                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                                Done
                            </button>
                        ) : (
                            <>
                                <button onClick={handleClose}
                                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button onClick={handleUpload} disabled={!file || uploading}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                                    {uploading
                                        ? <><Loader size={13} className="animate-spin" /> Processing…</>
                                        : <><Upload size={13} /> Import</>}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadImport;
