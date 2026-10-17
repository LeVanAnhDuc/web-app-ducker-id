// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getMyProfile } from "@/requests/user";
// others
import CONSTANTS from "@/constants";

const useMyProfile = () =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.MY_PROFILE],
    queryFn: getMyProfile
  });

export default useMyProfile;
