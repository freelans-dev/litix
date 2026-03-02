import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/v1/import/[importId]/confirm
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { importId } = await params
  const service = createServiceClient()

  // Verify the oab_import record belongs to this tenant and is completed
  const { data: importRecord, error: importError } = await service
    .from('oab_imports')
    .select('id, tenant_id, status, cases_imported')
    .eq('id', importId)
    .single()

  if (importError || !importRecord) {
    return NextResponse.json({ error: 'Import not found' }, { status: 404 })
  }

  if (importRecord.tenant_id !== ctx.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (importRecord.status !== 'completed') {
    return NextResponse.json(
      { error: 'Import is not completed yet', status: importRecord.status },
      { status: 409 }
    )
  }

  return NextResponse.json({
    confirmed: true,
    cases_count: importRecord.cases_imported,
  })
}
