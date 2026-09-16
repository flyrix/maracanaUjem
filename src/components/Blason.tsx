import { blasonSVG } from '@/lib/blason'
import type { Equipe } from '@/lib/types'

export function Blason({ equipe, taille = 40 }: { equipe: Pick<Equipe, 'nom' | 'logo_url' | 'couleur_primaire' | 'couleur_secondaire'>; taille?: number }) {
  if (equipe.logo_url) {
    return <img src={equipe.logo_url} alt="" width={taille} height={taille} className="rounded object-contain" />
  }
  return (
    <span
      aria-hidden
      style={{ width: taille, height: taille * 1.1, display: 'inline-block' }}
      dangerouslySetInnerHTML={{ __html: blasonSVG(equipe.nom, equipe.couleur_primaire, equipe.couleur_secondaire) }}
    />
  )
}
