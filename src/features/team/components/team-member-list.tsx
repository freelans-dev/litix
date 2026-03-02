'use client'

import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RoleBadge } from '@/features/team/components/role-badge'
import { MemberActionsMenu } from '@/features/team/components/member-actions-menu'

interface Member {
  id: string
  role: string
  is_active: boolean
  invited_at?: string | null
  accepted_at?: string | null
  created_at: string
  user_id: string
  status: 'active' | 'pending' | 'inactive'
  profile: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:   { label: 'Ativo',     className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  pending:  { label: 'Pendente',  className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  inactive: { label: 'Inativo',   className: 'bg-muted text-muted-foreground' },
}

function getDisplayName(member: Member): string {
  return (
    member.profile?.full_name ??
    member.profile?.email ??
    'Usuário'
  )
}

export function TeamMemberList({
  members,
  currentUserId,
  currentRole,
}: {
  members: Member[]
  currentUserId: string
  currentRole: string
  tenantId: string
}) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum membro encontrado.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const isSelf = member.user_id === currentUserId
        const displayName = getDisplayName(member)
        const statusConfig = STATUS_BADGE[member.status] ?? STATUS_BADGE.inactive
        const isInactive = member.status === 'inactive'

        return (
          <div
            key={member.id}
            className={`rounded-lg border bg-card p-4 flex items-center gap-4 transition-opacity ${
              isInactive ? 'opacity-60' : ''
            }`}
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm truncate">{displayName}</p>
                {isSelf && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Você
                  </Badge>
                )}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}
                >
                  {statusConfig.label}
                </span>
              </div>
              {member.profile?.email && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {member.profile.email}
                </p>
              )}
            </div>

            {/* Role + date + actions */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <RoleBadge role={member.role} />
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(member.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>

              <MemberActionsMenu
                memberId={member.id}
                memberRole={member.role}
                memberStatus={member.status}
                currentUserRole={currentRole}
                isSelf={isSelf}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
