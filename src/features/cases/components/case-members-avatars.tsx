interface CaseMember {
  member_id: string
  role: string
  initials?: string
}

interface CaseMembersAvatarsProps {
  members: CaseMember[]
  maxVisible?: number
}

function getInitials(member: CaseMember): string {
  if (member.initials) return member.initials
  // Fallback: use first 2 chars of member_id (UUID)
  return member.member_id.slice(0, 2).toUpperCase()
}

export function CaseMembersAvatars({ members, maxVisible = 3 }: CaseMembersAvatarsProps) {
  if (!members || members.length === 0) return null

  const visible = members.slice(0, maxVisible)
  const overflow = members.length - maxVisible

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((member) => (
          <div
            key={member.member_id}
            title={`${getInitials(member)} — ${member.role}`}
            className={`
              relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-background
              text-[10px] font-semibold uppercase select-none cursor-default
              ${member.role === 'lead'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
              }
            `}
          >
            {getInitials(member)}
          </div>
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-1.5 text-xs text-muted-foreground font-medium">
          +{overflow}
        </span>
      )}
    </div>
  )
}
