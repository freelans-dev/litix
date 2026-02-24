import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth'
import { InviteMemberForm } from '@/features/team/components/invite-member-form'
import { TeamMemberList } from '@/features/team/components/team-member-list'
import { Badge } from '@/components/ui/badge'
import { Users, Lock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Equipe — Litix' }
export const dynamic = 'force-dynamic'

const PLAN_USER_LIMIT: Record<string, number> = {
  free: 1, solo: 1, escritorio: 10, pro: 30, enterprise: -1,
}

export default async function TeamPage() {
  const ctx = await getTenantContext()
  const supabase = await createClient()

  const plan = ctx.plan ?? 'free'
  const userLimit = PLAN_USER_LIMIT[plan] ?? 1

  // Get team members with profiles
  const { data: members } = await supabase
    .from('tenant_members')
    .select('id, role, is_active, created_at, user_id')
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  // Get profiles for members
  const userIds = members?.map((m) => m.user_id) ?? []
  const { data: profiles } = userIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
    : { data: [] }

  const membersWithProfiles = (members ?? []).map((m) => ({
    ...m,
    profile: profiles?.find((p) => p.id === m.user_id) ?? null,
  }))

  const isOwnerOrAdmin = ctx.role === 'owner' || ctx.role === 'admin'
  const canInvite =
    isOwnerOrAdmin && (userLimit === -1 || (members?.length ?? 0) < userLimit)

  if (userLimit === 1) {
    return (
      <div className="p-6 max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users size={20} />
          Equipe
        </h1>

        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Lock size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Multi-usuário disponível no plano Escritório ou superior
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
                Convide advogados, estagiários e assistentes. Gerencie permissões por papel
                (owner, admin, membro, visualizador).
              </p>
            </div>
          </div>
          <Button size="sm" asChild>
            <Link href="/pricing">Ver planos</Link>
          </Button>
        </div>

        {/* Still show current user */}
        <MemberCard
          name={membersWithProfiles[0]?.profile?.full_name ?? 'Você'}
          email={membersWithProfiles[0]?.profile?.email ?? ''}
          role={membersWithProfiles[0]?.role ?? 'owner'}
          joinedAt={membersWithProfiles[0]?.created_at ?? new Date().toISOString()}
          isSelf
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users size={20} />
            Equipe
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os membros do seu escritório.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {members?.length ?? 0} / {userLimit === -1 ? '∞' : userLimit}
        </Badge>
      </div>

      {canInvite && isOwnerOrAdmin && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Convidar membro</h2>
          <InviteMemberForm tenantId={ctx.tenantId} />
        </div>
      )}

      <TeamMemberList
        members={membersWithProfiles}
        currentUserId={ctx.userId}
        currentRole={ctx.role}
        tenantId={ctx.tenantId}
      />
    </div>
  )
}

function MemberCard({
  name,
  email,
  role,
  joinedAt,
  isSelf,
}: {
  name: string
  email: string
  role: string
  joinedAt: string
  isSelf?: boolean
}) {
  const roleLabels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    member: 'Membro',
    viewer: 'Visualizador',
  }

  return (
    <div className="rounded-lg border bg-card p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-primary">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{name}</p>
          {isSelf && (
            <Badge variant="outline" className="text-xs">
              Você
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
      <div className="text-right shrink-0">
        <Badge variant="secondary" className="text-xs">
          {roleLabels[role] ?? role}
        </Badge>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(joinedAt), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  )
}
