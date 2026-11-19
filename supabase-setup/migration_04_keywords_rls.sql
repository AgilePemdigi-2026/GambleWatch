-- Migration 04: RLS Policy untuk tabel public.keywords
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for keywords" ON public.keywords;
CREATE POLICY "Enable all access for keywords"
ON public.keywords
FOR ALL
USING (true)
WITH CHECK (true);