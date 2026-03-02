export class TeamResource {
    http;
    constructor(http) {
        this.http = http;
    }
    members() {
        return this.http.get('/team/members');
    }
    invite(data) {
        return this.http.post('/team/invite', data);
    }
    changeRole(memberId, role) {
        return this.http.patch(`/team/members/${memberId}/role`, { role });
    }
    deactivate(memberId) {
        return this.http.patch(`/team/members/${memberId}/status`, { is_active: false });
    }
    remove(memberId) {
        return this.http.delete(`/team/${memberId}`);
    }
    resendInvite(memberId) {
        return this.http.post(`/team/members/${memberId}/resend`);
    }
}
//# sourceMappingURL=team.js.map