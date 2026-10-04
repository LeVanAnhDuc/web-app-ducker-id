"use client";

// libs
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
// components
import CustomButton from "@/components/CustomButton";

const CategoryRowActions = ({
  name,
  onEdit,
  onDelete
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const t = useTranslations("adminCategories.actions");

  return (
    <div className="flex justify-end">
      <CustomButton
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("edit", { name })}
        onClick={onEdit}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </CustomButton>
      <CustomButton
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("delete", { name })}
        onClick={onDelete}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </CustomButton>
    </div>
  );
};

export default CategoryRowActions;
