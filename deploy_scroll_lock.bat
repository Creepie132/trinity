@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
git add src/hooks/useScrollLock.ts src/components/ui/ModalBottomSheet.tsx src/components/modals/BaseModal.tsx src/components/ModalWrapper.tsx src/styles/modal-animations.css
git commit -m "feat: useScrollLock hook - iOS-safe scroll lock for modals/drawers (Scroll Chaining fix)"
git push origin main
echo DONE
