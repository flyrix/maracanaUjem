/** Console organisateur : validation des clubs, programmation, tirage des poules. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Equipe, Match, Profil } from '@/lib/types'

export default function Admin() {
  const { profil, estAdmin, deconnexion, chargement } = useAuth()
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [matchs, setMatchs] = useState<Match[]>([])
  const [pcos, setPcos] = useState<Profil[]>([])

  async function recharger() {
    const [e, m, p] = await Promise.all([
      supabase.from('equipes').select('*').order('nom'),
      supabase.from('matchs').select('*').order('debut_prevu'),
      supabase.from('profiles').select('id, nom, role').eq('role', 'pco')
    ])
    setEquipes((e.data as Equipe[]) ?? [])
    setMatchs((m.data as Match[]) ?? [])
    setPcos((p.data as Profil[]) ?? [])
  }
  useEffect(() => { void recharger() }, [])

  if (chargement) return <p className="p-6 text-chalk/60">Vérification de l'accès…</p>
  if (!profil) return <p className="p-6">Connectez-vous pour accéder à l'administration.</p>
  if (!estAdmin) return <p className="p-6">Votre compte n'a pas accès à cette console.</p>

  async function statut(id: string, statut_inscription: Equipe['statut_inscription']) {
    await supabase.from('equipes').update({ statut_inscription }).eq('id', id)
    void recharger()
  }

  async function programmer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const dom = String(f.get('dom')); const ext = String(f.get('ext'))
    if (dom === ext) return
    const equipe = validees.find(x => x.id === dom)
    if (!equipe) return
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
  const validees = equipes.filter(e => e.statut_inscription === 'validee')

  return (
    <div className="space-y-8 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Console organisateur</h1>
        <button className="text-sm text-chalk/60 underline" onClick={deconnexion}>Se déconnecter</button>
      </header>

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
            <select id="dom" name="dom" className="field">{validees.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>
          <div><label className="label" htmlFor="ext">Équipe visiteuse</label>
            <select id="ext" name="ext" className="field">{validees.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>
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
              <Link className="btn-ghost py-2" to={`/console/${m.id}`}>Ouvrir la console</Link>
            </li>
          ))}
        </ul>
      </section>

      <Link to="/controle" className="btn-ghost inline-flex">Contrôler les licences</Link>
    </div>
  )
}
