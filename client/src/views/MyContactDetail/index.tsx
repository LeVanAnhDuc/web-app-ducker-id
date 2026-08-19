// components
import MyContactDetailHeader from "./mains/MyContactDetailHeader";
import MyContactDetailCard from "./mains/MyContactDetailCard";

const MyContactDetail = ({ id }: { id: string }) => (
  <div className="flex flex-col gap-6">
    <MyContactDetailHeader />
    <MyContactDetailCard id={id} />
  </div>
);

export default MyContactDetail;
