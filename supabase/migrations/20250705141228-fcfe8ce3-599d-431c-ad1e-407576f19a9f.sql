-- Create websites table to store monitored sites
CREATE TABLE public.websites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  check_interval INTEGER DEFAULT 300, -- seconds between checks (default 5 minutes)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create uptime_checks table to store check results
CREATE TABLE public.uptime_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  website_id UUID REFERENCES public.websites(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL, -- 'up', 'down', 'error'
  response_time INTEGER, -- milliseconds
  status_code INTEGER,
  error_message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uptime_checks ENABLE ROW LEVEL SECURITY;

-- Create policies for websites
CREATE POLICY "Users can view their own websites" 
ON public.websites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own websites" 
ON public.websites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own websites" 
ON public.websites 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own websites" 
ON public.websites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for uptime_checks
CREATE POLICY "Users can view checks for their websites" 
ON public.uptime_checks 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.websites 
  WHERE websites.id = uptime_checks.website_id 
  AND websites.user_id = auth.uid()
));

CREATE POLICY "System can insert uptime checks" 
ON public.uptime_checks 
FOR INSERT 
WITH CHECK (true); -- Allow system/edge functions to insert

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_websites_updated_at
  BEFORE UPDATE ON public.websites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_websites_user_id ON public.websites(user_id);
CREATE INDEX idx_websites_is_active ON public.websites(is_active);
CREATE INDEX idx_uptime_checks_website_id ON public.uptime_checks(website_id);
CREATE INDEX idx_uptime_checks_checked_at ON public.uptime_checks(checked_at DESC);

-- Enable realtime for both tables
ALTER TABLE public.websites REPLICA IDENTITY FULL;
ALTER TABLE public.uptime_checks REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.websites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.uptime_checks;