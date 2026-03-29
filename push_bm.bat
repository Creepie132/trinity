@echo off
git add middleware.ts
git commit -m "fix: add /api/beautymania/ to public paths in middleware"
git push origin main
git push origin main:production
