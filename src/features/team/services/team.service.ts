export const teamService = {
  async getMembers() {
    const res = await fetch('/api/v1/team/members')
    if (!res.ok) throw new Error('Failed to fetch members')
    return res.json()
  },
  async updateRole(memberId: string, role: string) {
    const res = await fetch(`/api/v1/team/members/${memberId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) throw new Error('Failed to update role')
    return res.json()
  },
  async updateStatus(memberId: string, is_active: boolean) {
    const res = await fetch(`/api/v1/team/members/${memberId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    })
    if (!res.ok) throw new Error('Failed to update status')
    return res.json()
  },
  async resendInvite(memberId: string) {
    const res = await fetch(`/api/v1/team/members/${memberId}/resend`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to resend invite')
    return res.json()
  },
  async removeMember(memberId: string) {
    const res = await fetch(`/api/v1/team/${memberId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to remove member')
  },
}
