import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Customers from './pages/Customers'
import Sales from './pages/Sales'
import POS from './pages/POS'
import Login from './pages/Login'
import PrinterSettings from './pages/PrinterSettings'
import PWAInstallPrompt from './components/PWAInstallPrompt'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center dark">Carregando...</div>
  }

  if (!session) {
    return (
      <>
        <PWAInstallPrompt />
        <Login />
      </>
    )
  }

  return (
    <>
      <PWAInstallPrompt />
      <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/vendas" element={<Sales />} />
          <Route path="/pdv" element={<POS />} />
          <Route path="/configuracoes/impressoras" element={<PrinterSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
    </>
  )
}

export default App
