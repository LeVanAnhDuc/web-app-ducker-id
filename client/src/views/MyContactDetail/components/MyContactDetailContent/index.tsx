"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { MyContactDetail } from "@/types/MyContacts";
// components
import CustomBadge from "@/components/CustomBadge";
import FormatTime from "@/components/FormatTime";
import ShortId from "@/components/ShortId";
import DetailField from "../DetailField";
// ghosts
import MyContactDetailAnnouncer from "../../ghosts/MyContactDetailAnnouncer";
// dataSources
import { CONTACT_STATUS_VARIANT } from "@/dataSources/ContactAdmin";

const MyContactDetailContent = ({ contact }: { contact: MyContactDetail }) => {
  const tFields = useTranslations("contactAdmin.myContacts.detail.fields");
  const tStatus = useTranslations("contactAdmin.admin.list.status");
  const tPriority = useTranslations("contactAdmin.myContacts.priority");

  return (
    <>
      <MyContactDetailAnnouncer isLoading={false} hasData isError={false} />
      <div className="bg-card rounded-xl border p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-mono text-lg font-bold">
              <ShortId value={contact._id} />
            </h2>
            <p className="text-muted-foreground text-sm">
              <FormatTime value={contact.createdAt} variant="datetime" />
            </p>
          </div>
          <CustomBadge
            variant={CONTACT_STATUS_VARIANT[contact.status]}
            className="text-sm"
          >
            {tStatus(contact.status)}
          </CustomBadge>
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailField
            label={tFields("priority")}
            value={tPriority(contact.priority)}
          />
          <DetailField
            label={tFields("createdAt")}
            value={<FormatTime value={contact.createdAt} variant="dateLong" />}
          />
          <DetailField
            label={tFields("subject")}
            value={contact.subject}
            span
          />
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              {tFields("message")}
            </dt>
            <dd className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {contact.message}
            </dd>
          </div>
        </dl>
      </div>
    </>
  );
};

export default MyContactDetailContent;
