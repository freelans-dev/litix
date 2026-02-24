import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/features/auth/components/login-form'

export const metadata: Metadata = { title: 'Entrar' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectedFrom?: string; error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            L
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Entrar no Litix</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitoramento processual para advogados
            </p>
          </div>
        </div>

        {/* Error from redirect */}
        {params.error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            Sessão expirada. Faça login novamente.
          </div>
        )}

        <LoginForm redirectTo={params.redirectedFrom} />

        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/auth/signup" className="font-medium text-primary hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
