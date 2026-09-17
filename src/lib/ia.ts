/**
 * Agent IA du tournoi — côté client.
 * Toutes les requêtes passent par une Edge Function Supabase :
 * la clé du modèle reste sur le serveur et n'est jamais exposée au navigateur.
 */
import { supabase } from './supabase'
import type { Evenement, Match } from './types'

const URL_IA = import.meta.env.VITE_IA_FUNCTION_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

type Tache = 'resume' | 'intention_vocale' | 'chatbot' | 'verifier_visage'

async function appelIA<T>(tache: Tache, donnees: unknown): Promise<T> {
  if (!URL_IA) throw new Error('Agent IA non configuré (VITE_IA_FUNCTION_URL).')
  const { data } = await supabase.auth.getSession()
  const jeton = data.session?.access_token ?? ANON_KEY
  const r = await fetch(URL_IA, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ANON_KEY ? { apikey: ANON_KEY } : {}),
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {})
    },
    body: JSON.stringify({ tache, donnees })
  })
  if (!r.ok) {
    let detail = ''
    try {
      const data = await r.json()
      detail = typeof data?.erreur === 'string' ? ` ${data.erreur}` : ''
    } catch {
      detail = ` ${await r.text()}`
    }
    throw new Error(`Agent IA indisponible (${r.status}).${detail}`)
  }
  return (await r.json()) as T
}

export type StyleResume = 'professionnel' | 'nouchi'

/** 1. IA Reporter — compte-rendu après le coup de sifflet final. */
export async function resumerMatch(
  match: Match,
  noms: { dom: string; ext: string },
  evenements: Evenement[],
  style: StyleResume
) {
  const { texte } = await appelIA<{ texte: string }>('resume', {
    style,
    score: `${noms.dom} ${match.score_dom} - ${match.score_ext} ${noms.ext}`,
    evenements: evenements.map(e => ({ minute: e.minute, type: e.type, joueur: e.membre_id }))
  })
  return texte
}

/** 4. Chatbot supporters — horaires, Soulier d'Or, historique d'une équipe. */
export async function demanderAuChatbot(question: string, contexte: unknown) {
  const { texte } = await appelIA<{ texte: string }>('chatbot', { question, contexte })
  return texte
}

/** 3. Anti-fraude photo — compare un visage aux membres déjà inscrits. */
export async function verifierVisage(photoBase64: string, tournoiId: string) {
  return appelIA<{ doublon: boolean; membre_id?: string; score?: number }>(
    'verifier_visage', { photo: photoBase64, tournoi_id: tournoiId }
  )
}

/**
 * 2. Co-pilote vocal — analyse locale d'abord.
 * La table de marque doit fonctionner sans réseau : on reconnaît les
 * formules courantes sur l'appareil, et on n'appelle le modèle que si
 * la phrase dictée sort du cadre attendu.
 */
export interface IntentionVocale {
  type: 'but' | 'carton_jaune' | 'carton_rouge' | 'carton_bleu' | null
  cible: string | null
  confiance: number
}

const MOTIFS: Array<[RegExp, IntentionVocale['type']]> = [
  [/\b(but|goal|marque|ça rentre)\b/i, 'but'],
  [/\bcarton\s*bleu\b|\bbleu\b/i, 'carton_bleu'],
  [/\bcarton\s*jaune\b|\bjaune\b/i, 'carton_jaune'],
  [/\bcarton\s*rouge\b|\brouge\b|\bexpuls/i, 'carton_rouge']
]

export function analyserDicteeLocale(phrase: string): IntentionVocale {
  const type = MOTIFS.find(([re]) => re.test(phrase))?.[1] ?? null
  const cible = phrase
    .replace(/.*\b(?:de|pour|à|a|sur)\b\s*/i, '')
    .replace(/\b(but|goal|carton|bleu|jaune|rouge|marque)\b/gi, '')
    .trim() || null
  return { type, cible, confiance: type && cible ? 0.85 : type ? 0.5 : 0 }
}

export async function analyserDictee(phrase: string, surnoms: string[]): Promise<IntentionVocale> {
  const locale = analyserDicteeLocale(phrase)
  if (locale.confiance >= 0.8 || !navigator.onLine || !URL_IA) return locale
  try {
    return await appelIA<IntentionVocale>('intention_vocale', { phrase, surnoms })
  } catch {
    return locale
  }
}
