export class ClientsResource {
    http;
    constructor(http) {
        this.http = http;
    }
    list(params) {
        return this.http.get('/clients', params);
    }
    get(id) {
        return this.http.get(`/clients/${id}`);
    }
    create(data) {
        return this.http.post('/clients', data);
    }
    update(id, data) {
        return this.http.patch(`/clients/${id}`, data);
    }
    delete(id) {
        return this.http.delete(`/clients/${id}`);
    }
    exposureScore(id, options) {
        return this.http.get(`/clients/${id}/exposure-score`, { ai: options?.ai ? 'true' : undefined });
    }
}
//# sourceMappingURL=clients.js.map