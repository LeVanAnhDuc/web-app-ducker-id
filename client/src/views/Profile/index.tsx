// components
import PageHeader from "./mains/PageHeader";
import ProfileCard from "./mains/ProfileCard";
import PersonalInfoCard from "./mains/PersonalInfoCard";
import ChangePasswordCard from "./mains/ChangePasswordCard";
import DangerZoneCard from "./mains/DangerZoneCard";

const Profile = () => (
  <div className="flex flex-col gap-6">
    <PageHeader />
    <ProfileCard />
    <PersonalInfoCard />
    <ChangePasswordCard />
    <DangerZoneCard />
  </div>
);

export default Profile;
