import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

/**
 * Instance QueryClient globale de l'application.
 * 
 * Configuration choisie pour une app de gestion de projet :
 * - staleTime: 30s → on évite les refetch agressifs
 * - gcTime: 5min → on garde le cache 5min après qu'aucun composant ne l'utilise
 * - retry: 1 → on réessaie 1 fois en cas d'erreur réseau
 * - refetchOnWindowFocus: false → on ne refetch pas quand l'user revient sur l'onglet
 *   (utile pour une app de saisie : on ne veut pas perdre le contexte)
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,             // 30 secondes
      gcTime: 5 * 60 * 1000,        // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,      // refetch si on perd puis retrouve la connexion
    },
    mutations: {
      retry: 0,                      // on ne réessaie pas une mutation qui a échoué
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
