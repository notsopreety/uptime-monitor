-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own websites" ON public.websites;
DROP POLICY IF EXISTS "Users can create their own websites" ON public.websites;
DROP POLICY IF EXISTS "Users can update their own websites" ON public.websites;
DROP POLICY IF EXISTS "Users can delete their own websites" ON public.websites;
DROP POLICY IF EXISTS "Users can view checks for their websites" ON public.uptime_checks;
DROP POLICY IF EXISTS "System can insert uptime checks" ON public.uptime_checks;

-- Create public policies for websites
CREATE POLICY "Anyone can view websites" 
ON public.websites 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create websites" 
ON public.websites 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update websites" 
ON public.websites 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete websites" 
ON public.websites 
FOR DELETE 
USING (true);

-- Create public policies for uptime_checks
CREATE POLICY "Anyone can view uptime checks" 
ON public.uptime_checks 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert uptime checks" 
ON public.uptime_checks 
FOR INSERT 
WITH CHECK (true);

-- Remove user_id requirement from websites table
ALTER TABLE public.websites ALTER COLUMN user_id DROP NOT NULL;