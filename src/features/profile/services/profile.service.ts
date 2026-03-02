export const profileService = {
  async addOAB(oab_number: string, oab_uf: string) {
    const res = await fetch('/api/v1/oab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oab_number, oab_state: oab_uf }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? 'Erro ao adicionar OAB')
    }
    return res.json()
  },

  async removeOAB(oab_number: string, oab_uf: string) {
    const res = await fetch(`/api/v1/oab?oab_number=${oab_number}&oab_uf=${oab_uf}`, {
      method: 'DELETE',
    })
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? 'Erro ao remover OAB')
    }
  },

  async getImports() {
    const res = await fetch('/api/v1/oab')
    if (!res.ok) throw new Error('Erro ao buscar importações')
    return res.json()
  },
}
