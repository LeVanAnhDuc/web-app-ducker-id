// components
import PageHeader from "./mains/PageHeader";
import CurrentPlanCard from "./mains/CurrentPlanCard";
import PaymentMethodCard from "./mains/PaymentMethodCard";
import BillingHistoryCard from "./mains/BillingHistoryCard";
import UsageCard from "./mains/UsageCard";

const Billing = () => (
  <div className="flex flex-col gap-6">
    <PageHeader />
    <CurrentPlanCard />
    <PaymentMethodCard />
    <BillingHistoryCard />
    <UsageCard />
  </div>
);

export default Billing;
