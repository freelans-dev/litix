import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const PROVIDER_STYLES: Record<string, string> = {
  datajud: 'bg-blue-100 text-blue-700 border-blue-200',
  judit: 'bg-green-100 text-green-700 border-green-200',
  escavador: 'bg-orange-100 text-orange-700 border-orange-200',
  merged: 'bg-purple-100 text-purple-700 border-purple-200',
  manual: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PROVIDER_LABELS: Record<string, string> = {
  datajud: 'DataJud',
  judit: 'Judit',
  escavador: 'Escavador',
  merged: 'Merged',
  manual: 'Manual',
}

interface ProviderBadgeProps {
  provider: string | null | undefined
}

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const key = provider?.toLowerCase() ?? 'manual'
  const style = PROVIDER_STYLES[key] ?? PROVIDER_STYLES.manual
  const label = PROVIDER_LABELS[key] ?? (provider ?? 'Manual')

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', style)}
    >
      {label}
    </Badge>
  )
}
