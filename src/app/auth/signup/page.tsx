import type { Metadata } from 'next'
import Link from 'next/link'
import { SignupForm } from '@/features/auth/components/signup-form'

export const metadata: Metadata = { title: 'Criar conta' }

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            L
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Criar conta no Litix</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Comece gratuitamente, sem cartão de crédito
            </p>
          </div>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground/60 px-4">
          Ao criar sua conta, você concorda com os{' '}
          <Link href="/legal/termos" className="underline underline-offset-2 hover:text-muted-foreground">
            Termos de Uso
          </Link>{' '}
          e{' '}
          <Link href="/legal/privacidade" className="underline underline-offset-2 hover:text-muted-foreground">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
