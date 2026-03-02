import { task } from '@trigger.dev/sdk/v3'
import { runOabImport } from '@/lib/oab-import'

interface OabImportPayload {
  importId: string
  tenantId: string
  memberId: string
  oabNumber: string
  oabUf: string
}

export const oabImportTask = task({
  id: 'oab-import',
  maxDuration: 600, // 10 minutos
  run: async (payload: OabImportPayload) => {
    const { importId } = payload
    await runOabImport(importId)
    return { importId }
  },
})
