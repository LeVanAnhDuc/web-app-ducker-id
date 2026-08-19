// types
import type {
  PaymentMethodMock,
  InvoiceMock,
  UsageStatMock
} from "@/types/Billing";
// libs
import { CreditCard } from "lucide-react";
// others
import CONSTANTS from "@/constants";

const { PAYMENT_BRAND, INVOICE_STATUS } = CONSTANTS;

export const PAYMENT_METHODS_MOCK: readonly PaymentMethodMock[] = [
  {
    id: "pm-1",
    brand: PAYMENT_BRAND.VISA,
    brandLabel: "Visa",
    last4: "4242",
    expires: "08/2027",
    isDefault: true,
    icon: CreditCard
  },
  {
    id: "pm-2",
    brand: PAYMENT_BRAND.MASTERCARD,
    brandLabel: "Mastercard",
    last4: "1956",
    expires: "11/2026",
    isDefault: false,
    icon: CreditCard
  }
] as const;

export const INVOICES_MOCK: readonly InvoiceMock[] = [
  {
    id: "inv-1",
    date: "May 1, 2026",
    description: "Pro Plan — Monthly",
    amount: "$12.00",
    status: INVOICE_STATUS.PAID
  },
  {
    id: "inv-2",
    date: "Apr 1, 2026",
    description: "Pro Plan — Monthly",
    amount: "$12.00",
    status: INVOICE_STATUS.PAID
  },
  {
    id: "inv-3",
    date: "Mar 1, 2026",
    description: "Pro Plan — Monthly",
    amount: "$12.00",
    status: INVOICE_STATUS.PENDING
  },
  {
    id: "inv-4",
    date: "Feb 1, 2026",
    description: "Pro Plan — Monthly",
    amount: "$12.00",
    status: INVOICE_STATUS.PAID
  }
] as const;

export const USAGE_STATS_MOCK: readonly UsageStatMock[] = [
  { key: "totalPatches", value: "8", ratio: 0.32 },
  { key: "totalBranches", value: "3", ratio: 0.6 },
  { key: "apiCalls", value: "8.4k", ratio: 0.84 }
] as const;
