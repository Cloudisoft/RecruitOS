import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { navSections } from '../../lib/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { LogOut } from 'lucide-react'
import logo from '../../assets/logo.webp'

export function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[#e5e7eb] bg-[#ffffff]">
      <div className="flex h-14 items-center gap-2 border-b border-[#e5e7eb] px-5">
        <img src={logo} alt="RecruitOS" className="h-8 w-auto object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                if (!item.implemented) {
                  return (
                    <div
                      key={item.path}
                      title="Coming in a future phase"
                      className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-600"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="rounded bg-black/5 px-1.5 py-0.5 text-[9px] text-gray-500">soon</span>
                    </div>
                  )
                }
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-orange-500/15 text-orange-600'
                          : 'text-gray-600 hover:bg-black/5 hover:text-gray-800'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#e5e7eb] p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs font-semibold text-orange-700">
            {(profile?.full_name || profile?.email || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">{profile?.full_name || profile?.email}</p>
            <p className="truncate text-xs capitalize text-gray-500">{profile?.role.replace('_', ' ')}</p>
          </div>
          <button onClick={signOut} title="Sign out" className="rounded-md p-1.5 text-gray-500 hover:bg-black/5 hover:text-gray-700">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
