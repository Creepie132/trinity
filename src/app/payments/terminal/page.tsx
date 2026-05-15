import { TerminalForm } from '@/components/payments/TerminalForm'

// Terminal — точка создания платёжных ссылок
// Клиентский компонент для интерактивности формы
export default function TerminalPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Terminal</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Generate a payment link to send to your client</p>
      </div>
      <TerminalForm />
    </div>
  )
}
