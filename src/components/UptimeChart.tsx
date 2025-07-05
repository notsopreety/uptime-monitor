import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Activity } from "lucide-react";

interface UptimeCheck {
  id: string;
  status: string;
  response_time?: number;
  status_code?: number;
  error_message?: string;
  checked_at: string;
}

interface Website {
  id: string;
  name: string;
  url: string;
  check_interval: number;
  is_active: boolean;
  created_at: string;
  uptime_checks?: UptimeCheck[];
}

interface UptimeChartProps {
  websites: Website[];
}

export const UptimeChart = ({ websites }: UptimeChartProps) => {
  const getChartData = () => {
    const allChecks = websites.flatMap(website => 
      (website.uptime_checks || []).map(check => ({
        ...check,
        websiteName: website.name
      }))
    );

    // Group by hour for the last 24 hours
    const now = new Date();
    const last24Hours = Array.from({ length: 24 }, (_, i) => {
      const time = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      const hour = time.getHours();
      const timeStr = time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      const hourChecks = allChecks.filter(check => {
        const checkTime = new Date(check.checked_at);
        return checkTime.getHours() === hour && 
               checkTime.getDate() === time.getDate();
      });

      const upCount = hourChecks.filter(c => c.status === 'up').length;
      const downCount = hourChecks.filter(c => c.status === 'down').length;
      const errorCount = hourChecks.filter(c => c.status === 'error').length;
      const total = hourChecks.length;
      
      const avgResponseTime = hourChecks
        .filter(c => c.response_time && c.status === 'up')
        .reduce((sum, c, _, arr) => sum + (c.response_time || 0) / arr.length, 0);

      return {
        time: timeStr,
        uptime: total > 0 ? Math.round((upCount / total) * 100) : null,
        up: upCount,
        down: downCount,
        error: errorCount,
        total,
        avgResponseTime: avgResponseTime > 0 ? Math.round(avgResponseTime) : null
      };
    });

    return last24Hours;
  };

  const chartData = getChartData();
  const hasData = chartData.some(d => d.total > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Uptime Analytics
          </CardTitle>
          <CardDescription>24-hour uptime and response time trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No data available</h3>
            <p className="text-muted-foreground">
              Charts will appear after your first uptime checks are completed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Uptime Percentage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Uptime Percentage</CardTitle>
          <CardDescription>Hourly uptime percentage for the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 100]}
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: number) => [`${value}%`, 'Uptime']}
              />
              <Line 
                type="monotone" 
                dataKey="uptime" 
                stroke="hsl(var(--status-up))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--status-up))', strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Response Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time</CardTitle>
          <CardDescription>Average response time per hour (milliseconds)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: number) => [`${value}ms`, 'Avg Response Time']}
              />
              <Bar 
                dataKey="avgResponseTime" 
                fill="hsl(var(--chart-info))" 
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};