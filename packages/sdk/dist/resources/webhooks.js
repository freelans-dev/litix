export class WebhooksResource {
    http;
    constructor(http) {
        this.http = http;
    }
    list() {
        return this.http.get('/webhooks');
    }
    create(data) {
        return this.http.post('/webhooks', data);
    }
    update(id, data) {
        return this.http.patch(`/webhooks/${id}`, data);
    }
    delete(id) {
        return this.http.delete(`/webhooks/${id}`);
    }
}
//# sourceMappingURL=webhooks.js.map