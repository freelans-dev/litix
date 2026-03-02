import type { HttpClient } from '../http.js';
import type { Case, CaseCreate, CaseUpdate, CaseListParams, PaginatedResponse, AiSummaryResult } from '../types.js';
export declare class CasesResource {
    private http;
    constructor(http: HttpClient);
    list(params?: CaseListParams): Promise<PaginatedResponse<Case>>;
    get(cnj: string): Promise<Case>;
    create(data: CaseCreate): Promise<Case>;
    update(cnj: string, data: CaseUpdate): Promise<Case>;
    delete(cnj: string): Promise<void>;
    toggleMonitor(cnj: string, enabled: boolean): Promise<Case>;
    refresh(cnj: string): Promise<{
        queued: boolean;
        cnj: string;
    }>;
    aiSummary(cnj: string, type?: 'movements' | 'timeline'): Promise<AiSummaryResult>;
}
//# sourceMappingURL=cases.d.ts.map