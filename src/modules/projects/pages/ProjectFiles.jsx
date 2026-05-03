import { useState, useEffect, useRef } from "react";
import { Upload, Link2, FileText, Trash2, X, Plus, ExternalLink, Lock, Globe, KeyRound, Image, Film, Archive, ChevronDown, ChevronUp, Copy, Check, Download } from "lucide-react";
import { toast } from "react-toastify";
import { getFileBundles, createFileBundle, deleteFileBundle, updateBundleAccess } from "../services/projectService";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const getExt = (name) => name?.split(".").pop()?.toLowerCase();
const VIEWABLE = ["jpg", "jpeg", "png", "gif", "webp", "svg", "mp4", "mov"];

const downloadFile = async (url, name) => {
    try {
        const res = await api.get(ENDPOINTS.PROJECT.DOWNLOAD, {
            params: { url, name },
            responseType: "blob",
            timeout: 0,
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(res.data);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
    } catch { toast.error("Download failed"); }
};

const FileIcon = ({ name }) => {
    const ext = getExt(name);
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return <Image size={15} className="text-blue-500" />;
    if (["mp4", "mov", "avi"].includes(ext)) return <Film size={15} className="text-purple-500" />;
    if (["zip", "rar", "tar", "gz"].includes(ext)) return <Archive size={15} className="text-orange-500" />;
    if (ext === "pdf") return <FileText size={15} className="text-red-500" />;
    return <FileText size={15} className="text-gray-500" />;
};

// ── Add Bundle Drawer ──────────────────────────────────────────────────────────
const AddDrawer = ({ isOpen, onClose, onSubmit, loading, uploadProgress, members }) => {
    const [name, setName] = useState("");
    const [links, setLinks] = useState([{ title: "", url: "" }]);
    const [envContent, setEnvContent] = useState("");
    const [files, setFiles] = useState([]);
    const [isPublic, setIsPublic] = useState(true);
    const [sharedWith, setSharedWith] = useState([]);
    const submittingRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            setName(""); setLinks([{ title: "", url: "" }]);
            setEnvContent(""); setFiles([]); setIsPublic(true); setSharedWith([]);
            submittingRef.current = false;
        }
    }, [isOpen]);

    const setLink = (i, k, v) => setLinks(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
    const addLink = () => setLinks(ls => [...ls, { title: "", url: "" }]);
    const removeLink = (i) => setLinks(ls => ls.filter((_, idx) => idx !== i));
    const toggleMember = (id) => setSharedWith(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    const handleSubmit = () => {
        if (submittingRef.current || loading) return;
        if (!name.trim()) return toast.error("Display name is required");
        const hasFiles = files.length > 0;
        const hasLinks = links.some(l => l.url.trim());
        const hasEnv = envContent.trim();
        if (!hasFiles && !hasLinks && !hasEnv) return toast.error("Add at least one file, link, or ENV");

        submittingRef.current = true;
        const fd = new FormData();
        fd.append("name", name);
        fd.append("isPublic", isPublic);
        fd.append("links", JSON.stringify(links.filter(l => l.url.trim())));
        if (!isPublic) sharedWith.forEach(id => fd.append("sharedWith", id));
        if (hasEnv) fd.append("envContent", envContent);
        files.forEach(f => fd.append("files", f));
        onSubmit(fd).finally(() => { submittingRef.current = false; });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => { if (!loading) onClose(); }} />
            <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-gray-900">Add Files & Links</h2>
                    <button onClick={onClose} disabled={loading} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Display Name <span className="text-red-500">*</span></label>
                        <input value={name} onChange={e => setName(e.target.value)}
                            placeholder="e.g. Sprint 1 Resources" className={inputCls} />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                <Link2 size={12} /> Links
                            </label>
                            <button onClick={addLink} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                <Plus size={11} /> Add Link
                            </button>
                        </div>
                        <div className="space-y-2">
                            {links.map((l, i) => (
                                <div key={i} className="flex gap-2 items-start">
                                    <div className="flex-1 space-y-1.5">
                                        <input value={l.title} onChange={e => setLink(i, "title", e.target.value)}
                                            placeholder="Title (e.g. GitHub Repo)" className={inputCls} />
                                        <input value={l.url} onChange={e => setLink(i, "url", e.target.value)}
                                            placeholder="https://github.com/..." className={inputCls} />
                                    </div>
                                    {links.length > 1 && (
                                        <button onClick={() => removeLink(i)} className="mt-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                            <KeyRound size={12} /> ENV Variables
                        </label>
                        <textarea value={envContent} onChange={e => setEnvContent(e.target.value)}
                            rows={5} placeholder={"DB_URL=mongodb://...\nAPI_KEY=xxx\nSECRET=yyy"}
                            className={`${inputCls} font-mono text-xs`} />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                            <Upload size={12} /> Upload Files
                        </label>
                        <label className="flex items-center gap-2 px-3 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition text-sm text-gray-500">
                            <Upload size={15} />
                            <span>{files.length ? `${files.length} file(s) selected` : "Click to select files"}</span>
                            <input type="file" multiple className="hidden"
                                onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                        </label>
                        {files.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {files.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                                        <span className="truncate text-gray-700">{f.name}</span>
                                        <button onClick={() => setFiles(fs => fs.filter((_, idx) => idx !== i))}
                                            className="text-red-400 hover:text-red-600 ml-2 shrink-0">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-600">Access Control</p>
                        <div className="flex gap-2">
                            <button onClick={() => setIsPublic(true)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isPublic ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                <Globe size={12} /> All Members
                            </button>
                            <button onClick={() => setIsPublic(false)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${!isPublic ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                <Lock size={12} /> Restricted
                            </button>
                        </div>
                        {!isPublic && (
                            <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                                {members.map(m => (
                                    <label key={m._id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                        <input type="checkbox" checked={sharedWith.includes(m._id)} onChange={() => toggleMember(m._id)} className="rounded" />
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                            {m.firstName?.[0]}{m.lastName?.[0]}
                                        </div>
                                        <span className="text-sm text-gray-700">{m.firstName} {m.lastName}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Upload progress overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 gap-4 px-8">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                            <Upload size={28} className="text-blue-600 animate-bounce" />
                        </div>
                        <div className="w-full space-y-2 text-center">
                            <p className="text-sm font-semibold text-gray-800">
                                {uploadProgress < 100 ? "Uploading files..." : "Processing..."}
                            </p>
                            <p className="text-xs text-gray-400">
                                {uploadProgress < 100 ? "Please wait, do not close this window" : "Saving to server..."}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress < 100 ? uploadProgress : 100}%` }}
                                />
                            </div>
                            <p className="text-xs font-medium text-blue-600">
                                {uploadProgress < 100 ? `${uploadProgress}%` : "Finalizing..."}
                            </p>
                        </div>
                    </div>
                )}
                <div className="px-6 py-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Access Manager Modal ───────────────────────────────────────────────────────
const AccessModal = ({ bundle, members, onClose, onSave, loading }) => {
    const [isPublic, setIsPublic] = useState(bundle.isPublic);
    const [sharedWith, setSharedWith] = useState(bundle.sharedWith?.map(u => u._id || u) || []);
    const toggle = (id) => setSharedWith(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h3 className="text-sm font-semibold text-gray-900">Manage Access — {bundle.name}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={15} /></button>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div className="flex gap-2">
                        <button onClick={() => setIsPublic(true)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isPublic ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                            <Globe size={12} /> All Members
                        </button>
                        <button onClick={() => setIsPublic(false)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${!isPublic ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                            <Lock size={12} /> Restricted
                        </button>
                    </div>
                    {!isPublic && (
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                            {members.map(m => (
                                <label key={m._id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" checked={sharedWith.includes(m._id)} onChange={() => toggle(m._id)} className="rounded" />
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {m.firstName?.[0]}{m.lastName?.[0]}
                                    </div>
                                    <span className="text-sm text-gray-700">{m.firstName} {m.lastName}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="px-5 py-3 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={() => onSave({ isPublic, sharedWith })} disabled={loading}
                        className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {loading ? "Saving..." : "Save Access"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Bundle Card ────────────────────────────────────────────────────────────────
const BundleCard = ({ bundle, canDelete, isAdmin, onDelete, onManageAccess }) => {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(bundle.envContent || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasFiles = bundle.files?.length > 0;
    const hasLinks = bundle.links?.length > 0;
    const hasEnv = !!bundle.envContent;

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 group">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText size={15} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{bundle.name}</p>
                    <p className="text-[10px] text-gray-400">
                        by {bundle.uploadedBy?.firstName} {bundle.uploadedBy?.lastName}
                        {" · "}{[hasFiles && `${bundle.files.length} file(s)`, hasLinks && `${bundle.links.length} link(s)`, hasEnv && "ENV"].filter(Boolean).join(", ")}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {bundle.isPublic ? <Globe size={12} className="text-green-500" /> : <Lock size={12} className="text-orange-500" />}
                    <button onClick={() => setExpanded(s => !s)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition">
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {hasEnv && (
                        <button onClick={copy} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition">
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={() => onManageAccess(bundle)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition opacity-0 group-hover:opacity-100">
                            <Lock size={14} />
                        </button>
                    )}
                    {canDelete && (
                        <button onClick={() => onDelete(bundle._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition opacity-0 group-hover:opacity-100">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                    {hasFiles && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Files</p>
                            <div className="space-y-1">
                                {bundle.files.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <FileIcon name={f.name} />
                                        <span className="truncate flex-1 text-gray-700">{f.name}</span>
                                        {VIEWABLE.includes(getExt(f.name)) ? (
                                            <a href={f.url} target="_blank" rel="noreferrer"
                                                className="flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded shrink-0 transition">
                                                <ExternalLink size={11} /> View
                                            </a>
                                        ) : (
                                            <button onClick={() => downloadFile(f.url, f.name)}
                                                className="flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded shrink-0 transition">
                                                <Download size={11} /> Download
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {hasLinks && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Links</p>
                            <div className="space-y-1">
                                {bundle.links.map((l, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <Link2 size={12} className="text-blue-500 shrink-0" />
                                        <a href={l.url} target="_blank" rel="noreferrer"
                                            className="text-blue-600 hover:underline truncate flex items-center gap-1">
                                            {l.title || l.url} <ExternalLink size={10} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {hasEnv && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">ENV</p>
                            <div className="bg-gray-950 rounded-lg px-3 py-2">
                                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">{bundle.envContent}</pre>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const ProjectFiles = ({ projectId, members, currentUserId, isAdmin }) => {
    const [bundles, setBundles] = useState([]);
    const [serverIsAdmin, setServerIsAdmin] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [accessBundle, setAccessBundle] = useState(null);
    const [accessLoading, setAccessLoading] = useState(false);

    const canManage = isAdmin || serverIsAdmin;

    const load = async () => {
        try {
            const res = await getFileBundles(projectId);
            setBundles(res.data.data || []);
            setServerIsAdmin(res.data.isAdmin || false);
        } catch { toast.error("Failed to load files"); }
    };

    useEffect(() => { load(); }, [projectId]);

    const handleAdd = async (fd) => {
        try {
            setLoading(true);
            setUploadProgress(0);
            const res = await createFileBundle(projectId, fd, (e) => {
                if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
            });
            setBundles(res.data.data || []);
            setDrawerOpen(false);
            toast.success("Added successfully");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to add");
            throw err;
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (bundleId) => {
        if (!window.confirm("Delete this bundle?")) return;
        try {
            await deleteFileBundle(projectId, bundleId);
            setBundles(b => b.filter(x => x._id !== bundleId));
            toast.success("Deleted");
        } catch { toast.error("Failed to delete"); }
    };

    const handleSaveAccess = async ({ isPublic, sharedWith }) => {
        try {
            setAccessLoading(true);
            const res = await updateBundleAccess(projectId, accessBundle._id, { isPublic, sharedWith });
            setBundles(res.data.data || []);
            setAccessBundle(null);
            toast.success("Access updated");
        } catch { toast.error("Failed to update access"); }
        finally { setAccessLoading(false); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">{bundles.length} bundle(s)</p>
                <button onClick={() => setDrawerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition">
                    <Plus size={13} /> Add Files
                </button>
            </div>

            {bundles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText size={36} className="text-gray-300 mb-2" />
                    <p className="text-gray-400 text-sm">No files or links yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {bundles.map(b => (
                        <BundleCard
                            key={b._id}
                            bundle={b}
                            canDelete={canManage || b.uploadedBy?._id === currentUserId}
                            isAdmin={canManage}
                            onDelete={handleDelete}
                            onManageAccess={setAccessBundle}
                        />
                    ))}
                </div>
            )}

            <AddDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onSubmit={handleAdd}
                loading={loading}
                uploadProgress={uploadProgress}
                members={members}
            />

            {accessBundle && (
                <AccessModal
                    bundle={accessBundle}
                    members={members}
                    onClose={() => setAccessBundle(null)}
                    onSave={handleSaveAccess}
                    loading={accessLoading}
                />
            )}
        </div>
    );
};

export default ProjectFiles;
