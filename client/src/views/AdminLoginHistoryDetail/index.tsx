// components
import AdminLoginHistoryDetailHeader from "./mains/AdminLoginHistoryDetailHeader";
import LoginHistoryDetailCard from "./mains/LoginHistoryDetailCard";

const AdminLoginHistoryDetail = ({ id }: { id: string }) => (
  <div className="flex flex-col gap-6">
    <AdminLoginHistoryDetailHeader />
    <LoginHistoryDetailCard id={id} />
  </div>
);

export default AdminLoginHistoryDetail;
