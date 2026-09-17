/**
 * Règlement "Petit Poteau" codé une seule fois, consommé partout.
 * Toute la simplification du maracana de quartier vit ici :
 * pas de numéro de maillot, pas de passe décisive, carton bleu = 2 minutes.
 */
import type { EventType } from './types'

export const REGLES = {
  identifiantJoueur: 'nom_ou_surnom',   // aucun numéro de maillot saisi
  passeDecisive: false,                 // statistique volontairement absente
  controleAge: false,                   // mode Open / Mixte
  zone6m: false,
  deuxTouchesObligatoires: false,
  cumulFautesCollectives: false,
  cartonBleuSecondes: 120,
  maxJoueurs: 10,
  maxMercenaires: 4,
  maxPresidents: 1,
  maxEntraineurs: 1
} as const

export const EVENEMENTS: Record<EventType, { libelle: string; abrev: string; couleur: string }> = {
  but:          { libelle: 'But',            abrev: 'BUT', couleur: '#FF6B1A' },
  carton_jaune: { libelle: 'Carton jaune',   abrev: 'CJ',  couleur: '#FFC400' },
  carton_rouge: { libelle: 'Carton rouge',   abrev: 'CR',  couleur: '#E03131' },
  carton_bleu:  { libelle: 'Carton bleu',    abrev: 'CB',  couleur: '#1D6FE0' },
  debut_periode:{ libelle: 'Début période',  abrev: 'DEB', couleur: '#F2F5EF' },
  fin_periode:  { libelle: 'Fin période',    abrev: 'FIN', couleur: '#F2F5EF' }
}

/** Un carton bleu suspend le joueur pendant deux minutes de jeu. */
export function finExclusion(dateDebut: Date, secondes = REGLES.cartonBleuSecondes) {
  return new Date(dateDebut.getTime() + secondes * 1000)
}