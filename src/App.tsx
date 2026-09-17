import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom'
import { Navigation } from '@/components/Navigation'

const Accueil = lazy(() => import('@/pages/Accueil'))
const MatchLive = lazy(() => import('@/pages/MatchLive'))
const Classements = lazy(() => import('@/pages/Classements'))
const Equipes = lazy(() => import('@/pages/Equipes'))
const EquipeDetail = lazy(() => import('@/pages/EquipeDetail'))
const Inscription = lazy(() => import('@/pages/Inscription'))
const ConsolePCO = lazy(() => import('@/pages/ConsolePCO'))
const ControleQR = lazy(() => import('@/pages/ControleQR'))
const Assistant = lazy(() => import('@/pages/Assistant'))
const Connexion = lazy(() => import('@/pages/Connexion'))
const Admin = lazy(() => import('@/pages/Admin'))

export default function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto flex min-h-full max-w-3xl flex-col">
        <header className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-2xl tracking-wide">
            Maracana <span className="text-flame">Petit Poteau</span>
          </Link>
          <Link to="/connexion" className="text-sm text-chalk/55 hover:text-chalk">Organisateur</Link>
        </header>

        <main className="flex-1 pb-20 md:pb-6">
          <Suspense fallback={<p className="p-6 text-chalk/60">Chargement…</p>}>
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
              <Route path="/admin" element={<Admin />} />
              <Route path="/console/:id" element={<ConsolePCO />} />
              <Route path="/controle" element={<ControleQR />} />
              <Route path="*" element={<p className="p-6">Cette page n'existe pas. <Link className="underline" to="/">Retour au fil</Link></p>} />
            </Routes>
          </Suspense>
        </main>

        <Navigation />
      </div>
    </BrowserRouter>
  )
}
