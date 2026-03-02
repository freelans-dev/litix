/**
 * Client-side service for the OAB import feature.
 * Wraps API calls to /api/v1/import/[importId]/*
 */

export interface ImportResultsResponse {
  data: ImportedCase[]
  count: number
}

export interface ImportedCase {
  id: string
  cnj: string
  tribunal: string | null
  classe: string | null
  assunto_principal: string | null
  provider: string | null
  data_distribuicao: string | null
  monitor_enabled: boolean
  created_at: string
}

export interface ConfirmImportResponse {
  confirmed: boolean
  cases_count: number
}

export const importService = {
  async getResults(
    importId: string,
    page = 1,
    pageSize = 20
  ): Promise<ImportResultsResponse> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })
    const res = await fetch(
      `/api/v1/import/${importId}/results?${params.toString()}`
    )
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<ImportResultsResponse>
  },

  async confirmImport(importId: string): Promise<ConfirmImportResponse> {
    const res = await fetch(`/api/v1/import/${importId}/confirm`, {
      method: 'POST',
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<ConfirmImportResponse>
  },

  async removeCase(importId: string, caseId: string): Promise<void> {
    const res = await fetch(`/api/v1/import/${importId}/cases/${caseId}`, {
      method: 'DELETE',
    })
    if (!res.ok && res.status !== 204) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
  },
}
