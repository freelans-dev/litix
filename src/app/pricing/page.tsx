import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Planos e Preços — Litix',
  description: 'Escolha o plano ideal para seu escritório. Comece grátis com até 10 processos.',
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: 'R$ 0',
    period: 'para sempre',
    description: 'Para conhecer o Litix',
    highlight: false,
    cta: 'Começar grátis',
    ctaHref: '/auth/signup',
    features: [
      { label: '10 processos monitorados', included: true },
      { label: '1 usuário', included: true },
      { label: 'Consulta CNJ manual', included: true },
      { label: 'Dashboard básico', included: true },
      { label: 'Alertas por email', included: false },
      { label: 'Importação por OAB', included: false },
      { label: 'Webhooks', included: false },
      { label: 'Multi-usuário', included: false },
      { label: 'API pública', included: false },
    ],
  },
  {
    id: 'solo',
    name: 'Solo',
    price: 59,
    priceLabel: 'R$ 59',
    period: '/mês',
    description: 'Para advogados autônomos',
    highlight: false,
    cta: 'Assinar Solo',
    ctaHref: '/auth/signup?plan=solo',
    features: [
      { label: '200 processos monitorados', included: true },
      { label: '1 usuário', included: true },
      { label: 'Importação por OAB', included: true },
      { label: 'Alertas por email', included: true },
      { label: 'Monitoramento 24/7', included: true },
      { label: 'Cálculo de prazos', included: true },
      { label: 'Webhooks', included: false },
      { label: 'Multi-usuário', included: false },
      { label: 'API pública', included: false },
    ],
  },
  {
    id: 'escritorio',
    name: 'Escritório',
    price: 249,
    priceLabel: 'R$ 249',
    period: '/mês',
    description: 'Para escritórios de médio porte',
    highlight: true,
    badge: 'Mais popular',
    cta: 'Assinar Escritório',
    ctaHref: '/auth/signup?plan=escritorio',
    features: [
      { label: '1.000 processos monitorados', included: true },
      { label: '10 usuários', included: true },
      { label: 'Importação por OAB', included: true },
      { label: 'Alertas por email', included: true },
      { label: '5 webhooks', included: true },
      { label: 'Multi-advogado', included: true },
      { label: 'Relatórios exportáveis', included: true },
      { label: 'API pública', included: false },
      { label: 'Portal do cliente', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 599,
    priceLabel: 'R$ 599',
    period: '/mês',
    description: 'Para grandes escritórios',
    highlight: false,
    cta: 'Assinar Pro',
    ctaHref: '/auth/signup?plan=pro',
    features: [
      { label: '5.000 processos monitorados', included: true },
      { label: '30 usuários', included: true },
      { label: 'Importação por OAB', included: true },
      { label: 'Alertas por email', included: true },
      { label: '20 webhooks', included: true },
      { label: 'Multi-advogado', included: true },
      { label: 'Dashboard analytics', included: true },
      { label: 'API pública completa', included: true },
      { label: 'Portal do cliente', included: true },
    ],
  },
]

const faq = [
  {
    q: 'Posso mudar de plano depois?',
    a: 'Sim. Upgrade e downgrade são feitos instantaneamente pelo painel. Ao fazer upgrade, você é cobrado proporcionalmente pelo restante do mês.',
  },
  {
    q: 'O que acontece se eu atingir o limite de processos?',
    a: 'Você pode continuar consultando os processos já cadastrados. Para adicionar novos, é necessário fazer upgrade ou remover processos antigos.',
  },
  {
    q: 'Como funciona o monitoramento 24/7?',
    a: 'O Litix consulta 5 providers de dados processuais (DataJud, Codilo, Escavador, Judit, Predictus) em ciclos automáticos. Se qualquer provider retornar uma nova movimentação, você é alertado em até 1 hora.',
  },
  {
    q: 'O que é importação por OAB?',
    a: 'Você informa seu número de OAB e o Litix importa automaticamente todos os processos associados ao seu registro, sem digitação manual.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Sem fidelidade ou multa. Ao cancelar, você continua com acesso até o fim do período já pago.',
  },
  {
    q: 'Precisa de cartão de crédito para o plano Free?',
    a: 'Não. O plano Free é gratuito para sempre e não requer cartão de crédito.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">L</span>
            </div>
            <span className="font-semibold text-base">Litix</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/signup">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="pt-24 pb-20 px-4">
        {/* Header */}
        <div className="text-center mb-14 space-y-3 max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight">
            Preços simples e transparentes
          </h1>
          <p className="text-lg text-muted-foreground">
            Comece grátis. Faça upgrade conforme crescer. Sem surpresas na fatura.
          </p>
        </div>

        {/* Plans grid */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-6 flex flex-col ${
                plan.highlight
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              {plan.highlight && plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-base font-semibold mb-1">{plan.name}</h2>
                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.priceLabel}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat.label} className="flex items-start gap-2.5 text-sm">
                    {feat.included ? (
                      <Check size={15} className="text-success mt-0.5 shrink-0" />
                    ) : (
                      <Minus size={15} className="text-muted-foreground/40 mt-0.5 shrink-0" />
                    )}
                    <span className={feat.included ? 'text-foreground' : 'text-muted-foreground/60'}>
                      {feat.label}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={plan.highlight ? 'default' : 'outline'}
                className="w-full"
              >
                <Link href={plan.ctaHref}>
                  {plan.cta}
                  {plan.highlight && <ArrowRight className="ml-1.5 h-4 w-4" />}
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="rounded-xl border border-border bg-card p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-1">Enterprise</h3>
              <p className="text-muted-foreground">
                Processos ilimitados, usuários ilimitados, SLA contratual e suporte dedicado.
                Para grandes escritórios e departamentos jurídicos corporativos.
              </p>
            </div>
            <Button size="lg" variant="outline" asChild className="shrink-0">
              <Link href="mailto:contato@litix.com.br">Falar com vendas</Link>
            </Button>
          </div>
        </div>

        {/* Comparison table (simplified) */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Compare os planos</h2>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Recurso</th>
                  {plans.map((p) => (
                    <th key={p.id} className="px-4 py-3 font-medium text-center">
                      <span className={p.highlight ? 'text-primary font-semibold' : ''}>{p.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: 'Processos', values: ['10', '200', '1.000', '5.000'] },
                  { label: 'Usuários', values: ['1', '1', '10', '30'] },
                  { label: 'Importação OAB', values: [false, true, true, true] },
                  { label: 'Alertas email', values: [false, true, true, true] },
                  { label: 'Webhooks', values: ['0', '1', '5', '20'] },
                  { label: 'Rate limit (req/min)', values: ['60', '120', '300', '1.000'] },
                  { label: 'API pública', values: [false, false, false, true] },
                  { label: 'Portal do cliente', values: [false, false, false, true] },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground">{row.label}</td>
                    {row.values.map((val, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {typeof val === 'boolean' ? (
                          val ? (
                            <Check size={16} className="text-success mx-auto" />
                          ) : (
                            <Minus size={16} className="text-muted-foreground/30 mx-auto" />
                          )
                        ) : (
                          <span className={plans[i].highlight ? 'font-medium text-primary' : ''}>{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Perguntas frequentes</h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <div key={item.q} className="rounded-lg border bg-card p-5">
                <h3 className="font-semibold mb-2">{item.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">L</span>
            </div>
            <span>Litix © 2026</span>
          </div>
          <div className="flex gap-6">
            <Link href="/legal/termos" className="hover:text-foreground transition-colors">Termos</Link>
            <Link href="/legal/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
            <Link href="/" className="hover:text-foreground transition-colors">Início</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
