/**
 * Planche de licences PDF prête à l'impression.
 * Format carte 85,6 × 54 mm, 10 cartes par page A4, traits de coupe,
 * QR unique par membre pour le contrôle d'avant-match.
 */
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { blasonPNG } from './blason'
import type { Equipe, Membre, Tournoi } from './types'

const CARTE = { l: 85.6, h: 54 }
const MARGE = { x: 12, y: 15 }
const ECART = { x: 6, y: 6 }

async function imageEnDataURL(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { mode: 'cors' })
    const blob = await r.blob()
    return await new Promise(res => {
      const fr = new FileReader()
      fr.onload = () => res(fr.result as string)
      fr.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function genererPlancheLicences(
  tournoi: Tournoi,
  equipe: Equipe,
  membres: Membre[]
): Promise<Blob> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = equipe.logo_url
    ? await imageEnDataURL(equipe.logo_url)
    : await blasonPNG(equipe.nom, equipe.couleur_primaire, equipe.couleur_secondaire)

  let i = 0
  for (const membre of membres) {
    const col = i % 2
    const ligne = Math.floor(i / 2) % 5
    if (i > 0 && i % 10 === 0) pdf.addPage()

    const x = MARGE.x + col * (CARTE.l + ECART.x)
    const y = MARGE.y + ligne * (CARTE.h + ECART.y)

    // fond + bandeau aux couleurs du club
    pdf.setFillColor(equipe.couleur_primaire)
    pdf.roundedRect(x, y, CARTE.l, CARTE.h, 2, 2, 'F')
    pdf.setFillColor(equipe.couleur_secondaire)
    pdf.rect(x, y + CARTE.h - 6, CARTE.l, 6, 'F')

    // photo d'identité (obligatoire)
    const photo = await imageEnDataURL(membre.photo_url)
    if (photo) {
      try { pdf.addImage(photo, 'JPEG', x + 3, y + 3, 20, 26) } catch { /* format non supporté */ }
    }
    if (logo) {
      try { pdf.addImage(logo, 'PNG', x + CARTE.l - 17, y + 3, 13, 14) } catch { /* ignore */ }
    }

    // identité : nom ou surnom, jamais de numéro de maillot
    pdf.setTextColor('#FFFFFF')
    pdf.setFont('helvetica', 'bold').setFontSize(13)
    pdf.text(membre.nom.toUpperCase().slice(0, 18), x + 26, y + 12)
    pdf.setFont('helvetica', 'normal').setFontSize(8)
    pdf.text(membre.role === 'joueur' ? 'Joueur' : membre.role === 'president' ? 'Président' : 'Entraîneur', x + 26, y + 17)
    pdf.text(equipe.nom.slice(0, 26), x + 26, y + 22)
    pdf.setFontSize(6.5)
    pdf.text(`${tournoi.nom} · ${tournoi.saison ?? ''}`, x + 26, y + 27)
    pdf.text(`Licence ${membre.licence_num ?? membre.qr_token.slice(0, 8).toUpperCase()}`, x + 26, y + 31)

    // QR de contrôle scanné par le PCO avant le coup d'envoi
    const qr = await QRCode.toDataURL(`maracana:membre:${membre.qr_token}`, { margin: 0, width: 240 })
    pdf.addImage(qr, 'PNG', x + CARTE.l - 22, y + CARTE.h - 28, 18, 18)

    pdf.setTextColor(equipe.couleur_primaire)
    pdf.setFontSize(6)
    pdf.text('Licence officielle — Maracana Petit Poteau', x + 3, y + CARTE.h - 2)

    // traits de coupe
    pdf.setDrawColor('#999999').setLineWidth(0.1)
    pdf.rect(x, y, CARTE.l, CARTE.h)
    i++
  }

  return pdf.output('blob')
}

export function telecharger(blob: Blob, nomFichier: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier
  a.click()
  URL.revokeObjectURL(url)
}
