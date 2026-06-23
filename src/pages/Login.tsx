import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1c1c] text-[#EDEDED] p-4">
      <div className="w-full max-w-md bg-[#161616] p-8 rounded-lg border border-[#3E3E3E] shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#24B47E]">Estoque & Vendas</h1>
          <p className="text-[#8B8B8B] mt-2">Acesse sua conta</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-4 py-2 text-[#EDEDED] focus:outline-none focus:border-[#24B47E] transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-4 py-2 text-[#EDEDED] focus:outline-none focus:border-[#24B47E] transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#24B47E] text-white font-medium py-2 px-4 rounded-md hover:bg-[#24B47E]/90 focus:outline-none focus:ring-2 focus:ring-[#24B47E]/50 disabled:opacity-50 transition-colors mt-4"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
