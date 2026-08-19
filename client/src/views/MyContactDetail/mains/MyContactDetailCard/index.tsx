"use client";

// components
import MyContactDetailLoading from "../../components/MyContactDetailLoading";
import MyContactDetailNotFound from "../../components/MyContactDetailNotFound";
import MyContactDetailContent from "../../components/MyContactDetailContent";
// hooks
import useMyContactById from "../../hooks/useMyContactById";

const MyContactDetailCard = ({ id }: { id: string }) => {
  const { data, isLoading, isError } = useMyContactById(id);

  if (isLoading) return <MyContactDetailLoading />;

  if (isError || !data) return <MyContactDetailNotFound />;

  return <MyContactDetailContent contact={data} />;
};

export default MyContactDetailCard;
