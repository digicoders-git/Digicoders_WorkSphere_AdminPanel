import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const uid = () => Math.random().toString(36).slice(2, 9);

const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

// ── empty factories ───────────────────────────────────────────────────────────
const emptyL1 = () => ({ _id: uid(), name: "", items: [] });
const emptyL2 = () => ({ _id: uid(), name: "", bullets: [], costs: [] });
const emptyCost = () => ({ _id: uid(), label: "", amount: "", type: "one_time" });

// ── Cost row ──────────────────────────────────────────────────────────────────
function CostRow({ cost, onChange, onRemove }) {
    return (
        <div className="flex items-center gap-1.5">
            <input
                value={cost.label}
                onChange={e => onChange({ ...cost, label: e.target.value })}
                placeholder="Label (e.g. Setup fee)"
                className={`${inp} flex-1 min-w-0`}
            />
            <div className="relative shrink-0 w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                <input
                    type="number" min="0"
                    value={cost.amount}
                    onChange={e => onChange({ ...cost, amount: e.target.value })}
                    placeholder="0"
                    className={`${inp} pl-5`}
                />
            </div>
            <select
                value={cost.type}
                onChange={e => onChange({ ...cost, type: e.target.value })}
                className="shrink-0 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
                <option value="one_time">One-time</option>
                <option value="monthly">Monthly</option>
            </select>
            <button type="button" onClick={onRemove}
                className="shrink-0 p-1 rounded hover:bg-red-50 text-red-400">
                <Trash2 size={12} />
            </button>
        </div>
    );
}

