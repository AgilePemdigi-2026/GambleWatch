ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert feedback" ON public.feedback;
CREATE POLICY "Allow public insert feedback"
ON public.feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (true);