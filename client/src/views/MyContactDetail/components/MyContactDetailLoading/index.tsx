// components
import MyContactDetailSkeleton from "../MyContactDetailSkeleton";
// ghosts
import MyContactDetailAnnouncer from "../../ghosts/MyContactDetailAnnouncer";

const MyContactDetailLoading = () => (
  <>
    <MyContactDetailAnnouncer isLoading hasData={false} isError={false} />
    <MyContactDetailSkeleton />
  </>
);

export default MyContactDetailLoading;
