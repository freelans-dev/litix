import Link from 'next/link'
import { ArrowRight, Bell, CheckCircle, RefreshCw, Shield, Webhook, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">L</span>
            </div>
            <span className="font-semibold text-base">Litix</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground transition-colors">Planos</Link>
            <Link href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</Link>
          </nav>
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

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            5 providers de dados processuais integrados
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Nunca mais perca uma{' '}
            <span className="text-primary">movimentação processual</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Litix monitora todos os seus processos 24h/dia, consultando múltiplos tribunais e providers automaticamente. Receba alertas antes que os prazos virem problema.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg" asChild className="h-12 px-8">
              <Link href="/auth/signup">
                Começar grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8">
              <Link href="/pricing">Ver planos</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Gratuito para até 10 processos. Sem cartão de crédito.
          </p>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-8 border-y border-border bg-muted/30">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '5', label: 'Providers integrados' },
              { value: '100%', label: 'Multi-tribunal CNJ' },
              { value: '24/7', label: 'Monitoramento ativo' },
              { value: '< 1h', label: 'Alertas de movimentação' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-2xl font-bold text-primary">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              Tudo que você precisa para acompanhar seus processos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Desenvolvido especificamente para a realidade do advogado brasileiro
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: RefreshCw,
                title: 'Multi-Provider Automático',
                desc: 'Consulta DataJud, Codilo, Escavador, Judit e Predictus em paralelo. Se um provider falhar, outros garantem os dados.',
              },
              {
                icon: Bell,
                title: 'Alertas em Tempo Real',
                desc: 'Notificação por email + dashboard assim que uma movimentação é detectada. Nunca mais perca um prazo por não ter visto.',
              },
              {
                icon: Zap,
                title: 'Importação por OAB',
                desc: 'Cadastre seu número de OAB e o Litix importa automaticamente todos os seus processos. Zero digitação manual.',
              },
              {
                icon: Webhook,
                title: 'Webhooks para Integração',
                desc: 'Conecte o Litix ao Astrea, Projuris, planilhas ou qualquer sistema via HTTP POST com payload assinado HMAC.',
              },
              {
                icon: Shield,
                title: 'Multi-Tenant Seguro',
                desc: 'Estrutura de escritório com papéis (owner, admin, membro). RLS em todas as tabelas — dados completamente isolados.',
              },
              {
                icon: CheckCircle,
                title: 'Ficha Única do Processo',
                desc: 'Dados consolidados de todos os providers em uma só tela. Score de completude para saber qual fonte está mais atualizada.',
              },
            ].map((feat) => {
              const Icon = feat.icon
              return (
                <div key={feat.title} className="p-6 rounded-lg border bg-card space-y-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <h3 className="font-semibold">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold text-primary-foreground">
            Comece agora, é grátis
          </h2>
          <p className="text-primary-foreground/80">
            10 processos gratuitos, sem cartão de crédito. Importe seus processos em minutos pelo número de OAB.
          </p>
          <Button size="lg" variant="secondary" asChild className="h-12 px-8">
            <Link href="/auth/signup">
              Criar conta gratuita <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

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
            <Link href="/pricing" className="hover:text-foreground transition-colors">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
