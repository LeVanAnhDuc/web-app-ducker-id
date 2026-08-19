"use client";

// libs
import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
// ghosts
import MyContactDetailAnnouncer from "../../ghosts/MyContactDetailAnnouncer";

const MyContactDetailNotFound = () => {
  const t = useTranslations("contactAdmin.myContacts.detail");

  return (
    <>
      <MyContactDetailAnnouncer isLoading={false} hasData={false} isError />
      <div className="bg-card flex flex-col items-center gap-3 rounded-xl border p-12 text-center">
        <div className="bg-muted flex size-14 items-center justify-center rounded-full">
          <SearchX
            className="text-muted-foreground size-6"
            aria-hidden="true"
          />
        </div>
        <p className="text-muted-foreground text-sm" role="alert">
          {t("notFound")}
        </p>
      </div>
    </>
  );
};

export default MyContactDetailNotFound;
