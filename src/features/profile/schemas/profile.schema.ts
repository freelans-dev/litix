import { z } from 'zod'

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

export const OABSchema = z.object({
  oab_number: z
    .string()
    .regex(/^\d+$/, 'Apenas números')
    .refine((v) => parseInt(v) >= 1 && parseInt(v) <= 999999, 'Número entre 1 e 999999'),
  oab_uf: z.string().refine((v) => ESTADOS.includes(v.toUpperCase()), 'UF inválida'),
})

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').optional(),
  phone: z.string().optional(),
})

export const ESTADOS_BR = ESTADOS
export type OABInput = z.infer<typeof OABSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
