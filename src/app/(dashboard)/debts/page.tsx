// ⚡ Тонкий page-файл — Next.js App Router требует только default export здесь.
// Вся логика и UI → src/components/debts/DebtsContent.tsx
// Это позволяет импортировать DebtsContent из payments/page.tsx без нарушения
// правила "page-файл не может иметь именованные экспорты компонентов".
export { default } from '@/components/debts/DebtsContent'
