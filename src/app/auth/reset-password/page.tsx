'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Email inválido'),
})

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/new-password`,
    })

    if (error) {
      toast.error('Erro ao enviar email. Tente novamente.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle size={32} className="text-success" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Email enviado</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Enviamos um link de redefinição para{' '}
              <span className="font-medium text-foreground">{getValues('email')}</span>.
              Verifique sua caixa de entrada.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 text-left space-y-1">
            <p className="text-sm font-medium">Não recebeu?</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Verifique a pasta de spam</li>
              <li>O link expira em 1 hora</li>
            </ul>
          </div>
          <Button variant="ghost" asChild className="w-full">
            <Link href="/auth/login">
              <ArrowLeft size={14} className="mr-1.5" />
              Voltar ao login
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            L
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Redefinir senha</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Informe seu email e enviaremos um link para redefinir sua senha
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="pl-9"
                autoFocus
                autoComplete="email"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={15} className="mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar link de redefinição'
            )}
          </Button>
        </form>

        <Button variant="ghost" asChild className="w-full">
          <Link href="/auth/login">
            <ArrowLeft size={14} className="mr-1.5" />
            Voltar ao login
          </Link>
        </Button>
      </div>
    </div>
  )
}
