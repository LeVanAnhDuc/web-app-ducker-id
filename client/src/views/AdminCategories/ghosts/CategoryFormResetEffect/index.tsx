"use client";

// libs
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
// types
import type {
  AdminCategory,
  AdminCategoryFormValues
} from "@/types/AdminCategories";
// forms
import { initialAdminCategoryData } from "@/forms/AdminCategory/data";

const CategoryFormResetEffect = ({
  open,
  editing
}: {
  open: boolean;
  editing: AdminCategory | null;
}) => {
  const { reset } = useFormContext<AdminCategoryFormValues>();
  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? { nameEn: editing.name.en, nameVi: editing.name.vi }
        : initialAdminCategoryData
    );
  }, [open, editing, reset]);
  return null;
};

export default CategoryFormResetEffect;
