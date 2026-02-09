export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

Это переопределит основной layout — страница логина будет без sidebar.

Также создай `src/app/unauthorized/layout.tsx` с тем же содержимым, и `src/app/blocked/layout.tsx` — чтобы эти страницы тоже были без sidebar.

Сохрани все файлы. Потом в PowerShell:
```
cd C:\Leya_Work\Leya-Project\clientbase-pro
```
```
git add .
```
```
git commit -m "Fix login page, add dashboard button"
```
```
git push
