'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { teamService } from '@/features/team/services/team.service'

export function useTeam() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null) // memberId da ação em progresso

  async function updateRole(memberId: string, role: string) {
    setLoading(memberId)
    try {
      await teamService.updateRole(memberId, role)
      toast.success('Role atualizado')
      router.refresh()
    } catch {
      toast.error('Erro ao atualizar role')
    } finally {
      setLoading(null)
    }
  }

  async function toggleStatus(memberId: string, currentActive: boolean) {
    setLoading(memberId)
    try {
      await teamService.updateStatus(memberId, !currentActive)
      toast.success(currentActive ? 'Membro desativado' : 'Membro reativado')
      router.refresh()
    } catch {
      toast.error('Erro ao alterar status')
    } finally {
      setLoading(null)
    }
  }

  async function resendInvite(memberId: string) {
    setLoading(memberId)
    try {
      await teamService.resendInvite(memberId)
      toast.success('Convite reenviado')
    } catch {
      toast.error('Erro ao reenviar convite')
    } finally {
      setLoading(null)
    }
  }

  async function removeMember(memberId: string) {
    setLoading(memberId)
    try {
      await teamService.removeMember(memberId)
      toast.success('Membro removido')
      router.refresh()
    } catch {
      toast.error('Erro ao remover membro')
    } finally {
      setLoading(null)
    }
  }

  return { loading, updateRole, toggleStatus, resendInvite, removeMember }
}
