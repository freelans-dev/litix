'use client'
import { MoreHorizontal, UserMinus, UserCheck, RefreshCw, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTeam } from '@/features/team/hooks/use-team'

interface Props {
  memberId: string
  memberRole: string
  memberStatus: 'active' | 'pending' | 'inactive'
  currentUserRole: string
  isSelf: boolean
}

export function MemberActionsMenu({
  memberId,
  memberRole,
  memberStatus,
  currentUserRole,
  isSelf,
}: Props) {
  const { loading, updateRole, toggleStatus, resendInvite, removeMember } = useTeam()
  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin'
  const isOwner = currentUserRole === 'owner'
  const isTargetOwner = memberRole === 'owner'

  if (isSelf || !isOwnerOrAdmin) return null

  const canChangeRole = isOwner && !isTargetOwner
  const canToggleStatus =
    !isTargetOwner &&
    (isOwner || (currentUserRole === 'admin' && memberRole !== 'admin'))
  const canResend = memberStatus === 'pending' && isOwnerOrAdmin

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={loading === memberId}
        >
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canChangeRole && (
          <>
            <DropdownMenuItem onClick={() => updateRole(memberId, 'admin')}>
              <Shield size={14} className="mr-2" /> Tornar administrador
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateRole(memberId, 'member')}>
              <Shield size={14} className="mr-2" /> Tornar membro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateRole(memberId, 'viewer')}>
              <Shield size={14} className="mr-2" /> Tornar visualizador
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {canResend && (
          <DropdownMenuItem onClick={() => resendInvite(memberId)}>
            <RefreshCw size={14} className="mr-2" /> Reenviar convite
          </DropdownMenuItem>
        )}
        {canToggleStatus && memberStatus === 'active' && (
          <DropdownMenuItem
            onClick={() => toggleStatus(memberId, true)}
            className="text-destructive"
          >
            <UserMinus size={14} className="mr-2" /> Desativar acesso
          </DropdownMenuItem>
        )}
        {canToggleStatus && memberStatus === 'inactive' && (
          <DropdownMenuItem onClick={() => toggleStatus(memberId, false)}>
            <UserCheck size={14} className="mr-2" /> Reativar acesso
          </DropdownMenuItem>
        )}
        {!canResend && memberStatus === 'active' && (
          <DropdownMenuItem
            onClick={() => removeMember(memberId)}
            className="text-destructive"
          >
            <UserMinus size={14} className="mr-2" /> Remover membro
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
