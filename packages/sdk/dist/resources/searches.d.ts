import type { HttpClient } from '../http.js';
import type { DocumentSearch, OabImport } from '../types.js';
export declare class SearchesResource {
    private http;
    constructor(http: HttpClient);
    listDocumentSearches(): Promise<{
        data: DocumentSearch[];
    }>;
    byCpf(data: {
        document: string;
        client_id?: string;
    }): Promise<DocumentSearch>;
    byCnpj(data: {
        document: string;
        client_id?: string;
    }): Promise<DocumentSearch>;
    listOabImports(): Promise<{
        data: OabImport[];
    }>;
    byOab(data: {
        oab_number: string;
        oab_uf: string;
    }): Promise<OabImport>;
    deleteOabImport(oabNumber: string, oabUf: string): Promise<void>;
}
//# sourceMappingURL=searches.d.ts.map