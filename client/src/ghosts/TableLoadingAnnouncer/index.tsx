"use client";

// libs
import { useEffect } from "react";
// hooks
import { useAnnounce } from "@/hooks";

const TableLoadingAnnouncer = ({
  isLoading,
  message
}: {
  isLoading: boolean;
  message: string;
}) => {
  const { announce } = useAnnounce();

  useEffect(() => {
    if (isLoading) announce(message);
  }, [isLoading, message, announce]);

  return null;
};

export default TableLoadingAnnouncer;
