"use client";

// libs
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
// types
import type { AdminCategoryFormValues } from "@/types/AdminCategories";
// forms
import { initialAdminCategoryData } from "@/forms/AdminCategory/data";

/** Each time the dialog opens, start from the picker's search text as name.en. */
const QuickCreateResetEffect = ({
  initialName
}: {
  initialName: string | null;
}) => {
  const { reset } = useFormContext<AdminCategoryFormValues>();
  useEffect(() => {
    if (initialName !== null) {
      reset({ ...initialAdminCategoryData, nameEn: initialName });
    }
  }, [initialName, reset]);
  return null;
};

export default QuickCreateResetEffect;
