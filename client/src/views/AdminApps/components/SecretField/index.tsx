"use client";

// libs
import { Copy, Check } from "lucide-react";
// hooks
import { useCopyToClipboard } from "@/hooks";
// components
import CustomButton from "@/components/CustomButton";

const SecretField = ({
  label,
  value,
  copyLabel,
  copiedLabel,
  onCopySuccess
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  onCopySuccess?: () => void;
}) => {
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = async () => {
    await copy(value);
    onCopySuccess?.();
  };

  return (
    <div className="space-y-1.5">
      <p className="text-foreground text-sm font-medium">{label}</p>
      <div className="border-border flex items-center gap-2 rounded-md border p-2">
        <code className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-sm">
          {value}
        </code>
        <CustomButton
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-label={copied ? copiedLabel : copyLabel}
          iconLeft={
            copied ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )
          }
        >
          {copied ? copiedLabel : copyLabel}
        </CustomButton>
      </div>
    </div>
  );
};

export default SecretField;
