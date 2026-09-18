import { useState, type ReactNode } from 'react'
import clsx from 'clsx'

export function Tabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0)
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-[#1c1d24]">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={clsx(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active === i ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs[active]?.content}</div>
    </div>
  )
}
