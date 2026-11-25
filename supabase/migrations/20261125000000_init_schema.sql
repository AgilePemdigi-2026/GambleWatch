-- Dibuat dari supabase-setup/schema.sql + migration_01/02/04 + supabase/schema.sql & keywords_admin.sql (policy).
--
-- PostgreSQL database dump (Cleaned for Supabase Studio SQL Editor)
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS public;



--
-- Name: keywords_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION public.keywords_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.keywords_set_updated_at() OWNER TO postgres;

SET default_tablespace = '';
SET default_table_access_method = heap;

--
-- Name: analysis_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analysis_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    site_url text NOT NULL,
    risk_level character varying(10),
    report_status character varying(50) DEFAULT 'STATUS: PENDING'::character varying,
    hasil_analisis text,
    url_pattern_analysis text,
    visual_similarity character varying(20),
    image_to_text_analysis text,
    keyword_analysis text,
    screenshots text[],
    CONSTRAINT analysis_reports_risk_level_check CHECK (((risk_level)::text = ANY (ARRAY[('HIGH'::character varying)::text, ('MEDIUM'::character varying)::text, ('LOW'::character varying)::text])))
);

ALTER TABLE public.analysis_reports OWNER TO postgres;

--
-- Name: feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback (
    id integer NOT NULL,
    user_id uuid,
    nama_pengirim character varying(100),
    email character varying(100),
    kategori character varying(50),
    pesan_masukan text NOT NULL,
    status character varying(50) DEFAULT 'Perlu Tindakan'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.feedback OWNER TO postgres;

CREATE SEQUENCE public.feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.feedback_id_seq OWNER TO postgres;
ALTER SEQUENCE public.feedback_id_seq OWNED BY public.feedback.id;

--
-- Name: keywords; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.keywords (
    id bigint NOT NULL,
    term text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    weight real DEFAULT 0.5 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    language text DEFAULT 'id'::text NOT NULL,
    variations text[] DEFAULT '{}'::text[],
    aliases text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT keywords_weight_check CHECK (((weight >= (0)::double precision) AND (weight <= (1)::double precision)))
);

ALTER TABLE public.keywords OWNER TO postgres;

ALTER TABLE public.keywords ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.keywords_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: laporan_analisis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.laporan_analisis (
    id integer NOT NULL,
    user_id uuid,
    url_situs text NOT NULL,
    skor_probabilitas double precision DEFAULT 0,
    tingkat_risiko character varying(20) DEFAULT 'LOW'::character varying,
    url_pattern_analysis text,
    visual_similarity text,
    ocr_flagged boolean DEFAULT false,
    keywords_found text,
    bukti_screenshot text,
    status character varying(50) DEFAULT 'PENDING'::character varying,
    catatan_admin text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    nomor_surat text,
    distribusi_otomatis boolean DEFAULT true,
    simpan_arsip boolean DEFAULT true,
    bukti_deteksi jsonb
);

ALTER TABLE public.laporan_analisis OWNER TO postgres;

CREATE SEQUENCE public.laporan_analisis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.laporan_analisis_id_seq OWNER TO postgres;
ALTER SEQUENCE public.laporan_analisis_id_seq OWNED BY public.laporan_analisis.id;

--
-- Name: web_scraping_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.web_scraping_log (
    id integer NOT NULL,
    url_situs text NOT NULL,
    waktu_scrape timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'SUCCESS'::character varying,
    data_ditemukan text,
    log_pesan text
);

ALTER TABLE public.web_scraping_log OWNER TO postgres;

CREATE SEQUENCE public.web_scraping_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.web_scraping_log_id_seq OWNER TO postgres;
ALTER SEQUENCE public.web_scraping_log_id_seq OWNED BY public.web_scraping_log.id;

--
-- Defaults, Primary Keys, Constraints, Triggers & Foreign Keys
--

ALTER TABLE ONLY public.feedback ALTER COLUMN id SET DEFAULT nextval('public.feedback_id_seq'::regclass);
ALTER TABLE ONLY public.laporan_analisis ALTER COLUMN id SET DEFAULT nextval('public.laporan_analisis_id_seq'::regclass);
ALTER TABLE ONLY public.web_scraping_log ALTER COLUMN id SET DEFAULT nextval('public.web_scraping_log_id_seq'::regclass);

ALTER TABLE ONLY public.analysis_reports ADD CONSTRAINT analysis_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.feedback ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.keywords ADD CONSTRAINT keywords_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.keywords ADD CONSTRAINT keywords_term_language_key UNIQUE (term, language);
ALTER TABLE ONLY public.laporan_analisis ADD CONSTRAINT laporan_analisis_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.web_scraping_log ADD CONSTRAINT web_scraping_log_pkey PRIMARY KEY (id);

CREATE TRIGGER keywords_set_updated_at BEFORE UPDATE ON public.keywords FOR EACH ROW EXECUTE FUNCTION public.keywords_set_updated_at();

ALTER TABLE ONLY public.analysis_reports ADD CONSTRAINT analysis_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.laporan_analisis ADD CONSTRAINT laporan_analisis_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

--
-- Permissions (Grants & Default Privileges)
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON FUNCTION public.keywords_set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.keywords_set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.keywords_set_updated_at() TO service_role;

GRANT ALL ON TABLE public.analysis_reports TO anon;
GRANT ALL ON TABLE public.analysis_reports TO authenticated;
GRANT ALL ON TABLE public.analysis_reports TO service_role;

GRANT ALL ON TABLE public.feedback TO anon;
GRANT ALL ON TABLE public.feedback TO authenticated;
GRANT ALL ON TABLE public.feedback TO service_role;

GRANT ALL ON SEQUENCE public.feedback_id_seq TO anon;
GRANT ALL ON SEQUENCE public.feedback_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.feedback_id_seq TO service_role;

GRANT ALL ON TABLE public.keywords TO anon;
GRANT ALL ON TABLE public.keywords TO authenticated;
GRANT ALL ON TABLE public.keywords TO service_role;

GRANT ALL ON SEQUENCE public.keywords_id_seq TO anon;
GRANT ALL ON SEQUENCE public.keywords_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.keywords_id_seq TO service_role;

GRANT ALL ON TABLE public.laporan_analisis TO anon;
GRANT ALL ON TABLE public.laporan_analisis TO authenticated;
GRANT ALL ON TABLE public.laporan_analisis TO service_role;

GRANT ALL ON SEQUENCE public.laporan_analisis_id_seq TO anon;
GRANT ALL ON SEQUENCE public.laporan_analisis_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.laporan_analisis_id_seq TO service_role;

GRANT ALL ON TABLE public.web_scraping_log TO anon;
GRANT ALL ON TABLE public.web_scraping_log TO authenticated;
GRANT ALL ON TABLE public.web_scraping_log TO service_role;

GRANT ALL ON SEQUENCE public.web_scraping_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.web_scraping_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.web_scraping_log_id_seq TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Storage Bucket & Policy (bukti-analisis)
--

INSERT INTO storage.buckets (id, name, public)
VALUES ('bukti-analisis', 'bukti-analisis', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow all operations on bukti-analisis" ON storage.objects;
CREATE POLICY "Allow all operations on bukti-analisis"
ON storage.objects FOR ALL
USING (bucket_id = 'bukti-analisis')
WITH CHECK (bucket_id = 'bukti-analisis');

-- ===== RLS (supabase-setup/migration_01, 02, 04) =====
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert feedback" ON public.feedback;
CREATE POLICY "Allow public insert feedback"
ON public.feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (true);;
DROP POLICY IF EXISTS "Enable all access for laporan_analisis" ON public.laporan_analisis;
CREATE POLICY "Enable all access for laporan_analisis"
ON public.laporan_analisis
FOR ALL
USING (true)
WITH CHECK (true);;
-- Migration 04: RLS Policy untuk tabel public.keywords
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for keywords" ON public.keywords;
CREATE POLICY "Enable all access for keywords"
ON public.keywords
FOR ALL
USING (true)
WITH CHECK (true);;

-- ===== Policy dari supabase/schema.sql & keywords_admin.sql =====
drop policy if exists "read active keywords" on public.keywords;
create policy "read active keywords" on public.keywords
  for select using (active = true);

drop policy if exists "admin manage keywords" on public.keywords;
create policy "admin manage keywords" on public.keywords
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
