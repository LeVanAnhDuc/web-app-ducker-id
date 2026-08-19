// components
import OverviewHeader from "./mains/OverviewHeader";
import OverviewGrid from "./mains/OverviewGrid";

const AdminDashboard = () => (
  <div className="flex flex-col gap-6">
    <OverviewHeader />
    <OverviewGrid />
  </div>
);

export default AdminDashboard;
