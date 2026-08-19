"use client";

// libs
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader
} from "@/components/ui/card";
import CardSectionTitle from "@/components/CardSectionTitle";
import CustomButton from "@/components/CustomButton";
import PaymentMethodRow from "../../components/PaymentMethodRow";
// others
import { PAYMENT_METHODS_MOCK } from "@/mocks/Billing";

const PaymentMethodCard = () => {
  const t = useTranslations("billing.paymentMethod");

  return (
    <Card aria-labelledby="payment-title">
      <CardHeader className="border-b">
        <CardSectionTitle id="payment-title">{t("title")}</CardSectionTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
          <CustomButton
            variant="outline"
            iconLeft={<Plus className="size-3.5" aria-hidden="true" />}
          >
            {t("buttons.add")}
          </CustomButton>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {PAYMENT_METHODS_MOCK.map((method) => (
          <PaymentMethodRow
            key={method.id}
            icon={method.icon}
            brandLabel={method.brandLabel}
            endingLabel={t("ending", { last4: method.last4 })}
            expiresLabel={t("expiresAt", { expires: method.expires })}
            defaultLabel={t("default")}
            isDefault={method.isDefault}
            editLabel={t("buttons.edit")}
            onEdit={() => {}}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodCard;
