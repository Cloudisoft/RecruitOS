import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { GlobalSearch } from './GlobalSearch'
import { QuickCreateMenu } from './QuickCreateMenu'
import { NotificationsBell } from './NotificationsBell'

export function AppShell() {
  return (
    <div className="flex h-screen w-full bg-[#0b0c0f] text-gray-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#1c1d24] px-6">
          <GlobalSearch />
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <QuickCreateMenu />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
