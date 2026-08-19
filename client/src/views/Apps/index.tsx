// types
import type { UserCategory } from "@/types/Apps";
// components
import AppsBoard from "./mains/AppsBoard";

const Apps = ({ categories }: { categories: UserCategory[] | null }) => (
  <AppsBoard categories={categories} />
);

export default Apps;
