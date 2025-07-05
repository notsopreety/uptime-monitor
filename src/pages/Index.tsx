import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Activity, Globe, Clock, TrendingUp } from "lucide-react";
import { AddWebsiteDialog } from "@/components/AddWebsiteDialog";
import { WebsiteStatusCard } from "@/components/WebsiteStatusCard";
import { UptimeChart } from "@/components/UptimeChart";

interface Website {
  id: string;
  name: string;
  url: string;
  check_interval: number;
  is_active: boolean;
  created_at: string;
  uptime_checks?: UptimeCheck[];
}

interface UptimeCheck {
  id: string;
  status: string;
  response_time?: number;
  status_code?: number;
  error_message?: string;
  checked_at: string;
}

const Index = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const fetchWebsites = async () => {
    try {
      const { data, error } = await supabase
        .from('websites')
        .select(`
          *,
          uptime_checks:uptime_checks(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebsites(data || []);
    } catch (error) {
      console.error('Error fetching websites:', error);
      toast({
        title: "Error",
        description: "Failed to load websites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runUptimeCheck = async () => {
    try {
      toast({
        title: "Running uptime checks...",
        description: "Checking all active websites",
      });

      const { data, error } = await supabase.functions.invoke('check-uptime');
      
      if (error) throw error;
      
      toast({
        title: "Uptime check completed",
        description: `Checked ${data.summary?.total || 0} websites`,
      });
      
      // Refresh the data
      fetchWebsites();
    } catch (error) {
      console.error('Error running uptime check:', error);
      toast({
        title: "Error",
        description: "Failed to run uptime check",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchWebsites();

    // Set up real-time subscriptions
    const websitesChannel = supabase
      .channel('websites_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'websites'
      }, () => {
        fetchWebsites();
      })
      .subscribe();

    const checksChannel = supabase
      .channel('checks_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'uptime_checks'
      }, () => {
        fetchWebsites();
      })
      .subscribe();

    // Automatic uptime checking every 5 minutes
    const runAutomaticCheck = async () => {
      try {
        await supabase.functions.invoke('check-uptime');
      } catch (error) {
        console.error('Automatic check failed:', error);
      }
    };

    // Run initial check after 5 seconds
    const initialCheckTimer = setTimeout(runAutomaticCheck, 5000);
    
    // Then run every 5 minutes
    const automaticCheckInterval = setInterval(runAutomaticCheck, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(websitesChannel);
      supabase.removeChannel(checksChannel);
      clearTimeout(initialCheckTimer);
      clearInterval(automaticCheckInterval);
    };
  }, []);

  const getTotalStats = () => {
    const total = websites.length;
    const active = websites.filter(w => w.is_active).length;
    const recentChecks = websites.flatMap(w => w.uptime_checks || [])
      .filter(check => {
        const checkTime = new Date(check.checked_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return checkTime > oneHourAgo;
      });
    
    const upCount = recentChecks.filter(c => c.status === 'up').length;
    const downCount = recentChecks.filter(c => c.status === 'down').length;
    const errorCount = recentChecks.filter(c => c.status === 'error').length;

    return { total, active, upCount, downCount, errorCount, recentChecks: recentChecks.length };
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 animate-pulse text-primary" />
          <span className="text-lg">Loading monitoring dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              Uptime Monitor
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time website monitoring dashboard
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={runUptimeCheck} variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Run Check Now
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Website
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <div className="h-2 w-2 bg-status-up rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-up">{stats.upCount}</div>
              <p className="text-xs text-muted-foreground">
                Last hour checks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
              <div className="h-2 w-2 bg-status-down rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-down">{stats.downCount}</div>
              <p className="text-xs text-muted-foreground">
                Last hour checks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <div className="h-2 w-2 bg-status-warning rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-warning">{stats.errorCount}</div>
              <p className="text-xs text-muted-foreground">
                Last hour checks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.recentChecks > 0 
                  ? `${Math.round((stats.upCount / stats.recentChecks) * 100)}%`
                  : "N/A"
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Last hour average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Uptime Chart */}
        <UptimeChart websites={websites} />

        {/* Websites List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Monitored Websites</h2>
          {websites.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No websites monitored yet</h3>
                <p className="text-muted-foreground mb-4 text-center">
                  Add your first website to start monitoring its uptime status
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Website
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {websites.map((website) => (
                <WebsiteStatusCard
                  key={website.id}
                  website={website}
                  onUpdate={fetchWebsites}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddWebsiteDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchWebsites}
      />
    </div>
  );
};

export default Index;