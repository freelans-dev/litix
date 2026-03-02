'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OABSchema, ESTADOS_BR, type OABInput } from '@/features/profile/schemas/profile.schema'
import { useProfile } from '@/features/profile/hooks/use-profile'

export function OABField({ maxOab }: { maxOab: number }) {
  const { loading, addOAB } = useProfile()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<OABInput>({
    resolver: zodResolver(OABSchema),
  })

  async function onSubmit(data: OABInput) {
    const result = await addOAB(data.oab_number, data.oab_uf)
    if (result) reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="oab_number">Número OAB</Label>
          <Input
            id="oab_number"
            placeholder="123456"
            className="font-mono"
            {...register('oab_number')}
          />
          {errors.oab_number && (
            <p className="text-xs text-destructive">{errors.oab_number.message}</p>
          )}
        </div>
        <div className="w-28 space-y-1.5">
          <Label htmlFor="oab_uf">UF</Label>
          <select
            id="oab_uf"
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('oab_uf')}
          >
            <option value="">UF</option>
            {ESTADOS_BR.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          {errors.oab_uf && (
            <p className="text-xs text-destructive">{errors.oab_uf.message}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={loading} size="sm" className="gap-1.5">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Adicionar OAB
      </Button>
      {maxOab !== -1 && (
        <p className="text-xs text-muted-foreground">
          Você pode adicionar até {maxOab} OAB{maxOab !== 1 ? 's' : ''} no seu plano atual.
        </p>
      )}
    </form>
  )
}
