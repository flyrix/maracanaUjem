/**
 * Générateur de blason vectoriel.
 * Une équipe sans logo officiel reçoit un écusson construit à partir de
 * ses deux couleurs et de ses initiales, pour que le fil d'actualité
 * et les licences gardent une ligne visuelle cohérente.
 */
import { initiales } from './format'

const HEX = /^#[0-9a-fA-F]{6}$/

function couleurSure(couleur: string | undefined, fallback: string) {
  return couleur && HEX.test(couleur) ? couleur : fallback
}

export function blasonSVG(nom: string, primaire = '#0B3B2E', secondaire = '#FF6B1A') {
  const ini = initiales(nom) || '??'
  const p = couleurSure(primaire, '#0B3B2E')
  const s = couleurSure(secondaire, '#FF6B1A')
  const petit = ini.length > 1 ? 34 : 44
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="100" height="110" style="width:100%;height:100%;display:block" preserveAspectRatio="xMidYMid meet">
  <path d="M6 6h88v58c0 22-19 33-44 40C25 97 6 86 6 64Z" fill="${p}"/>
  <path d="M6 6h88v58c0 22-19 33-44 40C25 97 6 86 6 64Z" fill="none" stroke="${s}" stroke-width="4"/>
  <path d="M6 62h88" stroke="${s}" stroke-width="3" opacity=".65"/>
  <text x="50" y="52" text-anchor="middle" fill="${s}"
        font-family="Barlow Condensed, Impact, sans-serif" font-size="${petit}" font-weight="700"
        letter-spacing="1">${ini}</text>
</svg>`
}

export function blasonDataURL(nom: string, primaire?: string, secondaire?: string) {
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(blasonSVG(nom, primaire, secondaire))))
}

/** jsPDF ne dessine pas de SVG : on rastérise le blason avant impression. */
export async function blasonPNG(nom: string, primaire?: string, secondaire?: string, taille = 220): Promise<string> {
  const img = new Image()
  img.src = blasonDataURL(nom, primaire, secondaire)
  await img.decode()
  const c = document.createElement('canvas')
  c.width = taille
  c.height = Math.round(taille * 1.1)
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/png')
}
