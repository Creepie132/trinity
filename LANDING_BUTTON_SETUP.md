# 🎨 Landing Button Styles Setup Guide

## Overview

Добавлены два стиля кнопки входа на лендинге:

1. **Orbit** - Вращающийся gradient border с пульсирующим glow (по умолчанию)
2. **Pulse** - Shimmer эффект с пульсирующим shadow

Стиль кнопки настраивается в админке и сохраняется в БД.

---

## 🗄️ Database Migration

### Шаг 1: Создать таблицу `landing_settings`

Открой Supabase SQL Editor и выполни:

```sql
-- Create landing_settings table
CREATE TABLE IF NOT EXISTS landing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login_button_style TEXT NOT NULL DEFAULT 'orbit' CHECK (login_button_style IN ('orbit', 'pulse')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO landing_settings (login_button_style)
VALUES ('orbit')
ON CONFLICT DO NOTHING;

-- Add RLS policies
ALTER TABLE landing_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings
CREATE POLICY "Anyone can read landing settings"
ON landing_settings
FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can update
CREATE POLICY "Only admins can update landing settings"
ON landing_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_landing_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER landing_settings_updated_at
BEFORE UPDATE ON landing_settings
FOR EACH ROW
EXECUTE FUNCTION update_landing_settings_updated_at();
```

**Готово!** Таблица создана.

---

## 🎯 How to Use

### 1. Настройка стиля (Admin)

1. Залогинься как админ
2. Перейди в **Admin → Settings → Landing Page Design**
3. Выбери стиль:
   - **Orbit** - вращающийся gradient border
   - **Pulse** - shimmer эффект
4. Нажми на карточку → настройка сохранится автоматически

### 2. Проверка на лендинге

1. Открой `/landing` (или корневую страницу)
2. Кнопка "כניסה למערכת ✨" / "Вход в систему ✨" использует выбранный стиль
3. Работает и на desktop, и на mobile

---

## 🎨 Styles Overview

### Orbit (Default)

**CSS:**
- Rotating `conic-gradient` border (amber → blue → purple → amber)
- CSS `@property --angle` для анимации от 0deg до 360deg
- Pulsating glow на hover
- Dark gradient background (gray-900 → gray-800)

**Animation:**
```css
@keyframes rotate-gradient {
  from { --angle: 0deg; }
  to { --angle: 360deg; }
}
```

**Duration:**
- Normal: 3s
- Hover: ускоряется, glow усиливается

---

### Pulse

**CSS:**
- Shimmer: горизонтальная световая полоса проходит по тексту
- Linear gradient `translateX(-100% → 100%)`
- Pulsating shadow (purple → blue)
- Dark gradient background (gray-900 → gray-800)

**Animation:**
```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes pulse-shadow {
  0%, 100% { box-shadow: ... (light); }
  50% { box-shadow: ... (strong); }
}
```

**Duration:**
- Normal: 2s
- Hover: ускоряется до 1s

---

## 🔧 Technical Details

### Files Changed

**NEW:**
- ✅ `supabase/create-landing-settings.sql` - DB migration
- ✅ `src/app/api/landing/settings/route.ts` - API endpoint (GET/PATCH)
- ✅ `src/app/admin/settings/landing/page.tsx` - Admin UI для выбора стиля
- ✅ `LANDING_BUTTON_SETUP.md` - Эта инструкция

**MODIFIED:**
- ✅ `src/app/globals.css` - CSS анимации (Orbit + Pulse)
- ✅ `src/components/landing/AnimatedLoginButton.tsx` - Поддержка обоих стилей
- ✅ `src/app/landing/page.tsx` - Загрузка стиля из API
- ✅ `src/app/admin/settings/page.tsx` - Ссылка на настройки лендинга

---

### API Endpoints

#### `GET /api/landing/settings`

**Response:**
```json
{
  "id": "uuid",
  "login_button_style": "orbit",
  "created_at": "2026-02-12T...",
  "updated_at": "2026-02-12T..."
}
```

**Access:** Public (authenticated + anon)

---

#### `PATCH /api/landing/settings`

**Request:**
```json
{
  "login_button_style": "pulse"
}
```

**Response:**
```json
{
  "id": "uuid",
  "login_button_style": "pulse",
  "updated_at": "2026-02-12T..."
}
```

**Access:** Admin only (checked via `admin_users` table)

---

## 🚀 Deployment

### Vercel (Production)

1. SQL миграция выполняется вручную в Supabase SQL Editor
2. Code push → Vercel автоматически деплоит
3. Настройка стиля через Admin → Settings → Landing Page Design

### Testing Locally

1. Запусти SQL миграцию в Supabase
2. `npm run dev`
3. Открой `/admin/settings/landing`
4. Выбери стиль
5. Проверь `/landing`

---

## ✅ Checklist

- [x] CSS анимации (Orbit + Pulse)
- [x] AnimatedLoginButton компонент с двумя стилями
- [x] Таблица `landing_settings` в БД
- [x] API endpoint `/api/landing/settings` (GET/PATCH)
- [x] Admin UI: `/admin/settings/landing`
- [x] Landing page читает стиль из API
- [x] Bilingual support (Hebrew/Russian)
- [x] Mobile responsive (full width на мобильных)
- [x] Sparkle emoji ✨ в тексте кнопки

---

## 🎯 Future Enhancements

**Planned:**
- [ ] Dark mode toggle для лендинга (отдельная настройка)
- [ ] Custom colors для Orbit gradient (picker в админке)
- [ ] Animation speed control (fast/normal/slow)
- [ ] Preview обоих стилей прямо в админке (live demo)
- [ ] Export/import landing settings (JSON)

---

## 📝 Notes

**Orbit vs Pulse:**
- **Orbit** - более премиальный, привлекает внимание вращением
- **Pulse** - более subtle, элегантный shimmer

**Рекомендация:**
- Orbit для B2C (яркая привлекательность)
- Pulse для B2B (профессиональный вид)

**Performance:**
- CSS-only animations (no JS libraries)
- Hardware-accelerated (transform + opacity)
- Lightweight (< 50 lines CSS per style)

---

**Version:** v2.22.0  
**Date:** 2026-02-12  
**Author:** OpenClaw AI
