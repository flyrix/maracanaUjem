import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Buteur = { membre_id: string; nom: string; equipe: string; buts: number }
type Disc = { membre_id: string; nom: string; equipe: string; jaunes: number; rouges: number; bleus: number }
type Rang = { equipe_id: string; nom: string; points: number; joues: number; gagnes: number; nuls: number; perdus: number; difference: number }

export default function Classements() {
  const [onglet, setOnglet] = useState<'poules' | 'soulier' | 'discipline'>('soulier')
  const [buteurs, setButeurs] = useState<Buteur[]>([])
  const [discipline, setDiscipline] = useState<Disc[]>([])
  const [rangs, setRangs] = useState<Rang[]>([])

  useEffect(() => {
    ;(async () => {
      const [b, d, c] = await Promise.all([
        supabase.from('v_soulier_or').select('*').limit(30),
        supabase.from('v_discipline').select('*').limit(50),
        supabase.from('v_classement').select('*')
      ])
      setButeurs((b.data as Buteur[]) ?? [])
      setDiscipline((d.data as Disc[]) ?? [])
      setRangs((c.data as Rang[]) ?? [])
    })()
  }, [])

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex gap-2">
        {([['soulier', "Soulier d'Or"], ['poules', 'Poules'], ['discipline', 'Discipline']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setOnglet(k)}
            className={`rounded-lg px-3 py-2 font-display text-lg ${onglet === k ? 'bg-flame text-ink' : 'border border-white/15 text-chalk/70'}`}>
            {l}
          </button>
        ))}
      </div>

      {onglet === 'soulier' && (
        buteurs.length === 0 ? <Vide texte="Aucun but marqué pour l'instant." /> : (
          <ol className="space-y-1.5">
            {buteurs.map((b, i) => (
              <li key={b.membre_id} className="board flex items-center gap-3 px-3 py-2.5">
                <span className="w-6 font-num text-xl text-chalk/45">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg">{b.nom}</span>
                  <span className="text-xs text-chalk/50">{b.equipe}</span>
                </span>
                <span className="font-num text-3xl tabular-nums text-flame">{b.buts}</span>
              </li>
            ))}
          </ol>
        )
      )}

      {onglet === 'poules' && (
        rangs.length === 0 ? <Vide texte="Le classement s'affiche après le premier match terminé." /> : (
          <div className="board overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-chalk/55">
                <tr className="border-b border-white/10">
                  <th className="p-2 text-left font-normal">Équipe</th>
                  <th className="p-2 font-normal">J</th><th className="p-2 font-normal">G</th>
                  <th className="p-2 font-normal">N</th><th className="p-2 font-normal">P</th>
                  <th className="p-2 font-normal">Diff</th><th className="p-2 font-normal">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rangs.map(r => (
                  <tr key={r.equipe_id} className="border-b border-white/5 last:border-0">
                    <td className="p-2 text-left">{r.nom}</td>
                    <td className="p-2 text-center tabular-nums">{r.joues}</td>
                    <td className="p-2 text-center tabular-nums">{r.gagnes}</td>
                    <td className="p-2 text-center tabular-nums">{r.nuls}</td>
                    <td className="p-2 text-center tabular-nums">{r.perdus}</td>
                    <td className="p-2 text-center tabular-nums">{r.difference > 0 ? `+${r.difference}` : r.difference}</td>
                    <td className="p-2 text-center font-num text-xl tabular-nums text-flame">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {onglet === 'discipline' && (
        discipline.length === 0 ? <Vide texte="Aucune sanction enregistrée. Beau tournoi." /> : (
          <ul className="space-y-1.5">
            {discipline.map(d => (
              <li key={d.membre_id} className="board flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{d.nom}</span>
                  <span className="text-xs text-chalk/50">{d.equipe}</span>
                </span>
                <Pastille n={d.jaunes} couleur="#FFC400" />
                <Pastille n={d.rouges} couleur="#E03131" />
                <Pastille n={d.bleus} couleur="#1D6FE0" />
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

const Pastille = ({ n, couleur }: { n: number; couleur: string }) =>
  <span className="flex items-center gap-1 text-sm tabular-nums">
    <span className="h-4 w-3 rounded-[2px]" style={{ background: couleur, opacity: n ? 1 : .25 }} />{n}
  </span>

const Vide = ({ texte }: { texte: string }) => <p className="text-chalk/60">{texte}</p>
