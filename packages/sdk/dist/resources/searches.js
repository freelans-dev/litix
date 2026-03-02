export class SearchesResource {
    http;
    constructor(http) {
        this.http = http;
    }
    // Document search (CPF/CNPJ)
    listDocumentSearches() {
        return this.http.get('/document-search');
    }
    byCpf(data) {
        return this.http.post('/document-search', { ...data, document_type: 'cpf' });
    }
    byCnpj(data) {
        return this.http.post('/document-search', { ...data, document_type: 'cnpj' });
    }
    // OAB import
    listOabImports() {
        return this.http.get('/oab');
    }
    byOab(data) {
        return this.http.post('/oab', data);
    }
    deleteOabImport(oabNumber, oabUf) {
        return this.http.request('DELETE', `/oab?oab_number=${oabNumber}&oab_uf=${oabUf}`);
    }
}
//# sourceMappingURL=searches.js.map