import { groupPlaceholders, PLACEHOLDER_GROUP_LABELS } from "./quoteEmailUtils";

/**
 * Click-to-insert {{key}} chips for quote email and proposal text fields.
 * @param {object} props
 * @param {Array} props.placeholders - from buildAllQuotePlaceholders()
 * @param {(key: string) => void} props.onInsert
 * @param {boolean} [props.compact]
 */
export default function QuotePlaceholderPicker({ placeholders, onInsert, compact = false }) {
    const groups = groupPlaceholders(placeholders);

    return (
        <div className={compact ? "space-y-1.5" : "space-y-2"}>
            <p className={`text-gray-500 font-semibold uppercase ${compact ? "text-[9px]" : "text-[10px]"}`}>
                Insert placeholder — use in notes, features, requirements (e.g. {`{{orgName}}`})
            </p>
            {["quote", "lead", "custom"].map((groupKey) =>
                groups[groupKey]?.length > 0 ? (
                    <div key={groupKey}>
                        <p className={`font-semibold text-gray-500 mb-1 ${compact ? "text-[9px]" : "text-[10px]"}`}>
                            {PLACEHOLDER_GROUP_LABELS[groupKey]}
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {groups[groupKey].map((p) => (
                                <button
                                    key={`${groupKey}-${p.key}`}
                                    type="button"
                                    title={p.label}
                                    onClick={() => onInsert(p.key)}
                                    className={`px-2 py-0.5 rounded-lg hover:opacity-90 font-mono ${
                                        compact ? "text-[9px]" : "text-[10px]"
                                    } ${
                                        groupKey === "custom"
                                            ? "bg-violet-100 text-violet-800"
                                            : groupKey === "lead"
                                              ? "bg-emerald-100 text-emerald-800"
                                              : "bg-blue-100 text-blue-800"
                                    }`}
                                >
                                    {`{{${p.key}}}`}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null
            )}
        </div>
    );
}
