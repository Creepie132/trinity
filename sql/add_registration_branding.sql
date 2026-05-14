-- Добавляем поля для кастомизации страницы онлайн-регистрации
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS registration_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS registration_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS registration_photo_url TEXT;
