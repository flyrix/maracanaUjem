import { blasonSVG } from '@/lib/blason'
import type { Equipe } from '@/lib/types'

export function Blason({ equipe, taille = 32 }: { equipe: Pick<Equipe, 'nom' | 'logo_url' | 'couleur_primaire' | 'couleur_secondaire'>; taille?: number }) {
  if (equipe.logo_url) {
    return <img src={equipe.logo_url} alt="" width={taille} height={taille} className="shrink-0 rounded object-contain" />
  }
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 overflow-hidden align-middle"
      style={{ width: taille, height: taille * 1.1 }}
      dangerouslySetInnerHTML={{ __html: blasonSVG(equipe.nom, equipe.couleur_primaire, equipe.couleur_secondaire) }}
    />
  )
}
