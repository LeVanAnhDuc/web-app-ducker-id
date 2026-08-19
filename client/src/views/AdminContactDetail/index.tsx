// components
import AdminContactDetailHeader from "./mains/AdminContactDetailHeader";
import ContactDetailCard from "./mains/ContactDetailCard";
import ContactAttachments from "./mains/ContactAttachments";

const AdminContactDetail = ({ id }: { id: string }) => (
  <div className="flex flex-col gap-6">
    <AdminContactDetailHeader id={id} />
    <ContactDetailCard id={id} />
    <ContactAttachments id={id} />
  </div>
);

export default AdminContactDetail;
