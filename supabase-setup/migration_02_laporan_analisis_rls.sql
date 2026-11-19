DROP POLICY IF EXISTS "Enable all access for laporan_analisis" ON public.laporan_analisis;
CREATE POLICY "Enable all access for laporan_analisis"
ON public.laporan_analisis
FOR ALL
USING (true)
WITH CHECK (true);