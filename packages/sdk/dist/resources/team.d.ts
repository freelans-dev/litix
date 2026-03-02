import type { HttpClient } from '../http.js';
import type { TeamMember, InviteParams } from '../types.js';
export declare class TeamResource {
    private http;
    constructor(http: HttpClient);
    members(): Promise<{
        active: TeamMember[];
        pending: TeamMember[];
    }>;
    invite(data: InviteParams): Promise<{
        message: string;
    }>;
    changeRole(memberId: string, role: 'admin' | 'member' | 'viewer'): Promise<TeamMember>;
    deactivate(memberId: string): Promise<TeamMember>;
    remove(memberId: string): Promise<void>;
    resendInvite(memberId: string): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=team.d.ts.map