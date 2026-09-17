import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function Connexion() {
  const naviguer = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  async function connecter(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    if (error) return setErreur("Identifiants refusés. Vérifiez l'adresse et le mot de passe.")
    naviguer('/espace')
  }

  return (
    <form onSubmit={connecter} className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="font-display text-3xl">Accès organisateur</h1>
      <p className="text-sm text-chalk/60">Réservé au super admin et aux tables de marque.</p>
      <div><label className="label" htmlFor="e">Adresse e-mail</label>
        <input id="e" type="email" className="field" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div><label className="label" htmlFor="p">Mot de passe</label>
        <input id="p" type="password" className="field" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} /></div>
      {erreur && <p className="text-rouge text-sm">{erreur}</p>}
      <button className="btn-primary w-full">Se connecter</button>
    </form>
  )
}