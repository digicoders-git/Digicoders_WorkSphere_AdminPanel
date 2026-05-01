import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";

const CrudModal = ({ isOpen, onClose, title, fields = [], initialData = {}, onSubmit, loading = false, mode = "create", onFieldChange }) => {
  const [formData, setFormData] = useState({});
  const modalRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);


  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedElement.current = document.activeElement;
    const focusable = getFocusableElements();
    focusable[0]?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Tab") {
        const elements = getFocusableElements();
        if (elements.length === 0) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement.current?.focus();
    };
  }, [isOpen, onClose]);

  const getFocusableElements = () => {
    if (!modalRef.current) return [];

    return modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (onFieldChange) {
      const updated = await onFieldChange(name, value, formData);
      setFormData(updated);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiSelect = (e, name) => {
    const values = Array.from(e.target.selectedOptions, (o) => o.value);
    setFormData((prev) => ({ ...prev, [name]: values }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleOutsideClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onMouseDown={handleOutsideClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-lg max-h-[90vh] bg-white rounded-xl shadow-lg flex flex-col animate-scaleIn"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b sticky top-0 bg-white">
          <h2 id="modal-title" className="text-base sm:text-lg font-semibold">
            {title}
          </h2>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
              </label>

              {/* SELECT */}
              {field.type === "select" ? (
                <select
                  name={field.name}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  disabled={mode === "view"}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                >
                  <option value="">Select</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) :

                /* MULTISELECT */
                field.type === "multiselect" ? (
                  <select
                    multiple
                    value={formData[field.name] || []}
                    onChange={(e) => handleMultiSelect(e, field.name)}
                    className="w-full border rounded-lg px-3 py-2 h-28 text-sm"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) :

                  /* CHECKBOX GROUP */
                  field.type === "checkbox-group" ? (
                    <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-4">
                      {field.groups?.map((group) => {
                        const allSelected = group.permissions.every((perm) =>
                          (formData[field.name] || []).includes(perm)
                        );

                        const toggleAll = () => {
                          let updated = [...(formData[field.name] || [])];

                          if (allSelected) {
                            updated = updated.filter(
                              (p) => !group.permissions.includes(p)
                            );
                          } else {
                            updated = [
                              ...new Set([...updated, ...group.permissions]),
                            ];
                          }

                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: updated,
                          }));
                        };

                        return (
                          <div key={group.module}>
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-semibold text-gray-700">
                                {group.module}
                              </h4>

                              <button
                                type="button"
                                onClick={toggleAll}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {allSelected ? "Unselect All" : "Select All"}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {group.permissions.map((perm) => {
                                const checked =
                                  (formData[field.name] || []).includes(perm);

                                return (
                                  <label
                                    key={perm}
                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const updated = checked
                                          ? formData[field.name].filter(
                                            (p) => p !== perm
                                          )
                                          : [
                                            ...(formData[field.name] || []),
                                            perm,
                                          ];

                                        setFormData((prev) => ({
                                          ...prev,
                                          [field.name]: updated,
                                        }));
                                      }}
                                    />

                                    {perm
                                      .toLowerCase()
                                      .replaceAll("_", " ")
                                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) :

                    /* DATE PICKER */
                    field.type === "date" ? (
                      <div className="w-full">
                        <DatePicker
                          selected={formData[field.name] ? new Date(formData[field.name]) : null}
                          onChange={(date) =>
                            setFormData((prev) => ({
                              ...prev,
                              [field.name]: date,
                            }))
                          }
                          dateFormat="dd/MM/yyyy"
                          placeholderText="Select date"
                          disabled={mode === "view"}
                          wrapperClassName="w-full"
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                        />
                      </div>
                    ) :

                      /* INPUT */
                      (
                        <input
                          type={field.type || "text"}
                          name={field.name}
                          value={formData[field.name] || ""}
                          onChange={handleChange}
                          disabled={mode === "view"}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                        />
                      )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 sm:p-6 border-t sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 border rounded-lg text-sm hover:bg-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>

          {mode !== "view" && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrudModal;