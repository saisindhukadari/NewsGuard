
CREATE TABLE public.analysis_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('url','text')),
  source_url TEXT,
  title TEXT,
  excerpt TEXT,
  summary TEXT,
  credibility_score INTEGER NOT NULL CHECK (credibility_score BETWEEN 0 AND 100),
  category TEXT NOT NULL CHECK (category IN ('reliable','mostly_reliable','suspicious','potentially_fake')),
  explanation TEXT,
  claims JSONB NOT NULL DEFAULT '[]'::jsonb,
  indicators JSONB NOT NULL DEFAULT '{}'::jsonb,
  tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  bookmarked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_reports TO authenticated;
GRANT ALL ON public.analysis_reports TO service_role;

ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reports" ON public.analysis_reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reports" ON public.analysis_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reports" ON public.analysis_reports
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reports" ON public.analysis_reports
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_reports_user_created ON public.analysis_reports(user_id, created_at DESC);
CREATE INDEX idx_reports_user_bookmarked ON public.analysis_reports(user_id, bookmarked) WHERE bookmarked = true;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.analysis_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
