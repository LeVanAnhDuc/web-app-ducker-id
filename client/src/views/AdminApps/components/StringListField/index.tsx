"use client";

// libs
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";

const StringListField = ({
  value,
  onChange,
  placeholder,
  addLabel,
  removeLabel,
  invalidIndices = [],
  disabled = false
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  invalidIndices?: number[];
  disabled?: boolean;
}) => {
  const t = useTranslations("adminApps.actions");
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <CustomInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          disabled={disabled}
        />
        <CustomButton
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={disabled || !draft.trim()}
          iconLeft={<Plus aria-hidden="true" />}
        >
          {addLabel || t("addUri")}
        </CustomButton>
      </div>
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((item, index) => {
            const isInvalid = invalidIndices.includes(index);
            return (
              <li
                key={`${item}-${index}`}
                className="bg-muted flex items-center gap-2 rounded-md px-3 py-1.5"
                data-invalid={isInvalid || undefined}
              >
                <span
                  className={
                    isInvalid
                      ? "text-destructive flex-1 font-mono text-xs break-all"
                      : "text-foreground flex-1 font-mono text-xs break-all"
                  }
                >
                  {item}
                </span>
                <CustomButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${removeLabel}: ${item}`}
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                >
                  <X className="size-4" aria-hidden="true" />
                </CustomButton>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default StringListField;
