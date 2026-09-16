import { NavLink } from 'react-router-dom'
import { Home, Trophy, Users, Radio, MessageCircle } from 'lucide-react'

const liens = [
  { to: '/', icon: Home, libelle: 'Actualité' },
  { to: '/live', icon: Radio, libelle: 'Live' },
  { to: '/classements', icon: Trophy, libelle: 'Classements' },
  { to: '/equipes', icon: Users, libelle: 'Équipes' },
  { to: '/assistant', icon: MessageCircle, libelle: 'Assistant' }
]

export function Navigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-pitch-deep/95 backdrop-blur md:static md:border-none md:bg-transparent">
      <ul className="mx-auto flex max-w-3xl">
        {liens.map(({ to, icon: Icon, libelle }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] ${isActive ? 'text-flame' : 'text-chalk/55 hover:text-chalk'}`
              }
            >
              <Icon size={20} strokeWidth={2} />
              {libelle}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