// ── Level 2 item ──────────────────────────────────────────────────────────────
function L2Item({ item, onChange, onRemove }) {
    const [open, setOpen] = useState(true);

    const monthly  = item.costs.reduce((s, c) => c.type === "monthly"  ? s + Number(c.amount || 0) : s, 0);
    const oneTime  = item.costs.reduce((s, c) => c.type === "one_time" ? s + Number(c.amount || 0) : s, 0);

    const updateCost   = (ci, patch) => onChange({ ...item, costs: item.costs.map((c, i) => i === ci ? { ...c, ...patch } : c) });
    const addCost      = () => onChange({ ...item, costs: [...item.costs, emptyCost()] });
    const removeCost   = (ci) => onChange({ ...item, costs: item.costs.filter((_, i) => i !== ci) });

    const updateBullet = (bi, val) => onChange({ ...item, bullets: item.bullets.map((b, i) => i === bi ? val : b) });
    const addBullet    = () => onChange({ ...item, bullets: [...item.bullets, ""] });
    const removeBullet = (bi) => onChange({ ...item, bullets: item.bullets.filter((_, i) => i !== bi) });

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* L2 header */}
            <div
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer"
                onClick={() => setOpen(v => !v)}
            >
                <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                    <input
                        value={item.name}
                        onChange={e => onChange({ ...item, name: e.target.value })}
                        placeholder="Item name (Level 2)…"
                        className="w-full bg-transparent text-sm font-medium text-gray-800 focus:outline-none placeholder:text-gray-400"
                    />
                </div>
                {/* Totals badge */}
                {(monthly > 0 || oneTime > 0) && (
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {monthly > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold whitespace-nowrap">
                                ₹{fmt(monthly)}/mo
                            </span>
                        )}
                        {oneTime > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold whitespace-nowrap">
                                ₹{fmt(oneTime)} once
                            </span>
                        )}
                    </div>
                )}
                <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }}
                    className="shrink-0 p-1 rounded hover:bg-red-50 text-red-400">
                    <Trash2 size={12} />
                </button>
                {open ? <ChevronUp size={13} className="text-gray-400 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
            </div>

            {open && (
                <div className="px-3 py-3 space-y-3 border-t border-gray-100 bg-white">

                    {/* Costs */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Costs</p>
                            <button type="button" onClick={addCost}
                                className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-medium">
                                <Plus size={10} /> Add cost
                            </button>
                        </div>
                        {item.costs.length === 0 ? (
                            <p className="text-[11px] text-gray-400 italic">No costs yet</p>
                        ) : (
                            <div className="space-y-1.5">
                                {item.costs.map((c, ci) => (
                                    <CostRow key={c._id || ci} cost={c}
                                        onChange={patch => updateCost(ci, patch)}
                                        onRemove={() => removeCost(ci)} />
                                ))}
                            </div>
                        )}
                        {/* Auto totals */}
                        {item.costs.length > 0 && (monthly > 0 || oneTime > 0) && (
                            <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100">
                                {monthly > 0 && (
                                    <span className="text-xs text-blue-700 font-semibold">
                                        Monthly total: ₹{fmt(monthly)}
                                    </span>
                                )}
                                {oneTime > 0 && (
                                    <span className="text-xs text-emerald-700 font-semibold">
                                        One-time total: ₹{fmt(oneTime)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bullets (Level 3) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                Bullets <span className="text-gray-400 font-normal">(Level 3 — sub-descriptions)</span>
                            </p>
                            <button type="button" onClick={addBullet}
                                className="flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-700 font-medium">
                                <Plus size={10} /> Add bullet
                            </button>
                        </div>
                        {item.bullets.length === 0 ? (
                            <p className="text-[11px] text-gray-400 italic">No bullets yet</p>
                        ) : (
                            <div className="space-y-1.5 pl-3 border-l-2 border-purple-100">
                                {item.bullets.map((b, bi) => (
                                    <div key={bi} className="flex items-center gap-1.5">
                                        <span className="text-gray-300 text-xs shrink-0">•</span>
                                        <input
                                            value={b}
                                            onChange={e => updateBullet(bi, e.target.value)}
                                            placeholder="Description…"
                                            className={`${inp} flex-1`}
                                        />
                                        <button type="button" onClick={() => removeBullet(bi)}
                                            className="shrink-0 p-1 rounded hover:bg-red-50 text-red-400">
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Level 1 group ─────────────────────────────────────────────────────────────
function L1Group({ group, onChange, onRemove }) {
    const [open, setOpen] = useState(true);

    const totalMonthly = group.items.reduce((s, item) =>
        s + item.costs.reduce((cs, c) => c.type === "monthly" ? cs + Number(c.amount || 0) : cs, 0), 0);
    const totalOneTime = group.items.reduce((s, item) =>
        s + item.costs.reduce((cs, c) => c.type === "one_time" ? cs + Number(c.amount || 0) : cs, 0), 0);

    const addItem    = () => onChange({ ...group, items: [...group.items, emptyL2()] });
    const updateItem = (ii, patch) => onChange({ ...group, items: group.items.map((it, i) => i === ii ? patch : it) });
    const removeItem = (ii) => onChange({ ...group, items: group.items.filter((_, i) => i !== ii) });

    return (
        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
            {/* L1 header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 cursor-pointer"
                onClick={() => setOpen(v => !v)}>
                <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                    <input
                        value={group.name}
                        onChange={e => onChange({ ...group, name: e.target.value })}
                        placeholder="Group name (Level 1)…"
                        className="w-full bg-transparent text-sm font-bold text-gray-800 focus:outline-none placeholder:text-gray-400"
                    />
                </div>
                {/* Group totals */}
                {(totalMonthly > 0 || totalOneTime > 0) && (
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {totalMonthly > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-full font-semibold whitespace-nowrap">
                                ₹{fmt(totalMonthly)}/mo
                            </span>
                        )}
                        {totalOneTime > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white rounded-full font-semibold whitespace-nowrap">
                                ₹{fmt(totalOneTime)} once
                            </span>
                        )}
                    </div>
                )}
                <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }}
                    className="shrink-0 p-1 rounded hover:bg-red-100 text-red-400">
                    <Trash2 size={13} />
                </button>
                {open ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
            </div>

            {open && (
                <div className="p-3 space-y-2 border-t border-gray-200 bg-white">
                    {group.items.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">No items yet</p>
                    ) : (
                        group.items.map((item, ii) => (
                            <L2Item key={item._id || ii} item={item}
                                onChange={patch => updateItem(ii, patch)}
                                onRemove={() => removeItem(ii)} />
                        ))
                    )}
                    <button type="button" onClick={addItem}
                        className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-blue-200 hover:border-blue-400 text-blue-500 hover:text-blue-700 rounded-lg text-xs font-medium transition">
                        <Plus size={12} /> Add item (Level 2)
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ListFieldEditor({ label, required, value, onChange }) {
    const groups = Array.isArray(value) ? value : [];

    const addGroup    = () => onChange([...groups, emptyL1()]);
    const updateGroup = (gi, patch) => onChange(groups.map((g, i) => i === gi ? patch : g));
    const removeGroup = (gi) => onChange(groups.filter((_, i) => i !== gi));

    // Grand totals across all groups
    const grandMonthly = groups.reduce((s, g) =>
        s + g.items.reduce((gs, item) =>
            gs + item.costs.reduce((cs, c) => c.type === "monthly" ? cs + Number(c.amount || 0) : cs, 0), 0), 0);
    const grandOneTime = groups.reduce((s, g) =>
        s + g.items.reduce((gs, item) =>
            gs + item.costs.reduce((cs, c) => c.type === "one_time" ? cs + Number(c.amount || 0) : cs, 0), 0), 0);

    return (
        <div className="sm:col-span-2 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-500">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <button type="button" onClick={addGroup}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium border border-orange-200">
                    <Plus size={11} /> Add group (Level 1)
                </button>
            </div>

            {/* Groups */}
            {groups.length === 0 ? (
                <div className="flex items-center justify-center py-5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                    No groups yet — click "Add group"
                </div>
            ) : (
                <div className="space-y-2">
                    {groups.map((g, gi) => (
                        <L1Group key={g._id || gi} group={g}
                            onChange={patch => updateGroup(gi, patch)}
                            onRemove={() => removeGroup(gi)} />
                    ))}
                </div>
            )}

            {/* Grand totals */}
            {(grandMonthly > 0 || grandOneTime > 0) && (
                <div className="flex items-center gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grand Total</span>
                    {grandMonthly > 0 && (
                        <span className="text-sm font-bold text-blue-700">
                            ₹{fmt(grandMonthly)} <span className="text-xs font-normal text-blue-500">/month</span>
                        </span>
                    )}
                    {grandOneTime > 0 && (
                        <span className="text-sm font-bold text-emerald-700">
                            ₹{fmt(grandOneTime)} <span className="text-xs font-normal text-emerald-500">one-time</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Read-only view ────────────────────────────────────────────────────────────
export function ListFieldView({ label, value }) {
    const groups = Array.isArray(value) ? value : [];

    const grandMonthly = groups.reduce((s, g) =>
        s + g.items.reduce((gs, item) =>
            gs + item.costs.reduce((cs, c) => c.type === "monthly" ? cs + Number(c.amount || 0) : cs, 0), 0), 0);
    const grandOneTime = groups.reduce((s, g) =>
        s + g.items.reduce((gs, item) =>
            gs + item.costs.reduce((cs, c) => c.type === "one_time" ? cs + Number(c.amount || 0) : cs, 0), 0), 0);

    if (groups.length === 0) return (
        <div className="sm:col-span-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm text-gray-300">—</p>
        </div>
    );

    return (
        <div className="sm:col-span-2 space-y-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
            {groups.map((g, gi) => {
                const gMonthly = g.items.reduce((s, item) =>
                    s + item.costs.reduce((cs, c) => c.type === "monthly" ? cs + Number(c.amount || 0) : cs, 0), 0);
                const gOneTime = g.items.reduce((s, item) =>
                    s + item.costs.reduce((cs, c) => c.type === "one_time" ? cs + Number(c.amount || 0) : cs, 0), 0);
                return (
                    <div key={gi} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* L1 */}
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                            <span className="text-sm font-bold text-gray-800">{g.name || "—"}</span>
                            <div className="flex gap-1.5">
                                {gMonthly > 0 && <span className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-full font-semibold">₹{fmt(gMonthly)}/mo</span>}
                                {gOneTime > 0 && <span className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white rounded-full font-semibold">₹{fmt(gOneTime)} once</span>}
                            </div>
                        </div>
                        {/* L2 items */}
                        <div className="divide-y divide-gray-100">
                            {(g.items || []).map((item, ii) => {
                                const iMonthly = item.costs.reduce((s, c) => c.type === "monthly" ? s + Number(c.amount || 0) : s, 0);
                                const iOneTime = item.costs.reduce((s, c) => c.type === "one_time" ? s + Number(c.amount || 0) : s, 0);
                                return (
                                    <div key={ii} className="px-4 py-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700">{item.name || "—"}</span>
                                            <div className="flex gap-1.5">
                                                {iMonthly > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">₹{fmt(iMonthly)}/mo</span>}
                                                {iOneTime > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">₹{fmt(iOneTime)} once</span>}
                                            </div>
                                        </div>
                                        {/* Costs */}
                                        {item.costs.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-1.5">
                                                {item.costs.map((c, ci) => (
                                                    <span key={ci} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.type === "monthly" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
                                                        {c.label}: ₹{fmt(c.amount)} {c.type === "monthly" ? "/mo" : "once"}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {/* Bullets L3 */}
                                        {item.bullets.length > 0 && (
                                            <ul className="space-y-0.5 pl-3">
                                                {item.bullets.filter(Boolean).map((b, bi) => (
                                                    <li key={bi} className="text-xs text-gray-500 flex items-start gap-1.5">
                                                        <span className="text-gray-300 mt-0.5 shrink-0">•</span>{b}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            {/* Grand totals */}
            {(grandMonthly > 0 || grandOneTime > 0) && (
                <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</span>
                    {grandMonthly > 0 && <span className="text-sm font-bold text-blue-700">₹{fmt(grandMonthly)}<span className="text-xs font-normal text-blue-500">/month</span></span>}
                    {grandOneTime > 0 && <span className="text-sm font-bold text-emerald-700">₹{fmt(grandOneTime)}<span className="text-xs font-normal text-emerald-500"> one-time</span></span>}
                </div>
            )}
        </div>
    );
}
