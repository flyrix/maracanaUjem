import { useEffect, useState } from 'react'
import { surEtatSynchro } from '@/lib/sync'

export function useSynchro() {
  const [etat, setEtat] = useState({ enAttente: 0, enLigne: navigator.onLine })
  useEffect(() => {
    const retirer = surEtatSynchro((enAttente, enLigne) => setEtat({ enAttente, enLigne }))
    return () => { retirer() }
  }, [])
  return etat
}
