"use client";

// libs
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import FormFieldMessage from "@/components/FormFieldMessage";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
// hooks
import { useAnnounce } from "@/hooks";

const PasswordInput = ({
  name,
  label,
  placeholder,
  autoComplete,
  disabled = false,
  required = false
}: {
  name: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const tAnnounce = useTranslations("common.announce");
  const tToggle = useTranslations("common.passwordInput");
  const { announce } = useAnnounce();

  const handleTogglePasswordVisibility = () => {
    const willShow = !showPassword;
    announce(tAnnounce(willShow ? "passwordShown" : "passwordHidden"));
    setShowPassword(willShow);
  };

  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className="text-foreground">
            {label}
            {required && <span className="text-destructive"> *</span>}
          </FormLabel>
          <div className="relative w-full">
            <FormControl>
              <CustomInput
                {...field}
                type={showPassword ? "text" : "password"}
                autoComplete={autoComplete}
                placeholder={placeholder}
                aria-invalid={fieldState.invalid}
                disabled={disabled}
                className="pr-12"
              />
            </FormControl>
            <CustomButton
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={showPassword ? tToggle("hide") : tToggle("show")}
              aria-pressed={showPassword}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 size-8 -translate-y-1/2"
              onClick={handleTogglePasswordVisibility}
              onMouseDown={(e) => e.preventDefault()}
              disabled={disabled}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </CustomButton>
          </div>
          <FormFieldMessage />
        </FormItem>
      )}
    />
  );
};

export default PasswordInput;
