import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { formatCNJ } from '@/lib/crypto'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Hash,
  StickyNote,
  Search,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DocumentSearchForm } from '@/features/cases/components/document-search-form'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Cliente — Litix` }
}

export default async function ClientDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .maybeSingle()

  if (!client) notFound()

  // Processos vinculados a este cliente
  const { data: cases } = await supabase
    .from('monitored_cases')
    .select('id, cnj, tribunal, nome_caso, classe, status, ultimo_step_date, area')
    .eq('tenant_id', ctx.tenantId)
    .eq('client_id', client.id)
    .order('ultimo_step_date', { ascending: false, nullsFirst: false })

  const statusColor: Record<string, string> = {
    ativo: 'bg-success/10 text-success border-success/30',
    finalizado: 'bg-muted text-muted-foreground border-border',
    arquivado: 'bg-muted text-muted-foreground border-border',
    suspenso: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    cancelado: 'bg-destructive/10 text-destructive border-destructive/30',
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft size={14} />
          Clientes
        </Link>
        <div className="flex items-start gap-3 mt-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            {client.tipo_pessoa === 'juridica'
              ? <Building2 size={18} className="text-primary" />
              : <User size={18} className="text-primary" />
            }
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {client.tipo_pessoa && (
                <Badge variant="outline" className="text-xs">
                  {client.tipo_pessoa === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </Badge>
              )}
              {!client.is_active && (
                <Badge variant="secondary" className="text-xs">Inativo</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Client info */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Informações do cliente</h2>

          <div className="space-y-3 text-sm">
            {client.documento && (
              <div className="flex items-start gap-2.5">
                <Hash size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {client.documento.length === 11 ? 'CPF' : 'CNPJ'}
                  </p>
                  <p className="font-mono">{client.documento}</p>
                </div>
              </div>
            )}

            {client.email && (
              <div className="flex items-start gap-2.5">
                <Mail size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${client.email}`}
                    className="text-primary hover:underline"
                  >
                    {client.email}
                  </a>
                </div>
              </div>
            )}

            {client.phone && (
              <div className="flex items-start gap-2.5">
                <Phone size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p>{client.phone}</p>
                </div>
              </div>
            )}

            {(client.address_line || client.city || client.state) && (
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Endereço</p>
                  {client.address_line && <p>{client.address_line}</p>}
                  {(client.city || client.state) && (
                    <p className="text-muted-foreground">
                      {[client.city, client.state].filter(Boolean).join(' — ')}
                      {client.zip_code && ` — ${client.zip_code}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {client.notes && (
              <div className="flex items-start gap-2.5">
                <StickyNote size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                </div>
              </div>
            )}

            {!client.documento && !client.email && !client.phone && !client.address_line && !client.notes && (
              <p className="text-muted-foreground text-xs">Nenhuma informação adicional cadastrada.</p>
            )}
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground">
            Cadastrado {formatDistanceToNow(new Date(client.created_at), { addSuffix: true, locale: ptBR })}
          </div>
        </div>

        {/* Search + Linked processes */}
        <div className="space-y-5">
          {/* Document search */}
          {client.documento && (
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Search size={14} />
                Buscar processos
              </h2>
              <p className="text-xs text-muted-foreground">
                Busque todos os processos onde {client.name} aparece como parte.
              </p>
              <DocumentSearchForm
                plan={ctx.plan ?? 'free'}
                clientId={client.id}
                clientName={client.name}
              />
            </div>
          )}

          {/* Linked processes */}
          <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <FileText size={14} />
              Processos vinculados
              <Badge variant="secondary" className="text-xs">{cases?.length ?? 0}</Badge>
            </h2>
            <Link
              href={`/dashboard/cases?client=${client.id}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver em Processos
            </Link>
          </div>

          {!cases || cases.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <FileText size={28} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum processo vinculado.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Abra um processo e associe este cliente no campo &ldquo;Dados do escritório&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/cases/${c.cnj}`}
                  className="block rounded-lg border bg-card p-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-muted-foreground">{formatCNJ(c.cnj)}</p>
                      {(c.nome_caso || c.classe) && (
                        <p className="text-sm font-medium truncate mt-0.5">
                          {c.nome_caso ?? c.classe}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {c.tribunal && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">{c.tribunal}</Badge>
                        )}
                        {c.area && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 capitalize">{c.area}</Badge>
                        )}
                        {c.status && (
                          <span className={`text-xs px-1.5 py-0 rounded-full border font-medium ${statusColor[c.status] ?? statusColor.ativo}`}>
                            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    {c.ultimo_step_date && (
                      <p className="text-xs text-muted-foreground shrink-0 mt-0.5">
                        {formatDistanceToNow(new Date(c.ultimo_step_date), { addSuffix: true, locale: ptBR })}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
