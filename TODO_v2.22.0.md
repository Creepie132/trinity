# ✅ TODO v2.22.0 - Animated Login Buttons

## Deployment Checklist

### Database Setup
- [ ] Run SQL migration in Supabase SQL Editor
  - File: `supabase/create-landing-settings.sql`
  - Creates: `landing_settings` table + RLS policies
  - Default: `login_button_style = 'orbit'`

### Code Deployment
- [x] CSS animations (Orbit + Pulse) - ✅ Done
- [x] AnimatedLoginButton component with dual styles - ✅ Done
- [x] API endpoint `/api/landing/settings` - ✅ Done
- [x] Admin page `/admin/settings/landing` - ✅ Done
- [x] Landing page integration - ✅ Done
- [ ] npm install (TypeScript deps) - In Progress...
- [ ] npm run build - Pending
- [ ] git commit + push - Pending
- [ ] Vercel auto-deploy - Pending

### Testing After Deploy
- [ ] Run SQL migration in Supabase
- [ ] Test landing page loads with Orbit button (default)
- [ ] Login as admin → navigate to Admin → Settings → Landing Page Design
- [ ] Click Pulse card → verify save success
- [ ] Refresh landing page → verify Pulse button appears
- [ ] Test bilingual (Hebrew/Russian) - both styles
- [ ] Test mobile responsive - both styles
- [ ] Test non-admin cannot access `/admin/settings/landing`

---

## Files Overview

### NEW Files (5)
1. `supabase/create-landing-settings.sql` - DB schema
2. `src/app/api/landing/settings/route.ts` - API (GET/PATCH)
3. `src/app/admin/settings/landing/page.tsx` - Admin UI
4. `LANDING_BUTTON_SETUP.md` - Setup guide
5. `CHANGELOG_v2.22.0.md` - Full changelog

### MODIFIED Files (4)
1. `src/app/globals.css` - Orbit + Pulse animations
2. `src/components/landing/AnimatedLoginButton.tsx` - Dual style support
3. `src/app/landing/page.tsx` - Load style from API
4. `src/app/admin/settings/page.tsx` - Link to landing settings

---

## Next Steps

1. Wait for `npm install` to complete
2. Run `npm run build` → verify no errors
3. Git commit with message: "Add animated login buttons with admin settings"
4. Git push → Vercel auto-deploy
5. Run SQL migration in Supabase production
6. Test in production

---

## Git Commit Message

```
Add animated login buttons with admin settings

Features:
- Orbit style: Rotating conic-gradient border with CSS @property
- Pulse style: Shimmer effect with pulsating shadow
- Admin UI: /admin/settings/landing for style selection
- API: /api/landing/settings (GET/PATCH)
- DB: landing_settings table with RLS policies
- Bilingual support (Hebrew/Russian)
- Mobile responsive (full width buttons)

Files:
- NEW: supabase/create-landing-settings.sql
- NEW: src/app/api/landing/settings/route.ts
- NEW: src/app/admin/settings/landing/page.tsx
- MODIFIED: src/app/globals.css (CSS animations)
- MODIFIED: src/components/landing/AnimatedLoginButton.tsx
- MODIFIED: src/app/landing/page.tsx
- MODIFIED: src/app/admin/settings/page.tsx

v2.22.0
```

---

**Status:** In Progress (npm install running)  
**Next:** npm run build → git push → SQL migration
