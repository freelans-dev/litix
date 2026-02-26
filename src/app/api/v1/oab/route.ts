import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  oab_number: z.string().min(3).regex(/^\d+$/),
  oab_state: z.string().length(2),
})

// POST /api/v1/oab — trigger OAB import job
export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only Solo+ plans can use OAB import
  if (ctx.plan === 'free') {
    return NextResponse.json(
      { error: 'OAB import requires Solo plan or higher', upgrade_url: '/pricing' },
      { status: 402 }
    )
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { oab_number, oab_state } = parsed.data

  // oab_imports table may not exist yet in schema — return mock response
  // In production: enqueue a Trigger.dev task to import processes
  const importRecord = {
    id: crypto.randomUUID(),
    tenant_id: ctx.tenantId,
    member_id: ctx.memberId,
    oab_number,
    oab_state: oab_state.toUpperCase(),
    status: 'pending',
    created_at: new Date().toISOString(),
  }

  // TODO: When oab_imports migration is applied, persist to DB and trigger job:
  // await supabase.from('oab_imports').insert({ ... })
  // await tasks.trigger('oab-import', { importId: importRecord.id })

  return NextResponse.json({ ...importRecord, queued: true }, { status: 201 })
}
