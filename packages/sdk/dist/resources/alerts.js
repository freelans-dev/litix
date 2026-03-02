export class AlertsResource {
    http;
    constructor(http) {
        this.http = http;
    }
    list(params) {
        return this.http.get('/alerts', params);
    }
    markAllRead() {
        return this.http.patch('/alerts', { mark_all_read: true });
    }
    markRead(id, isRead = true) {
        return this.http.patch(`/alerts/${id}`, { is_read: isRead });
    }
}
//# sourceMappingURL=alerts.js.map