import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Website {
  id: string;
  name: string;
  url: string;
  check_interval: number;
}

interface UptimeCheck {
  website_id: string;
  status: 'up' | 'down' | 'error';
  response_time?: number;
  status_code?: number;
  error_message?: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function checkWebsite(website: Website): Promise<UptimeCheck> {
  const startTime = Date.now();
  
  try {
    console.log(`Checking ${website.name} (${website.url})`);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(website.url, {
      method: 'HEAD', // Use HEAD to minimize bandwidth
      signal: controller.signal,
      headers: {
        'User-Agent': 'UptimeBot/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const check: UptimeCheck = {
      website_id: website.id,
      status: response.ok ? 'up' : 'down',
      response_time: responseTime,
      status_code: response.status,
    };
    
    if (!response.ok) {
      check.error_message = `HTTP ${response.status} ${response.statusText}`;
    }
    
    console.log(`✓ ${website.name}: ${check.status} (${responseTime}ms)`);
    return check;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout (30s)';
      } else {
        errorMessage = error.message;
      }
    }
    
    console.log(`✗ ${website.name}: error - ${errorMessage}`);
    
    return {
      website_id: website.id,
      status: 'error',
      response_time: responseTime,
      error_message: errorMessage,
    };
  }
}

async function performUptimeChecks() {
  try {
    // Fetch all active websites
    const { data: websites, error: fetchError } = await supabase
      .from('websites')
      .select('*')
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('Error fetching websites:', fetchError);
      return { error: 'Failed to fetch websites' };
    }
    
    if (!websites || websites.length === 0) {
      console.log('No active websites to check');
      return { message: 'No active websites found' };
    }
    
    console.log(`Found ${websites.length} websites to check`);
    
    // Check all websites in parallel
    const checkPromises = websites.map(website => checkWebsite(website));
    const results = await Promise.all(checkPromises);
    
    // Insert all results into database
    const { error: insertError } = await supabase
      .from('uptime_checks')
      .insert(results);
    
    if (insertError) {
      console.error('Error inserting check results:', insertError);
      return { error: 'Failed to save check results' };
    }
    
    const summary = {
      total: results.length,
      up: results.filter(r => r.status === 'up').length,
      down: results.filter(r => r.status === 'down').length,
      error: results.filter(r => r.status === 'error').length,
    };
    
    console.log('Check summary:', summary);
    return { success: true, summary };
    
  } catch (error) {
    console.error('Unexpected error during uptime checks:', error);
    return { error: 'Unexpected error occurred' };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const result = await performUptimeChecks();
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    
  } catch (error) {
    console.error("Error in uptime check function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);