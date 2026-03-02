import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextResponse } from 'next/server'

export async function GET() {
  const specPath = join(process.cwd(), 'src', 'openapi.yaml')
  const yaml = readFileSync(specPath, 'utf-8')
  return new NextResponse(yaml, {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  })
}
