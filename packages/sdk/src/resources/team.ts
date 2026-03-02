import type { HttpClient } from '../http.js'
import type { TeamMember, InviteParams } from '../types.js'

export class TeamResource {
  constructor(private http: HttpClient) {}

  members(): Promise<{ active: TeamMember[]; pending: TeamMember[] }> {
    return this.http.get('/team/members')
  }

  invite(data: InviteParams): Promise<{ message: string }> {
    return this.http.post('/team/invite', data)
  }

  changeRole(memberId: string, role: 'admin' | 'member' | 'viewer'): Promise<TeamMember> {
    return this.http.patch(`/team/members/${memberId}/role`, { role })
  }

  deactivate(memberId: string): Promise<TeamMember> {
    return this.http.patch(`/team/members/${memberId}/status`, { is_active: false })
  }

  remove(memberId: string): Promise<void> {
    return this.http.delete(`/team/${memberId}`)
  }

  resendInvite(memberId: string): Promise<{ message: string }> {
    return this.http.post(`/team/members/${memberId}/resend`)
  }
}
