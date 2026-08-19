// types
import type { LucideIcon } from "lucide-react";
// constants
import type PAYMENT_BRAND from "@/constants/paymentBrand";
import type INVOICE_STATUS from "@/constants/invoiceStatus";

export type PaymentBrand = (typeof PAYMENT_BRAND)[keyof typeof PAYMENT_BRAND];
export type InvoiceStatus =
  (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export interface PaymentMethodMock {
  id: string;
  brand: PaymentBrand;
  brandLabel: string;
  last4: string;
  expires: string;
  isDefault: boolean;
  icon: LucideIcon;
}

export interface InvoiceMock {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: InvoiceStatus;
}

export interface UsageStatMock {
  key: "totalPatches" | "totalBranches" | "apiCalls";
  value: string;
  ratio: number;
}
