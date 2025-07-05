import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Globe, 
  Clock, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  MoreVertical,
  Trash2,
  Pause,
  Play
} from "lucide-react";

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

interface WebsiteStatusCardProps {
  website: Website;
  onUpdate: () => void;
}

export const WebsiteStatusCard = ({ website, onUpdate }: WebsiteStatusCardProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getStatusInfo = () => {
    if (!website.uptime_checks || website.uptime_checks.length === 0) {
      return {
        status: 'unknown',
        icon: AlertCircle,
        color: 'status-unknown',
        text: 'No checks yet'
      };
    }

    const latestCheck = website.uptime_checks[0];
    
    switch (latestCheck.status) {
      case 'up':
        return {
          status: 'up',
          icon: CheckCircle,
          color: 'status-up',
          text: 'Online'
        };
      case 'down':
        return {
          status: 'down',
          icon: XCircle,
          color: 'status-down',
          text: 'Offline'
        };
      case 'error':
        return {
          status: 'error',
          icon: AlertCircle,
          color: 'status-warning',
          text: 'Error'
        };
      default:
        return {
          status: 'unknown',
          icon: AlertCircle,
          color: 'status-unknown',
          text: 'Unknown'
        };
    }
  };

  const getUptimePercentage = () => {
    if (!website.uptime_checks || website.uptime_checks.length === 0) {
      return null;
    }

    const last24Hours = website.uptime_checks.filter(check => {
      const checkTime = new Date(check.checked_at);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return checkTime > oneDayAgo;
    });

    if (last24Hours.length === 0) return null;

    const upCount = last24Hours.filter(check => check.status === 'up').length;
    return Math.round((upCount / last24Hours.length) * 100);
  };

  const getAverageResponseTime = () => {
    if (!website.uptime_checks || website.uptime_checks.length === 0) {
      return null;
    }

    const recentChecks = website.uptime_checks
      .filter(check => check.response_time && check.status === 'up')
      .slice(0, 10); // Last 10 successful checks

    if (recentChecks.length === 0) return null;

    const avgTime = recentChecks.reduce((sum, check) => sum + (check.response_time || 0), 0) / recentChecks.length;
    return Math.round(avgTime);
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${website.name}"?`)) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', website.id);

      if (error) throw error;

      toast({
        title: "Website deleted",
        description: `${website.name} has been removed`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error deleting website:', error);
      toast({
        title: "Error",
        description: "Failed to delete website",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('websites')
        .update({ is_active: !website.is_active })
        .eq('id', website.id);

      if (error) throw error;

      toast({
        title: website.is_active ? "Monitoring paused" : "Monitoring resumed",
        description: `${website.name} is now ${website.is_active ? 'paused' : 'active'}`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error toggling website status:', error);
      toast({
        title: "Error",
        description: "Failed to update website status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const uptimePercentage = getUptimePercentage();
  const avgResponseTime = getAverageResponseTime();

  return (
    <Card className={`transition-all ${!website.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <StatusIcon className={`h-5 w-5 text-${statusInfo.color}`} />
          <div>
            <CardTitle className="text-lg">{website.name}</CardTitle>
            <CardDescription className="flex items-center space-x-1">
              <Globe className="h-3 w-3" />
              <span>{website.url}</span>
            </CardDescription>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            variant={statusInfo.status === 'up' ? 'default' : 'destructive'}
            className={`bg-${statusInfo.color} text-${statusInfo.color}-foreground`}
          >
            {statusInfo.text}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={loading}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggleActive}>
                {website.is_active ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Monitoring
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume Monitoring
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Website
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold">
              {uptimePercentage !== null ? `${uptimePercentage}%` : 'N/A'}
            </div>
            <div className="text-muted-foreground">24h Uptime</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold">
              {avgResponseTime !== null ? `${avgResponseTime}ms` : 'N/A'}
            </div>
            <div className="text-muted-foreground">Avg Response</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold flex items-center justify-center">
              <Clock className="h-3 w-3 mr-1" />
              {Math.floor(website.check_interval / 60)}m
            </div>
            <div className="text-muted-foreground">Check Interval</div>
          </div>
        </div>

        {website.uptime_checks && website.uptime_checks.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-2">Recent Checks</div>
            <div className="flex space-x-1">
              {website.uptime_checks.slice(0, 20).reverse().map((check, index) => (
                <div
                  key={check.id}
                  className={`h-2 w-2 rounded-full ${
                    check.status === 'up' ? 'bg-status-up' :
                    check.status === 'down' ? 'bg-status-down' :
                    'bg-status-warning'
                  }`}
                  title={`${check.status} - ${new Date(check.checked_at).toLocaleString()}${check.response_time ? ` (${check.response_time}ms)` : ''}`}
                />
              ))}
            </div>
          </div>
        )}

        {!website.is_active && (
          <div className="mt-4 p-2 bg-muted rounded text-sm text-muted-foreground text-center">
            Monitoring is paused
          </div>
        )}
      </CardContent>
    </Card>
  );
};