import { Badge } from '@/components/ui/badge'

const ROLE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  owner:  { label: 'Proprietário', variant: 'default' },
  admin:  { label: 'Administrador', variant: 'secondary' },
  member: { label: 'Membro', variant: 'outline' },
  viewer: { label: 'Visualizador', variant: 'outline' },
}

export function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role] ?? { label: role, variant: 'outline' as const }
  return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
}
