import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

interface ImportSummaryProps {
  imported: number
  tribunais: number
  onGoToDashboard: () => void
}

export function ImportSummary({
  imported,
  tribunais,
  onGoToDashboard,
}: ImportSummaryProps) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center space-y-5">
      <div className="flex justify-center">
        <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-green-900">
          Importação confirmada!
        </h2>
        <p className="text-sm text-green-700">
          {imported} processo{imported !== 1 ? 's' : ''} em{' '}
          {tribunais} tribunal{tribunais !== 1 ? 'is' : ''} com monitoramento ativo
        </p>
      </div>

      <Button onClick={onGoToDashboard} className="bg-green-700 hover:bg-green-800 text-white">
        Ver minha carteira
      </Button>
    </div>
  )
}
