@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add src/components/layout/Sidebar.tsx
git add src/components/layout/MobileSidebar.tsx
git add "src/app/(dashboard)/inbox/page.tsx"
git add KNOWLEDGE_BASE.md
git commit -m "feat: wa inbox UI + sidebar navigation"
git push
echo DONE
