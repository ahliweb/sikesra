import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function VisitorStatsEventsTableCard({
  events,
  eventsLoading,
  searchQuery,
  onSearchChange,
  page,
  setPage,
  totalPages,
  totalCount,
  capitalize,
  getReferrerLabel,
  formatNumber,
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Recent Visits</CardTitle>
        <CardDescription>Latest visitor events with IP and page path.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by path, IP, or referrer"
              className="pl-9"
              value={searchQuery}
              onChange={(event) => {
                onSearchChange(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Page</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visitor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Device</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Country</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Referrer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Consent</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {eventsLoading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-muted-foreground">
                    Loading visitor events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-muted-foreground">
                    No visitor events found.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="transition-colors hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{event.path}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {event.ip_address || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {event.visitor_id ? `${event.visitor_id.slice(0, 8)}...` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {capitalize(event.device_type)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {event.country || '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getReferrerLabel(event.referrer)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {capitalize(event.consent_state || 'unknown')}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Showing {events.length} of {formatNumber(totalCount)} visits
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default VisitorStatsEventsTableCard;
