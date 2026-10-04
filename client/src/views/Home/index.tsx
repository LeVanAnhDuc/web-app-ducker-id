"use client";

// components
import GreetingSection from "./mains/GreetingSection";
import StatsSection from "./mains/StatsSection";
import ActivitySection from "./mains/ActivitySection";
import BreakdownSection from "./mains/BreakdownSection";
import TopAppsSection from "./mains/TopAppsSection";
import QuickAccessSection from "./mains/QuickAccessSection";
import RecommendedSection from "./mains/RecommendedSection";
// hooks
import {
  useActivityRange,
  useLoginStats,
  useRecentAppsStats
} from "./hooks/useActivityStats";

/**
 * The two queries are kept here rather than inside each section: the cards,
 * the chart and the breakdown all read the same two responses, and fetching
 * per section would ask for the same range three times.
 */
const Home = () => {
  const [range, setRange] = useActivityRange();
  const loginStats = useLoginStats(range);
  const appStats = useRecentAppsStats();

  return (
    <div className="flex flex-col gap-6">
      <GreetingSection totalApps={appStats.data?.totalApps ?? 0} />
      <StatsSection
        appStats={appStats.data}
        loginStats={loginStats.data}
        isLoading={loginStats.isLoading || appStats.isLoading}
      />
      <ActivitySection
        stats={loginStats.data}
        isLoading={loginStats.isLoading}
        isFetching={loginStats.isFetching}
        isError={loginStats.isError}
        range={range}
        onRangeChange={setRange}
      />
      <BreakdownSection
        stats={loginStats.data}
        isLoading={loginStats.isLoading}
      />
      <TopAppsSection stats={appStats.data} isLoading={appStats.isLoading} />
      <QuickAccessSection />
      <RecommendedSection />
    </div>
  );
};

export default Home;
