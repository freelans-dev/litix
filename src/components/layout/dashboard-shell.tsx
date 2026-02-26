'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Bell,
  Webhook,
  Users,
  Building2,
  CreditCard,
  Search,
  Settings,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/dashboard/cases', label: 'Processos', icon: FileText },
  { href: '/dashboard/alerts', label: 'Alertas', icon: Bell },
  { href: '/dashboard/clients', label: 'Clientes', icon: Building2 },
  { href: '/dashboard/settings/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/dashboard/settings/team', label: 'Equipe', icon: Users },
  { href: '/dashboard/billing', label: 'Assinatura', icon: CreditCard },
]

interface DashboardShellProps {
  children: React.ReactNode
  userName: string
  tenantName: string
  unreadAlerts?: number
  plan?: string
}

export function DashboardShell({
  children,
  userName,
  tenantName,
  unreadAlerts = 0,
  plan = 'free',
}: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const q = searchRef.current?.value.trim()
      if (q) router.push(`/dashboard/cases?q=${encodeURIComponent(q)}`)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const PlanBadge = () => {
    const labels: Record<string, string> = {
      free: 'Free',
      solo: 'Solo',
      escritorio: 'Escritório',
      pro: 'Pro',
      enterprise: 'Enterprise',
    }
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-accent-foreground font-medium">
        {labels[plan] ?? plan}
      </span>
    )
  }

  const NavLinks = () => (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
        const count = item.label === 'Alertas' ? unreadAlerts : undefined

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            )}
          >
            <Icon size={17} className="shrink-0" />
            <span className="flex-1">{item.label}</span>
            {count != null && count > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 text-xs bg-alert-critical text-alert-critical-fg rounded-full">
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </Link>
        )
      })}
    </nav>
  )

  const Sidebar = ({ className }: { className?: string }) => (
    <div className={cn('flex flex-col h-full bg-sidebar text-sidebar-foreground', className)}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center">
          <span className="text-xs font-bold text-white">L</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground leading-tight">Litix</span>
          <PlanBadge />
        </div>
      </div>

      {/* Tenant */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/50 uppercase tracking-wider font-medium">
          Escritório
        </p>
        <p className="text-sm text-sidebar-foreground font-medium truncate mt-0.5">{tenantName}</p>
      </div>

      <NavLinks />

      {/* Bottom: user */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md hover:bg-sidebar-accent/60 transition-colors text-left">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                  {userName}
                </p>
              </div>
              <ChevronDown size={14} className="text-sidebar-foreground/50 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings size={14} className="mr-2" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut size={14} className="mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-200 md:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
        <button
          className="absolute top-4 right-4 p-1 rounded text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={18} />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile only) */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </Button>
          <span className="text-sm font-semibold">Litix</span>
          <Link href="/dashboard/alerts" className="relative p-2">
            <Bell size={18} />
            {unreadAlerts > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-alert-critical" />
            )}
          </Link>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-between h-14 px-6 border-b border-border bg-card shrink-0">
          <div className="relative w-72">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchRef}
              placeholder="Buscar por CNJ ou processo..."
              className="w-full h-9 pl-9 pr-4 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring cnj"
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/alerts" className="relative p-2 rounded-md hover:bg-muted transition-colors">
              <Bell size={18} className="text-muted-foreground" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-alert-critical" />
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
