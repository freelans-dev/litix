'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, FileText, Clock, Check, BellOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface Alert {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  case_id: string
  created_at: string
}

const ALERT_ICONS: Record<string, React.ElementType> = {
  new_movement: FileText,
  deadline_approaching: Clock,
  status_change: Bell,
}

const POLL_INTERVAL = 30_000 // 30s

interface NotificationDropdownProps {
  initialCount?: number
}

export function NotificationDropdown({ initialCount = 0 }: NotificationDropdownProps) {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unreadCount, setUnreadCount] = useState(initialCount)
  const [open, setOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/alerts?filter=unread&limit=5')
      if (!res.ok) return
      const json = await res.json()
      setAlerts(json.data ?? [])
      setUnreadCount(json.count ?? 0)
    } catch {
      // silent
    }
  }, [])

  // Poll for new alerts
  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  // Refresh on open
  useEffect(() => {
    if (open) fetchAlerts()
  }, [open, fetchAlerts])

  async function handleMarkRead(alertId: string) {
    try {
      await fetch(`/api/v1/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // silent
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/v1/alerts', { method: 'PATCH' })
      setAlerts([])
      setUnreadCount(0)
      router.refresh()
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert-critical opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-alert-critical" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">Notificacoes</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Alert list */}
        <div className="max-h-80 overflow-y-auto">
          {alerts.length > 0 ? (
            alerts.map((alert) => {
              const Icon = ALERT_ICONS[alert.type] ?? Bell
              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-2.5 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                >
                  <div className="mt-0.5 p-1 rounded bg-primary/10 shrink-0">
                    <Icon size={12} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight line-clamp-1">
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {alert.body}
                    </p>
                    <span className="text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(alert.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    className="shrink-0 p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors mt-0.5"
                    title="Marcar como lido"
                  >
                    <Check size={12} />
                  </button>
                </div>
              )
            })
          ) : (
            <div className="py-8 text-center">
              <BellOff size={24} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Sem notificacoes</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Link
            href="/dashboard/alerts"
            onClick={() => setOpen(false)}
            className="block text-center text-xs text-primary hover:underline py-1.5"
          >
            Ver todos os alertas
            {unreadCount > 0 && ` (${unreadCount})`}
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
