"use client";

// components
import PageHeader from "./mains/PageHeader";
import NotificationList from "./mains/NotificationList";

const Notifications = () => (
  <div className="flex flex-col gap-6">
    <PageHeader />
    <NotificationList />
  </div>
);

export default Notifications;
