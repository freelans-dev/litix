export class ApiKeysResource {
    http;
    constructor(http) {
        this.http = http;
    }
    list() {
        return this.http.get('/api-keys');
    }
    create(data) {
        return this.http.post('/api-keys', data ?? {});
    }
    update(id, data) {
        return this.http.patch(`/api-keys/${id}`, data);
    }
    revoke(id) {
        return this.http.delete(`/api-keys/${id}`);
    }
}
//# sourceMappingURL=api-keys.js.map