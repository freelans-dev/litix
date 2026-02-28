'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const PROVIDER_CHART_COLORS: Record<string, string> = {
  datajud: '#10b981',
  judit: '#3b82f6',
  codilo: '#a855f7',
  escavador: '#f59e0b',
  predictus: '#f43f5e',
}

interface AnalyticsChartsProps {
  dailyUsage: Array<Record<string, string | number>>
  providers: string[]
}

export function AnalyticsCharts({ dailyUsage, providers }: AnalyticsChartsProps) {
  if (dailyUsage.length === 0) return null

  // Format dates for display
  const formattedData = dailyUsage.map((d) => ({
    ...d,
    dateLabel: formatDate(d.date as string),
  }))

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <h2 className="font-semibold text-sm">Consultas Diárias (30 dias)</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px' }}
            />
            {providers.map((provider) => (
              <Area
                key={provider}
                type="monotone"
                dataKey={provider}
                name={provider.charAt(0).toUpperCase() + provider.slice(1)}
                stackId="1"
                stroke={PROVIDER_CHART_COLORS[provider] ?? '#888'}
                fill={PROVIDER_CHART_COLORS[provider] ?? '#888'}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parts[2]}/${parts[1]}`
}
