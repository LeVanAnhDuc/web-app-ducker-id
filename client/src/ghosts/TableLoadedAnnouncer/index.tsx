"use client";

// libs
import { useEffect } from "react";
// hooks
import { useAnnounce } from "@/hooks";

const TableLoadedAnnouncer = ({
  total,
  message
}: {
  total: number | undefined;
  message: string;
}) => {
  const { announce } = useAnnounce();

  useEffect(() => {
    if (typeof total === "number") announce(message);
  }, [total, message, announce]);

  return null;
};

export default TableLoadedAnnouncer;
