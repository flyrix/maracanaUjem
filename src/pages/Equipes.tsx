import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Blason } from '@/components/Blason'
import type { Equipe } from '@/lib/types'

export default function Equipes() {
  const [equipes, setEquipes] = useState<Equipe[]>([])
  useEffect(() => {
    supabase.from('equipes').select('*').eq('statut_inscription', 'validee').order('nom').then(r => setEquipes((r.data as Equipe[]) ?? []))
  }, [])

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl">Les clubs engagés</h1>
        <Link to="/inscription" className="btn-primary">Inscrire un club</Link>
      </div>
      {equipes.length === 0 ? (
        <p className="text-chalk/60">Aucun club inscrit. Lancez les inscriptions pour ouvrir le tournoi.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {equipes.map(e => (
            <li key={e.id}>
              <Link to={`/equipe/${e.id}`} className="board flex items-center gap-3 p-3 hover:border-flame/50">
                <Blason equipe={e} taille={44} />
                <span className="min-w-0">
                  <span className="block truncate font-display text-xl">{e.nom}</span>
                  <span className="text-sm text-chalk/55">{e.quartier ?? 'Quartier non précisé'}</span>
                </span>
                {e.statut_inscription !== 'validee' && (
                  <span className="ml-auto rounded bg-white/10 px-2 py-0.5 text-xs">En attente</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
