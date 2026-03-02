import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Aceitar convite' }

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle size={32} className="text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Convite aceito!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sua conta foi configurada com sucesso. Acesse o dashboard para começar.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/dashboard">Acessar o dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
