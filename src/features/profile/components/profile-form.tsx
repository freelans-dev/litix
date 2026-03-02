'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UpdateProfileSchema, type UpdateProfileInput } from '@/features/profile/schemas/profile.schema'

interface Props {
  defaultValues: { full_name: string; phone?: string | null }
}

export function ProfileForm({ defaultValues }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      full_name: defaultValues.full_name ?? undefined,
      phone: defaultValues.phone ?? undefined,
    },
  })

  async function onSubmit(data: UpdateProfileInput) {
    setLoading(true)
    const res = await fetch('/api/v1/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao salvar perfil'); return }
    toast.success('Perfil atualizado')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input id="full_name" placeholder="Dr. Carlos Silva" {...register('full_name')} />
        {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Telefone (opcional)</Label>
        <Input id="phone" placeholder="+55 11 99999-9999" {...register('phone')} />
      </div>
      <Button type="submit" disabled={loading} size="sm" className="gap-1.5">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Salvar alterações
      </Button>
    </form>
  )
}
