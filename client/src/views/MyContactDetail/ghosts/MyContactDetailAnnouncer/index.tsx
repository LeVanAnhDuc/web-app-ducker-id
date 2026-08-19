"use client";

// libs
import { useEffect } from "react";
import { useTranslations } from "next-intl";
// hooks
import { useAnnounce } from "@/hooks";

const MyContactDetailAnnouncer = ({
  isLoading,
  hasData,
  isError
}: {
  isLoading: boolean;
  hasData: boolean;
  isError: boolean;
}) => {
  const tAnnounce = useTranslations("contactAdmin.myContacts.detail.announce");
  const { announce } = useAnnounce();

  useEffect(() => {
    if (isLoading) announce(tAnnounce("loading"));
  }, [isLoading, announce, tAnnounce]);

  useEffect(() => {
    if (hasData) announce(tAnnounce("loaded"));
  }, [hasData, announce, tAnnounce]);

  useEffect(() => {
    if (isError) announce(tAnnounce("error"));
  }, [isError, announce, tAnnounce]);

  return null;
};

export default MyContactDetailAnnouncer;
