import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Confirme seu email' }

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Ícone */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail size={32} className="text-primary" />
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Confirme seu email</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Enviamos um link de confirmação para o seu email. Clique no link para
            ativar sua conta e acessar o dashboard.
          </p>
        </div>

        {/* Dica */}
        <div className="rounded-lg border bg-muted/40 p-4 text-left space-y-1">
          <p className="text-sm font-medium">Não recebeu o email?</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Verifique a caixa de spam ou lixo eletrônico</li>
            <li>Aguarde até 2 minutos para o email chegar</li>
            <li>Certifique-se de que digitou o email correto</li>
          </ul>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/auth/login">Já confirmei, entrar</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/auth/signup">
              <ArrowLeft size={14} className="mr-1.5" />
              Voltar e tentar outro email
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
