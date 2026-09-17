/** Point d'entrée unique après connexion : renvoie chacun vers sa propre console. */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Espace() {
  const { profil, chargement } = useAuth()
  const naviguer = useNavigate()

  useEffect(() => {
    if (chargement) return
    if (!profil) return naviguer('/connexion', { replace: true })
    if (profil.role === 'super_admin') return naviguer('/admin', { replace: true })
    if (profil.role === 'pco') return naviguer('/mes-matchs', { replace: true })
    naviguer('/', { replace: true })
  }, [profil, chargement])

  return <p className="p-6 text-chalk/60">Redirection…</p>
}