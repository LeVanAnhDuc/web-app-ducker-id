"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronsUpDown } from "lucide-react";
// types
import type { AdminAppFormValues } from "@/types/AdminApps";
import type { AdminCategory } from "@/types/AdminCategories";
// components
import CustomButton from "@/components/CustomButton";
import CustomFormLabel from "@/components/CustomFormLabel";
import SearchInput from "@/components/SearchInput";
import { FormDescription, FormField, FormItem } from "@/components/ui/form";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import AppFormMessage from "../AppFormMessage";
import CategoryOptionList from "../CategoryOptionList";
import QuickCreateCategoryDialog from "../QuickCreateCategoryDialog";
import SelectedCategoryChips from "../SelectedCategoryChips";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";
import { cn } from "@/libs/utils";

const { CATEGORY_IDS } = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;
const { MAX_PER_APP } = CONSTANTS.CATEGORY_LIMITS;

/**
 * 1–5 categories in the order they were picked; the first is the primary.
 * Unticking and re-ticking moves a category to the end. Removing the primary
 * promotes the next one.
 */
const CategoryMultiSelect = ({
  categories,
  disabled = false
}: {
  categories: AdminCategory[];
  disabled?: boolean;
}) => {
  const t = useTranslations("adminApps.form.fields.categoryIds");
  const { field, fieldState } = useFieldProps<AdminAppFormValues>(CATEGORY_IDS);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createName, setCreateName] = useState<string | null>(null);

  return (
    <FormField
      {...field}
      render={({ field }) => {
        const value: string[] = field.value ?? [];
        const byId = new Map(categories.map((c) => [c._id, c]));
        const selected = value.flatMap((id) => byId.get(id) ?? []);
        const atLimit = value.length >= MAX_PER_APP;

        const toggle = (id: string) =>
          field.onChange(
            value.includes(id)
              ? value.filter((v) => v !== id)
              : atLimit
                ? value
                : [...value, id]
          );
        const remove = (id: string) =>
          field.onChange(value.filter((v) => v !== id));

        return (
          <FormItem>
            <CustomFormLabel required>{t("label")}</CustomFormLabel>
            <Popover open={open && !disabled} onOpenChange={setOpen}>
              <PopoverAnchor asChild>
                <div
                  className={cn(
                    "border-input bg-input-background flex min-h-10 items-center gap-2 rounded-lg border px-2 py-1.5",
                    fieldState.invalid && "border-destructive",
                    open && "ring-ring ring-2"
                  )}
                >
                  {selected.length > 0 ? (
                    <SelectedCategoryChips
                      selected={selected}
                      disabled={disabled}
                      onRemove={remove}
                    />
                  ) : (
                    <span className="text-muted-foreground px-1 text-sm">
                      {t("placeholder")}
                    </span>
                  )}
                  <PopoverTrigger asChild>
                    <CustomButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled}
                      role="combobox"
                      aria-expanded={open}
                      aria-haspopup="listbox"
                      aria-invalid={fieldState.invalid}
                      aria-label={`${t("label")}: ${t("selected", { count: value.length })}`}
                      className="ml-auto shrink-0"
                    >
                      <ChevronsUpDown className="size-4" aria-hidden="true" />
                    </CustomButton>
                  </PopoverTrigger>
                </div>
              </PopoverAnchor>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="flex w-[var(--radix-popover-trigger-width)] min-w-72 flex-col gap-2 p-2"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder={t("searchPlaceholder")}
                  ariaLabel={t("searchPlaceholder")}
                />
                <CategoryOptionList
                  categories={categories}
                  selectedIds={value}
                  query={query}
                  atLimit={atLimit}
                  onToggle={toggle}
                  onCreate={(name) => {
                    setOpen(false);
                    setCreateName(name);
                  }}
                />
              </PopoverContent>
            </Popover>
            <FormDescription>{t("hint")}</FormDescription>
            <AppFormMessage />
            <QuickCreateCategoryDialog
              initialName={createName}
              onClose={() => setCreateName(null)}
              onCreated={(created) => {
                if (!value.includes(created._id) && !atLimit) {
                  field.onChange([...value, created._id]);
                }
                setCreateName(null);
                setQuery("");
              }}
            />
          </FormItem>
        );
      }}
    />
  );
};

export default CategoryMultiSelect;
