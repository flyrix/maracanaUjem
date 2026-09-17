/**
 * Console table de marque.
 * Grands boutons, une main, plein soleil : chaque action est écrite
 * d'abord en local puis poussée vers le serveur.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Mic, Play, Pause, Undo2, Flag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMatchLive } from '@/hooks/useMatchLive'
import { useChrono } from '@/hooks/useChrono'
import { useAuth } from '@/hooks/useAuth'
import { Tableau } from '@/components/Tableau'
import { BandeauSynchro } from '@/components/BandeauSynchro'
import { enregistrerEvenement, annulerEvenement } from '@/lib/sync'
import { mettreEnCache } from '@/lib/db'
import { REGLES, finExclusion } from '@/lib/rules'
import { minuteDeJeu } from '@/lib/format'
import { analyserDictee } from '@/lib/ia'
import { dicteeDisponible, ecouter } from '@/lib/voix'
import { resumerMatch, type StyleResume } from '@/lib/ia'
import type { Equipe, EventType, Membre, Tournoi } from '@/lib/types'

type Action = Extract<EventType, 'but' | 'carton_jaune' | 'carton_rouge' | 'carton_bleu'>

const ACTIONS: Array<{ type: Action; libelle: string; classe: string }> = [
  { type: 'but',          libelle: 'But',          classe: 'bg-flame text-ink' },
  { type: 'carton_jaune', libelle: 'Carton jaune', classe: 'bg-jaune text-ink' },
  { type: 'carton_bleu',  libelle: 'Carton bleu',  classe: 'bg-bleu text-white' },
  { type: 'carton_rouge', libelle: 'Carton rouge', classe: 'bg-rouge text-white' }
]

export default function ConsolePCO() {
  const { id } = useParams()
  const { profil } = useAuth()
  const { match, evenements } = useMatchLive(id)
  const [tournoi, setTournoi] = useState<Tournoi | null>(null)
  const secondes = useChrono(match, tournoi?.duree_periode_sec)
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [membres, setMembres] = useState<Membre[]>([])
  const [action, setAction] = useState<Action | null>(null)
  const [ecoute, setEcoute] = useState(false)
  const [dictee, setDictee] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!match) return
    ;(async () => {
      const ids = [match.equipe_dom, match.equipe_ext]
      const [e, m, t] = await Promise.all([
        supabase.from('equipes').select('*').in('id', ids),
        supabase.from('membres').select('*').in('equipe_id', ids).eq('role', 'joueur'),
        supabase.from('tournois').select('*').eq('id', match.tournoi_id).single()
      ])
      const eq = (e.data as Equipe[]) ?? []
      const mb = (m.data as Membre[]) ?? []
      setEquipes(eq); setMembres(mb); setTournoi(t.data as Tournoi)
      await mettreEnCache(match, eq, mb)      // le match reste jouable sans réseau
    })()
  }, [match?.id])

  const dom = equipes.find(e => e.id === match?.equipe_dom)
  const ext = equipes.find(e => e.id === match?.equipe_ext)
  const surnoms = useMemo(() => membres.map(m => m.nom), [membres])

  // Fin de période automatique : le chrono s'arrête dès que la durée
  // réglementaire est atteinte, sans attendre un clic sur Pause.
  const periodeEcoulee = !!(tournoi && match?.statut === 'en_cours' && secondes >= tournoi.duree_periode_sec)
  const derniereePeriode = !!(tournoi && match && match.periode >= tournoi.nb_periodes)
  const enAttenteNouvellePeriode = !!(
    tournoi && match && match.statut === 'pause' &&
    match.chrono_offset_sec >= tournoi.duree_periode_sec &&
    match.periode < tournoi.nb_periodes
  )

  useEffect(() => {
    if (!periodeEcoulee || !match || !tournoi) return
    void supabase.from('matchs').update({
      statut: 'pause', chrono_demarre_a: null, chrono_offset_sec: tournoi.duree_periode_sec
    }).eq('id', match.id)
  }, [periodeEcoulee])

  async function periodeSuivante() {
    if (!match) return
    await supabase.from('matchs').update({
      periode: match.periode + 1, chrono_offset_sec: 0,
      chrono_demarre_a: new Date().toISOString(), statut: 'en_cours'
    }).eq('id', match.id)
  }

  async function chronometre(demarrer: boolean) {
    if (!match) return
    await supabase.from('matchs').update(
      demarrer
        ? { statut: 'en_cours', chrono_demarre_a: new Date().toISOString() }
        : { statut: 'pause', chrono_demarre_a: null, chrono_offset_sec: secondes }
    ).eq('id', match.id)
  }

  async function terminer() {
    if (!match) return
    await supabase.from('matchs').update({
      statut: 'termine', chrono_demarre_a: null, chrono_offset_sec: secondes
    }).eq('id', match.id)
  }

  async function saisir(type: Action, membre: Membre, source: 'tactile' | 'vocal' = 'tactile') {
    if (!match) return
    const maintenant = new Date()
    await enregistrerEvenement({
      match_id: match.id,
      equipe_id: membre.equipe_id,
      membre_id: membre.id,
      type,
      minute: minuteDeJeu(secondes),
      chrono_sec: secondes,
      expire_a: type === 'carton_bleu' ? finExclusion(maintenant, REGLES.cartonBleuSecondes).toISOString() : null,
      source,
      client_uuid: crypto.randomUUID(),
      cree_le: maintenant.toISOString(),
      synchronise: 0
    })
    setAction(null)
    setMessage(`${type === 'but' ? 'But' : 'Sanction'} enregistré pour ${membre.nom}.`)
    setTimeout(() => setMessage(null), 2500)
  }

  function dicter() {
    if (!dicteeDisponible()) return setMessage("La dictée n'est pas disponible sur ce navigateur.")
    setEcoute(true); setDictee('')
    ecouter(async (texte, definitif) => {
      setDictee(texte)
      if (!definitif) return
      const intention = await analyserDictee(texte, surnoms)
      if (!intention.type || !intention.cible) return setMessage(`Phrase non comprise : « ${texte} »`)
      const cible = intention.cible.toLowerCase()
      const joueur = membres.find(m => m.nom.toLowerCase().includes(cible) || cible.includes(m.nom.toLowerCase()))
      if (!joueur) return setMessage(`Aucun joueur ne correspond à « ${intention.cible} ».`)
      await saisir(intention.type, joueur, 'vocal')
    }, () => setEcoute(false))
  }

  async function redigerResume(style: StyleResume) {
    if (!match || !dom || !ext) return
    setMessage('Rédaction du compte-rendu…')
    try {
      const texte = await resumerMatch(match, { dom: dom.nom, ext: ext.nom }, evenements, style)
      await supabase.from('matchs').update({ resume_ia: texte, resume_ia_style: style }).eq('id', match.id)
      setMessage('Compte-rendu publié.')
    } catch (e) {
      setMessage(String((e as Error).message))
    }
  }

  if (!match || !dom || !ext) return <p className="p-6 text-chalk/60">Chargement de la console…</p>
  if (match.pco_id && profil && match.pco_id !== profil.id && profil.role !== 'super_admin')
    return <p className="p-6">Ce match est assigné à une autre table de marque.</p>

  const dernier = evenements[evenements.length - 1]

  return (
    <div className="pb-24">
      <BandeauSynchro />
      <div className="space-y-4 p-4">
        <Tableau match={match} dom={dom} ext={ext} secondes={secondes} />

        {enAttenteNouvellePeriode && (
          <div className="board flex items-center justify-between gap-3 border-flame bg-flame/10 p-3">
            <p className="text-sm">
              Fin de la {match.periode}<sup>{match.periode === 1 ? 're' : 'e'}</sup> période
              — le chrono est arrêté à {tournoi!.duree_periode_sec / 60} min.
            </p>
            <button className="btn-primary shrink-0 py-2" onClick={periodeSuivante}>
              Lancer la {match.periode + 1}<sup>e</sup> période
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {match.statut === 'en_cours'
            ? <button className="btn-ghost" onClick={() => chronometre(false)}><Pause size={20} />Pause</button>
            : <button className="btn-primary" onClick={() => chronometre(true)} disabled={enAttenteNouvellePeriode}>
                <Play size={20} />Lancer
              </button>}
          <button className="btn-ghost" onClick={dicter} disabled={ecoute}>
            <Mic size={20} />{ecoute ? 'Écoute…' : 'Dicter'}
          </button>
          <button className="btn-ghost" onClick={terminer}><Flag size={20} />Fin</button>
        </div>

        {derniereePeriode && match.statut === 'pause' && match.chrono_offset_sec >= (tournoi?.duree_periode_sec ?? Infinity) && (
          <p className="text-sm text-chalk/60">
            Dernière période écoulée. Cliquez sur <strong>Fin</strong> pour clôturer le match.
          </p>
        )}

        {ecoute && <p className="text-sm text-chalk/60">« {dictee || 'Dites : but de Zico, carton bleu pour Lolo…'} »</p>}
        {message && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm">{message}</p>}

        {!action ? (
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map(a => (
              <button key={a.type} onClick={() => setAction(a.type)}
                className={`${a.classe} rounded-xl py-8 font-display text-2xl uppercase shadow-board`}>
                {a.libelle}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Qui ? — {ACTIONS.find(a => a.type === action)!.libelle}</h2>
              <button className="text-chalk/60 underline" onClick={() => setAction(null)}>Annuler</button>
            </div>
            {[dom, ext].map(eq => (
              <div key={eq.id}>
                <p className="mb-1.5 text-sm text-chalk/55">{eq.nom}</p>
                <div className="grid grid-cols-2 gap-2">
                  {membres.filter(m => m.equipe_id === eq.id).map(m => (
                    <button key={m.id} onClick={() => saisir(action, m)}
                      className="rounded-lg border border-white/15 px-3 py-5 text-left font-display text-xl hover:border-flame">
                      {m.nom}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {dernier && (
          <button className="btn-ghost w-full" onClick={() => annulerEvenement(dernier.client_uuid)}>
            <Undo2 size={18} />Annuler le dernier fait de jeu
          </button>
        )}

        {match.statut === 'termine' && (
          <div className="board space-y-3 p-4">
            <h2 className="font-display text-xl">Compte-rendu du match</h2>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={() => redigerResume('professionnel')}>Ton classique</button>
              <button className="btn-ghost flex-1" onClick={() => redigerResume('nouchi')}>Ton du quartier</button>
            </div>
            {match.resume_ia && <p className="whitespace-pre-line text-chalk/85">{match.resume_ia}</p>}
          </div>
        )}
      </div>
    </div>
  )
}