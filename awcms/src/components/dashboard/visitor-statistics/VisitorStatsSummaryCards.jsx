import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function VisitorStatsSummaryCards({ summary, summaryLoading, formatNumber }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Page Views (30d)</CardDescription>
          <CardTitle className="text-2xl">
            {summaryLoading ? '...' : formatNumber(summary.pageViews)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Unique Visitors (30d)</CardDescription>
          <CardTitle className="text-2xl">
            {summaryLoading ? '...' : formatNumber(summary.uniqueVisitors)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Sessions (30d)</CardDescription>
          <CardTitle className="text-2xl">
            {summaryLoading ? '...' : formatNumber(summary.uniqueSessions)}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

export default VisitorStatsSummaryCards;
