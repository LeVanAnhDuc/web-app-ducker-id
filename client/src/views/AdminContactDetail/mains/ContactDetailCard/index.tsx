"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { ContactStatus } from "@/types/ContactAdmin";
// components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import CustomBadge from "@/components/CustomBadge";
import CustomSelectTrigger from "@/components/CustomSelectTrigger";
import ContactDetailSkeleton from "../../components/ContactDetailSkeleton";
import FormatTime from "@/components/FormatTime";
// hooks
import { useAnnounce } from "@/hooks";
import useAdminContactDetail from "../../hooks/useAdminContactDetail";
import useUpdateContactStatus from "../../hooks/useUpdateContactStatus";
// dataSources
import { CONTACT_STATUS_VARIANT } from "@/dataSources/ContactAdmin";
// others
import CONSTANTS from "@/constants";

const ContactDetailCard = ({ id }: { id: string }) => {
  const t = useTranslations("contactAdmin.admin.detail");
  const tStatus = useTranslations("contactAdmin.admin.list.status");
  const tAnnounce = useTranslations("contactAdmin.announce");
  const { announce } = useAnnounce();

  const { data: contact, isLoading } = useAdminContactDetail(id);
  const updateMutation = useUpdateContactStatus(id);

  const handleStatusChange = (status: ContactStatus) => {
    announce(tAnnounce("statusUpdating"));
    updateMutation.mutate(status, {
      onSuccess: () => announce(tAnnounce("statusUpdated")),
      onError: () => announce(tAnnounce("statusError"))
    });
  };

  if (isLoading) return <ContactDetailSkeleton />;
  if (!contact) return null;

  return (
    <div className="bg-card rounded-xl border p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-mono text-lg font-bold">{contact._id}</h2>
          <p className="text-muted-foreground text-sm">
            <FormatTime value={contact.createdAt} variant="datetime" />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CustomBadge
            variant={CONTACT_STATUS_VARIANT[contact.status]}
            className="text-sm"
          >
            {tStatus(contact.status)}
          </CustomBadge>
          <Select
            value={contact.status}
            onValueChange={(v) => handleStatusChange(v as ContactStatus)}
            disabled={updateMutation.isPending}
          >
            <CustomSelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("updateStatus.label")} />
            </CustomSelectTrigger>
            <SelectContent>
              <SelectItem value={CONSTANTS.CONTACT_STATUS.NEW}>
                {tStatus("new")}
              </SelectItem>
              <SelectItem value={CONSTANTS.CONTACT_STATUS.PROCESSING}>
                {tStatus("processing")}
              </SelectItem>
              <SelectItem value={CONSTANTS.CONTACT_STATUS.RESOLVED}>
                {tStatus("resolved")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {contact.email && (
          <div>
            <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t("fields.email")}
            </dt>
            <dd className="mt-1 text-sm">{contact.email}</dd>
          </div>
        )}
        {contact.userId && (
          <div>
            <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t("fields.userId")}
            </dt>
            <dd className="mt-1 font-mono text-xs">{contact.userId}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t("fields.ipAddress")}
          </dt>
          <dd className="mt-1 font-mono text-xs">{contact.ipAddress}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t("fields.updatedAt")}
          </dt>
          <dd className="mt-1 text-sm">
            <FormatTime value={contact.updatedAt} variant="datetime" />
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t("fields.subject")}
          </dt>
          <dd className="mt-1 text-sm font-medium">{contact.subject}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            {t("fields.message")}
          </dt>
          <dd className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
            {contact.message}
          </dd>
        </div>
      </dl>
    </div>
  );
};

export default ContactDetailCard;
