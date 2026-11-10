-- ==============================================================================
-- MIGRASI SUPABASE: DUKUNGAN API KEY DEEPSEEK RESMI (https://platform.deepseek.com/api_keys)
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor Supabase Dashboard Anda.
-- ==============================================================================

ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS deepseek_token TEXT;

-- Pastikan izin akses update tetap aktif untuk kolom baru
COMMENT ON COLUMN public.app_settings.deepseek_token IS 'API Key DeepSeek Official Direct dari https://platform.deepseek.com/api_keys';

