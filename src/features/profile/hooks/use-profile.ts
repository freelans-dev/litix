'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { profileService } from '@/features/profile/services/profile.service'

export function useProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function addOAB(oab_number: string, oab_uf: string) {
    setLoading(true)
    try {
      const record = await profileService.addOAB(oab_number, oab_uf)
      toast.success('Importação iniciada!')
      router.refresh()
      return record
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar OAB')
      return null
    } finally {
      setLoading(false)
    }
  }

  async function removeOAB(oab_number: string, oab_uf: string) {
    setLoading(true)
    try {
      await profileService.removeOAB(oab_number, oab_uf)
      toast.success('OAB removida do histórico')
      router.refresh()
    } catch {
      toast.error('Erro ao remover OAB')
    } finally {
      setLoading(false)
    }
  }

  return { loading, addOAB, removeOAB }
}
