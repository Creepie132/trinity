// Worker routes share the WorkerShell from DashboardShell (workerMode).
// This layout just passes children through — no extra wrapper needed.
export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
