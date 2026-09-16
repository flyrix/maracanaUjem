import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profil } from '@/lib/types'

const CACHE_PROFIL = 'maracana.profil'

export function useAuth() {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let vivant = true

    async function charger(userId: string | undefined) {
      if (!userId) { if (vivant) { setProfil(null); setChargement(false) } ; return }
      const cached = lireProfilCache(userId)
      if (cached && vivant) {
        setProfil(cached)
        setChargement(false)
      }
      const { data, error } = await supabase.from('profiles').select('id, nom, role').eq('id', userId).single()
      if (!vivant) return
      if (data && !error) {
        const prochain = data as Profil
        localStorage.setItem(CACHE_PROFIL, JSON.stringify(prochain))
        setProfil(prochain)
      } else {
        setProfil(cached)
      }
      setChargement(false)
    }

    supabase.auth.getSession().then(({ data }) => charger(data.session?.user.id))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => charger(session?.user.id))
    return () => { vivant = false; sub.subscription.unsubscribe() }
  }, [])

  return {
    profil,
    chargement,
    estAdmin: profil?.role === 'super_admin',
    estPCO: profil?.role === 'pco' || profil?.role === 'super_admin',
    deconnexion: () => {
      localStorage.removeItem(CACHE_PROFIL)
      return supabase.auth.signOut()
    }
  }
}

function lireProfilCache(userId: string): Profil | null {
  try {
    const profil = JSON.parse(localStorage.getItem(CACHE_PROFIL) ?? 'null') as Profil | null
    return profil?.id === userId ? profil : null
  } catch {
    return null
  }
}
