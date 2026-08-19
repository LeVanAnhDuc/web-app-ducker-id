"use client";

// libs
import type { Dispatch, SetStateAction } from "react";
// hooks
import { useUpdateEffect } from "@/hooks";

const ActiveIndexResetEffect = ({
  query,
  setActiveIndex
}: {
  query: string;
  setActiveIndex: Dispatch<SetStateAction<number>>;
}) => {
  useUpdateEffect(() => {
    setActiveIndex(-1);
  }, [query, setActiveIndex]);

  return null;
};

export default ActiveIndexResetEffect;
