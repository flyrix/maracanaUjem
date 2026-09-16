import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { demarrerSynchro } from '@/lib/sync'

demarrerSynchro()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
