import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function VisitorStatsHeaderActions({
  summaryLoading,
  eventsLoading,
  onRefresh,
}) {
  const loading = summaryLoading || eventsLoading;

  return (
    <Button
      variant="outline"
      onClick={onRefresh}
      disabled={loading}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </Button>
  );
}

export default VisitorStatsHeaderActions;
