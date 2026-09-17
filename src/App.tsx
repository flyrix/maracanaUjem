import { BrowserRouter, Route, Routes, Link } from 'react-router-dom'
import { Navigation } from '@/components/Navigation'
import { useAuth } from '@/hooks/useAuth'
import Accueil from '@/pages/Accueil'
import MatchLive from '@/pages/MatchLive'
import Classements from '@/pages/Classements'
import Equipes from '@/pages/Equipes'
import EquipeDetail from '@/pages/EquipeDetail'
import Inscription from '@/pages/Inscription'
import ConsolePCO from '@/pages/ConsolePCO'
import ControleQR from '@/pages/ControleQR'
import Assistant from '@/pages/Assistant'
import Connexion from '@/pages/Connexion'
import Espace from '@/pages/Espace'
import Admin from '@/pages/Admin'
import MesMatchs from '@/pages/MesMatchs'

function EnTete() {
  const { profil } = useAuth()
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <Link to="/" className="font-display text-2xl tracking-wide">
        Maracana <span className="text-flame">Petit Poteau</span>
      </Link>
      <Link to={profil ? '/espace' : '/connexion'} className="text-sm text-chalk/55 hover:text-chalk">
        {profil ? profil.nom : 'Organisateur'}
      </Link>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto flex min-h-full max-w-3xl flex-col">
        <EnTete />

        <main className="flex-1 pb-20 md:pb-6">
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/live" element={<Accueil />} />
            <Route path="/match/:id" element={<MatchLive />} />
            <Route path="/classements" element={<Classements />} />
            <Route path="/equipes" element={<Equipes />} />
            <Route path="/equipe/:id" element={<EquipeDetail />} />
            <Route path="/inscription" element={<Inscription />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/espace" element={<Espace />} />
            <Route path="/mes-matchs" element={<MesMatchs />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/console/:id" element={<ConsolePCO />} />
            <Route path="/controle" element={<ControleQR />} />
            <Route path="*" element={<p className="p-6">Cette page n'existe pas. <Link className="underline" to="/">Retour au fil</Link></p>} />
          </Routes>
        </main>

        <Navigation />
      </div>
    </BrowserRouter>
  )
}