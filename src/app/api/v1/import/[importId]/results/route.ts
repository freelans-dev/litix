import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/v1/import/[importId]/results?page=1&page_size=20
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { importId } = await params
  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, parseInt(searchParams.get('page_size') ?? '20'))
  const offset = (page - 1) * pageSize

  const service = createServiceClient()

  // Fetch the oab_imports record to get timing and member context
  const { data: importRecord, error: importError } = await service
    .from('oab_imports')
    .select('id, tenant_id, member_id, started_at, completed_at, status')
    .eq('id', importId)
    .single()

  if (importError || !importRecord) {
    return NextResponse.json({ error: 'Import not found' }, { status: 404 })
  }

  if (importRecord.tenant_id !== ctx.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Determine the time window: started_at → completed_at + 5 minutes
  const windowStart = importRecord.started_at
  const windowEnd = importRecord.completed_at
    ? new Date(
        new Date(importRecord.completed_at).getTime() + 5 * 60 * 1000
      ).toISOString()
    : new Date().toISOString()

  let query = service
    .from('monitored_cases')
    .select(
      'id, cnj, tribunal, classe, assunto_principal, provider, data_distribuicao, monitor_enabled, created_at',
      { count: 'exact' }
    )
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  // Filter by member who triggered the import
  query = query.eq('import_source', 'oab_import')

  if (windowStart) {
    query = query.gte('created_at', windowStart)
  }

  query = query.lte('created_at', windowEnd)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [], count: count ?? 0, page, page_size: pageSize })
}
