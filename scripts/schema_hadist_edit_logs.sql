-- Migration tabel hadist_edit_logs untuk mencatat audit log riwayat penyuntingan hadist brosur
CREATE TABLE IF NOT EXISTS public.hadist_edit_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    hadist_id TEXT,
    hadist_title TEXT,
    rawi_kitab TEXT,
    editor_name TEXT NOT NULL,
    editor_email TEXT NOT NULL,
    field_changes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hadist_edit_logs_created_at ON public.hadist_edit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hadist_edit_logs_hadist_id ON public.hadist_edit_logs(hadist_id);

ALTER TABLE public.hadist_edit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on hadist_edit_logs" 
ON public.hadist_edit_logs FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on hadist_edit_logs" 
ON public.hadist_edit_logs FOR INSERT WITH CHECK (true);
