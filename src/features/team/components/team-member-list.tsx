'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, UserMinus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Member {
  id: string
  role: string
  is_active: boolean
  created_at: string
  user_id: string
  profile: { id: string; full_name: string | null; email: string | null } | null
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Visualizador',
}

export function TeamMemberList({
  members: initial,
  currentUserId,
  currentRole,
  tenantId,
}: {
  members: Member[]
  currentUserId: string
  currentRole: string
  tenantId: string
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initial)

  async function handleRemove(memberId: string) {
    if (!confirm('Remover este membro? Ele perderá acesso ao escritório.')) return

    const res = await fetch(`/api/v1/team/${memberId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Erro ao remover membro')
      return
    }

    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    toast.success('Membro removido')
  }

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const isSelf = member.user_id === currentUserId
        const isOwner = member.role === 'owner'
        const canRemove =
          !isSelf && !isOwner && (currentRole === 'owner' || currentRole === 'admin')

        return (
          <div
            key={member.id}
            className="rounded-lg border bg-card p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {(member.profile?.full_name ?? member.profile?.email ?? '?')
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">
                  {member.profile?.full_name ?? member.profile?.email ?? 'Usuário'}
                </p>
                {isSelf && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Você
                  </Badge>
                )}
              </div>
              {member.profile?.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {member.profile.email}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <Badge variant="secondary" className="text-xs">
                  {ROLE_LABELS[member.role] ?? member.role}
                </Badge>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(member.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>

              {canRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(member.id)}
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                >
                  <UserMinus size={14} />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
