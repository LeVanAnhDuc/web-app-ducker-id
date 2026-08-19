// components
import LoginHistoryDetailSkeleton from "../LoginHistoryDetailSkeleton";
// ghosts
import LoginHistoryDetailAnnouncer from "../../ghosts/LoginHistoryDetailAnnouncer";

const LoginHistoryDetailLoading = () => (
  <>
    <LoginHistoryDetailAnnouncer
      isLoading={true}
      hasData={false}
      isError={false}
    />
    <LoginHistoryDetailSkeleton />
  </>
);

export default LoginHistoryDetailLoading;
