/**
 * DeviceCard Component
 * Display ESP32 device status card
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cpu, Wifi, WifiOff, MoreVertical, Trash2, Settings, Eye } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function DeviceCard({ device, onView, onEdit, onDelete }) {
    const isOnline = device.is_online;
    const lastSeen = device.last_seen
        ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })
        : 'Never';

    return (
        <Card className={cn(
            "transition-all hover:shadow-lg",
            isOnline ? "border-green-500/50" : "border-muted"
        )}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-full",
                            isOnline ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                        )}>
                            <Cpu className={cn(
                                "h-5 w-5",
                                isOnline ? "text-green-600" : "text-muted-foreground"
                            )} />
                        </div>
                        <div>
                            <CardTitle className="text-base">
                                {device.device_name || device.device_id}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                                {device.device_id}
                            </p>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView?.(device)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit?.(device)}>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onDelete?.(device)}
                                className="text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent>
                <div className="space-y-3">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant={isOnline ? "default" : "secondary"}>
                            {isOnline ? (
                                <><Wifi className="mr-1 h-3 w-3" /> Online</>
                            ) : (
                                <><WifiOff className="mr-1 h-3 w-3" /> Offline</>
                            )}
                        </Badge>
                    </div>

                    {/* IP Address */}
                    {device.ip_address && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">IP</span>
                            <span className="text-sm font-mono">{device.ip_address}</span>
                        </div>
                    )}

                    {/* Firmware */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Firmware</span>
                        <span className="text-sm">v{device.firmware_version || '1.0.0'}</span>
                    </div>

                    {/* Last Seen */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Seen</span>
                        <span className="text-sm">{lastSeen}</span>
                    </div>
                </div>

                {/* View Button */}
                <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => onView?.(device)}
                >
                    View Sensors
                </Button>
            </CardContent>
        </Card>
    );
}

export default DeviceCard;
