import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

// DELETE /api/v1/import/[importId]/cases/[caseId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ importId: string; caseId: string }> }
) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { importId, caseId } = await params
  const service = createServiceClient()

  // Verify the import belongs to this tenant
  const { data: importRecord } = await service
    .from('oab_imports')
    .select('id, tenant_id')
    .eq('id', importId)
    .single()

  if (!importRecord || importRecord.tenant_id !== ctx.tenantId) {
    return NextResponse.json({ error: 'Import not found' }, { status: 404 })
  }

  // Verify the case belongs to this tenant before deleting
  const { data: caseRecord } = await service
    .from('monitored_cases')
    .select('id, tenant_id')
    .eq('id', caseId)
    .single()

  if (!caseRecord) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  if (caseRecord.tenant_id !== ctx.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await service
    .from('monitored_cases')
    .delete()
    .eq('id', caseId)
    .eq('tenant_id', ctx.tenantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
