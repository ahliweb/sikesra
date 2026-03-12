
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal } from 'lucide-react';

// Mock logs for demonstration as we don't have a real log stream
const MOCK_LOGS = [
  { id: 1, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), level: 'info', message: 'System initialized' },
  { id: 2, timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), level: 'success', message: 'Extension "SEO Pro" loaded successfully' },
  { id: 3, timestamp: new Date(Date.now() - 1000 * 30).toISOString(), level: 'warning', message: 'High memory usage detected in background job' },
  { id: 4, timestamp: new Date().toISOString(), level: 'info', message: 'Checking for extension updates...' },
];

function ExtensionLogs() {
  const [logs] = useState(MOCK_LOGS);

  return (
    <Card className="h-full border-border/60 bg-card/75">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="h-5 w-5 text-primary" />
          System Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] p-4">
          <div className="space-y-2 font-mono text-sm">
            {logs.map(log => (
              <div key={log.id} className="flex gap-3 items-start">
                <span className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <div className="flex-1 break-all">
                  <span className={`
                         mr-2 uppercase text-[10px] font-bold px-1.5 py-0.5 rounded
                        ${log.level === 'info' ? 'border border-primary/20 bg-primary/10 text-primary' : ''}
                        ${log.level === 'success' ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : ''}
                        ${log.level === 'warning' ? 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-500' : ''}
                        ${log.level === 'error' ? 'border border-destructive/20 bg-destructive/10 text-destructive' : ''}
                     `}>
                    {log.level}
                  </span>
                  <span className="text-foreground">{log.message}</span>
                </div>
              </div>
            ))}
            <div className="mt-4 border-t border-dashed border-border/70 pt-2 text-xs text-muted-foreground">
              End of recent logs
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ExtensionLogs;
