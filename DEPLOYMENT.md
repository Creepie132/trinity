# Деплой Trinity CRM

## Окружение

```bash
NODE_VERSION=18.x
```

## Переменные окружения

```env
NEXT_PUBLIC_SUPABASE_URL=https://qcnpuycnzthgkhggpvpa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=https://your-domain.com
RESEND_API_KEY=re_...
```

## Шаги деплоя

1. Клонировать репозиторий
```bash
git clone https://github.com/Creepie132/trinity.git
cd trinity
```

2. Установить зависимости
```bash
npm install
```

3. Сборка
```bash
npm run build
```

4. Запуск
```bash
npm start
```

## Vercel Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCreepie132%2Ftrinity&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,RESEND_API_KEY&project-name=trinity-crm&repository-name=trinity)

После клика на кнопку:
1. Подключите GitHub репозиторий
2. Добавьте переменные окружения
3. Нажмите Deploy

## Откат изменений

В случае проблем:
```bash
git reset --hard HEAD~1  # откат последнего коммита
git push -f origin main  # принудительное обновление
```