import type React from "react";

type ToolboxTextFieldProps = {
  label: string;
  value: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onFocus: () => void;
  onSelect: () => void;
  onDoubleClick: () => void;
  onChange: (
    value: string,
    selectionStart: number | null,
  ) => void;
};

export default function ToolboxTextField({
  label,
  value,
  inputRef,
  onFocus,
  onSelect,
  onDoubleClick,
  onChange,
}: ToolboxTextFieldProps) {
  return (
    <div className="editor-field">
      <label className="editor-label">{label}</label>
      <input
        ref={inputRef}
        className="editor-input"
        value={value}
        onFocus={onFocus}
        onSelect={onSelect}
        onDoubleClick={onDoubleClick}
        onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
      />
    </div>
  );
}
