import type { HttpClient } from '../http.js'
import type { DocumentSearch, OabImport } from '../types.js'

export class SearchesResource {
  constructor(private http: HttpClient) {}

  // Document search (CPF/CNPJ)
  listDocumentSearches(): Promise<{ data: DocumentSearch[] }> {
    return this.http.get('/document-search')
  }

  byCpf(data: { document: string; client_id?: string }): Promise<DocumentSearch> {
    return this.http.post('/document-search', { ...data, document_type: 'cpf' })
  }

  byCnpj(data: { document: string; client_id?: string }): Promise<DocumentSearch> {
    return this.http.post('/document-search', { ...data, document_type: 'cnpj' })
  }

  // OAB import
  listOabImports(): Promise<{ data: OabImport[] }> {
    return this.http.get('/oab')
  }

  byOab(data: { oab_number: string; oab_uf: string }): Promise<OabImport> {
    return this.http.post('/oab', data)
  }

  deleteOabImport(oabNumber: string, oabUf: string): Promise<void> {
    return this.http.request('DELETE', `/oab?oab_number=${oabNumber}&oab_uf=${oabUf}`)
  }
}
