/**
 * SensorChart Component
 * Realtime sensor data visualization
 */

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function SensorChart({ data, title = 'Sensor Data', type = 'all' }) {
    const chartConfig = useMemo(() => {
        switch (type) {
            case 'gas':
                return {
                    lines: [{ key: 'gas_ppm', color: '#ef4444', name: 'Gas (PPM)' }],
                    yDomain: [0, 1500],
                };
            case 'temperature':
                return {
                    lines: [{ key: 'temperature', color: '#f97316', name: 'Temperature (°C)' }],
                    yDomain: [0, 50],
                };
            case 'humidity':
                return {
                    lines: [{ key: 'humidity', color: '#3b82f6', name: 'Humidity (%)' }],
                    yDomain: [0, 100],
                };
            default:
                return {
                    lines: [
                        { key: 'gas_ppm', color: '#ef4444', name: 'Gas (PPM)' },
                        { key: 'temperature', color: '#f97316', name: 'Temp (°C)' },
                        { key: 'humidity', color: '#3b82f6', name: 'Humidity (%)' },
                    ],
                    yDomain: [0, 'auto'],
                };
        }
    }, [type]);

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                    No sensor data available
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="time" className="text-xs" />
                        <YAxis domain={chartConfig.yDomain} className="text-xs" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                            }}
                        />
                        <Legend />
                        {chartConfig.lines.map((line) => (
                            <Line
                                key={line.key}
                                type="monotone"
                                dataKey={line.key}
                                stroke={line.color}
                                name={line.name}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export default SensorChart;
