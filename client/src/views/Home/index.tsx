// components
import GreetingSection from "./mains/GreetingSection";
import QuickAccessSection from "./mains/QuickAccessSection";
import RecommendedSection from "./mains/RecommendedSection";

const Home = () => (
  <div className="flex flex-col gap-6">
    <GreetingSection />
    <QuickAccessSection />
    <RecommendedSection />
  </div>
);

export default Home;
