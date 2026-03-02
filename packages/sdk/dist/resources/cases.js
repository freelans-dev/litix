export class CasesResource {
    http;
    constructor(http) {
        this.http = http;
    }
    list(params) {
        return this.http.get('/cases', params);
    }
    get(cnj) {
        return this.http.get(`/cases/${cnj}`);
    }
    create(data) {
        return this.http.post('/cases', data);
    }
    update(cnj, data) {
        return this.http.patch(`/cases/${cnj}`, data);
    }
    delete(cnj) {
        return this.http.delete(`/cases/${cnj}`);
    }
    toggleMonitor(cnj, enabled) {
        return this.http.patch(`/cases/${cnj}/monitor`, { monitor_enabled: enabled });
    }
    refresh(cnj) {
        return this.http.post(`/cases/${cnj}/refresh`);
    }
    aiSummary(cnj, type = 'movements') {
        return this.http.post(`/cases/${cnj}/ai-summary`, { type });
    }
}
//# sourceMappingURL=cases.js.map