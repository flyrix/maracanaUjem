/** Console organisateur : validation des clubs, programmation, tirage des poules. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Equipe, Match, Profil, Tournoi } from '@/lib/types'

export default function Admin() {
  const { profil, estAdmin, deconnexion } = useAuth()
  const [tournoi, setTournoi] = useState<Tournoi | null>(null)
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [matchs, setMatchs] = useState<Match[]>([])
  const [pcos, setPcos] = useState<Profil[]>([])

  async function recharger() {
    const [t, e, m, p] = await Promise.all([
      supabase.from('tournois').select('*').eq('actif', true).limit(1).single(),
      supabase.from('equipes').select('*').order('nom'),
      supabase.from('matchs').select('*').order('debut_prevu'),
      supabase.from('profiles').select('id, nom, role').eq('role', 'pco')
    ])
    setTournoi((t.data as Tournoi) ?? null)
    setEquipes((e.data as Equipe[]) ?? [])
    setMatchs((m.data as Match[]) ?? [])
    setPcos((p.data as Profil[]) ?? [])
  }
  useEffect(() => { void recharger() }, [])

  if (!profil) return <p className="p-6">Connectez-vous pour accéder à l'administration.</p>
  if (!estAdmin) return <p className="p-6">Votre compte n'a pas accès à cette console.</p>

  async function statut(id: string, statut_inscription: Equipe['statut_inscription']) {
    await supabase.from('equipes').update({ statut_inscription }).eq('id', id)
    void recharger()
  }

  async function reglerTemps(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!tournoi) return
    const f = new FormData(e.currentTarget)
    await supabase.from('tournois').update({
      duree_periode_sec: Number(f.get('duree_periode')) * 60,
      nb_periodes: Number(f.get('nb_periodes')),
      duree_carton_bleu_sec: Number(f.get('duree_carton_bleu'))
    }).eq('id', tournoi.id)
    void recharger()
  }

  async function togglerPhasePoules() {
    if (!tournoi) return
    if (tournoi.phase_poules_ouverte) {
      const sur = window.confirm(
        'Clore la phase de poules ? Plus aucun mercenaire ne pourra être ajouté après cette action.'
      )
      if (!sur) return
    }
    await supabase.from('tournois').update({ phase_poules_ouverte: !tournoi.phase_poules_ouverte }).eq('id', tournoi.id)
    void recharger()
  }

  async function programmer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const dom = String(f.get('dom')); const ext = String(f.get('ext'))
    if (dom === ext) return
    const equipe = equipes.find(x => x.id === dom)!
    await supabase.from('matchs').insert({
      tournoi_id: equipe.tournoi_id, equipe_dom: dom, equipe_ext: ext,
      debut_prevu: String(f.get('date')) || null,
      terrain: String(f.get('terrain')) || null,
      pco_id: String(f.get('pco')) || null
    })
    e.currentTarget.reset()
    void recharger()
  }

  const enAttente = equipes.filter(e => e.statut_inscription === 'en_attente')

  async function assignerPco(matchId: string, pcoId: string) {
    await supabase.from('matchs').update({ pco_id: pcoId || null }).eq('id', matchId)
    void recharger()
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Console organisateur</h1>
        <button className="text-sm text-chalk/60 underline" onClick={deconnexion}>Se déconnecter</button>
      </header>

      {tournoi && (
        <section>
          <h2 className="mb-2 font-display text-xl">Temps de jeu</h2>
          <form onSubmit={reglerTemps} className="board grid gap-3 p-4 sm:grid-cols-4">
            <div><label className="label" htmlFor="duree_periode">Durée d'une période (min)</label>
              <input id="duree_periode" name="duree_periode" type="number" min={1} className="field"
                defaultValue={tournoi.duree_periode_sec / 60} /></div>
            <div><label className="label" htmlFor="nb_periodes">Nombre de périodes</label>
              <input id="nb_periodes" name="nb_periodes" type="number" min={1} className="field"
                defaultValue={tournoi.nb_periodes} /></div>
            <div><label className="label" htmlFor="duree_carton_bleu">Carton bleu (sec)</label>
              <input id="duree_carton_bleu" name="duree_carton_bleu" type="number" min={30} className="field"
                defaultValue={tournoi.duree_carton_bleu_sec} /></div>
            <div className="flex items-end"><button className="btn-primary w-full">Enregistrer</button></div>
          </form>
          <p className="mt-1.5 text-xs text-chalk/45">
            S'applique aux matchs qui n'ont pas encore démarré leur chronomètre. Un match déjà lancé
            garde la durée qui était réglée à son ouverture jusqu'au rechargement de la console.
          </p>
        </section>
      )}

      {tournoi && (
        <section>
          <h2 className="mb-2 font-display text-xl">Mercenaires</h2>
          <div className="board flex items-center justify-between gap-3 p-4">
            <p className="text-sm">
              Chaque club peut engager jusqu'à 4 mercenaires, uniquement pendant la phase de poules.
              {tournoi.phase_poules_ouverte
                ? ' La phase est actuellement ouverte : les clubs peuvent en ajouter.'
                : ' La phase est close : plus aucun mercenaire ne peut être ajouté.'}
            </p>
            <button
              className={tournoi.phase_poules_ouverte ? 'btn-ghost shrink-0' : 'btn-primary shrink-0'}
              onClick={togglerPhasePoules}
            >
              {tournoi.phase_poules_ouverte ? 'Clore la phase de poules' : 'Rouvrir la phase de poules'}
            </button>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-display text-xl">Inscriptions à valider</h2>
        {enAttente.length === 0 ? <p className="text-chalk/60">Rien à traiter.</p> : (
          <ul className="space-y-2">
            {enAttente.map(e => (
              <li key={e.id} className="board flex items-center gap-3 p-3">
                <span className="flex-1">{e.nom} <span className="text-chalk/50">· {e.quartier}</span></span>
                <button className="btn-primary py-2" onClick={() => statut(e.id, 'validee')}>Valider</button>
                <button className="btn-ghost py-2" onClick={() => statut(e.id, 'rejetee')}>Rejeter</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-display text-xl">Programmer une rencontre</h2>
        <form onSubmit={programmer} className="board grid gap-3 p-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="dom">Équipe à domicile</label>
            <select id="dom" name="dom" className="field">{equipes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>
          <div><label className="label" htmlFor="ext">Équipe visiteuse</label>
            <select id="ext" name="ext" className="field">{equipes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>
          <div><label className="label" htmlFor="date">Coup d'envoi</label>
            <input id="date" name="date" type="datetime-local" className="field" /></div>
          <div><label className="label" htmlFor="terrain">Terrain</label>
            <input id="terrain" name="terrain" className="field" placeholder="Terrain municipal" /></div>
          <div><label className="label" htmlFor="pco">Table de marque</label>
            <select id="pco" name="pco" className="field">
              <option value="">À assigner plus tard</option>
              {pcos.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select></div>
          <div className="flex items-end"><button className="btn-primary w-full">Programmer</button></div>
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-display text-xl">Rencontres</h2>
        <ul className="space-y-2">
          {matchs.map(m => (
            <li key={m.id} className="board flex items-center gap-3 p-3">
              <span className="flex-1 truncate">
                {equipes.find(e => e.id === m.equipe_dom)?.nom} — {equipes.find(e => e.id === m.equipe_ext)?.nom}
              </span>
              <span className="text-sm text-chalk/50">{m.statut}</span>
              <select
                className="field w-auto py-2 text-sm"
                value={m.pco_id ?? ''}
                onChange={e => assignerPco(m.id, e.target.value)}
                aria-label={`Table de marque pour ${equipes.find(e => e.id === m.equipe_dom)?.nom} — ${equipes.find(e => e.id === m.equipe_ext)?.nom}`}
              >
                <option value="">Non assignée</option>
                {pcos.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
              <Link className="btn-ghost py-2" to={`/console/${m.id}`}>Ouvrir la console</Link>
            </li>
          ))}
        </ul>
      </section>

      <Link to="/controle" className="btn-ghost inline-flex">Contrôler les licences</Link>
    </div>
  )
}