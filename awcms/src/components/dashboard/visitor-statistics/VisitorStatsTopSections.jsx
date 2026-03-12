import VisitorStatsTopListCard from '@/components/dashboard/visitor-statistics/VisitorStatsTopListCard';

function VisitorStatsTopSections({ summary, formatNumber }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <VisitorStatsTopListCard
          title="Top Pages"
          description="Most viewed pages in the last 30 days."
          items={summary.topPages}
          emptyLabel="No page view data yet."
          suffix=" views"
          formatNumber={formatNumber}
        />

        <VisitorStatsTopListCard
          title="Top Referrers"
          description="Leading sources over the last week."
          items={summary.topReferrers}
          emptyLabel="No referrer data yet."
          suffix=""
          formatNumber={formatNumber}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <VisitorStatsTopListCard
          title="Device Mix"
          description="Recent device breakdown."
          items={summary.topDevices}
          emptyLabel="No device data yet."
          suffix=""
          formatNumber={formatNumber}
        />

        <VisitorStatsTopListCard
          title="Top Countries"
          description="Most active regions."
          items={summary.topCountries}
          emptyLabel="No country data yet."
          suffix=""
          formatNumber={formatNumber}
        />

        <VisitorStatsTopListCard
          title="Consent Status"
          description="Latest consent responses."
          items={summary.consentStates}
          emptyLabel="No consent data yet."
          suffix=""
          formatNumber={formatNumber}
        />
      </div>
    </>
  );
}

export default VisitorStatsTopSections;
