/**
 * Fluxo completo: Escavador API -> ProcessoUnificado -> AppSheet flat JSON -> Webhook
 * Depois compara com Codilo lado a lado.
 * Usage: npx tsx src/test-escavador.ts [CNJ]
 */
import 'dotenv/config';
import { EscavadorProvider } from './providers/escavador/escavador.provider.js';
import { CodiloProvider } from './providers/codilo/codilo.provider.js';
import { transformToAppSheet, type AppSheetProcesso } from './transformers/appsheet.transformer.js';
import { dispatchToAppSheet } from './services/appsheet-dispatcher.service.js';
import { sleep } from './utils/sleep.js';

const cnj = process.argv[2] ?? '0804495-71.2018.8.10.0001';
const webhookUrl = process.env.APPSHEET_WEBHOOK_URL;

async function main() {
  // ═══════════════════════════════════════════
  // ESCAVADOR
  // ═══════════════════════════════════════════
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ESCAVADOR — CNJ: ${cnj}`);
  console.log(`${'='.repeat(60)}\n`);

  const escavador = new EscavadorProvider();

  console.log(`--- Etapa 1: Consulta Escavador ---`);
  const escResult = await escavador.searchByCnj(cnj);
  console.log(`Status: ${escResult.status} | RequestId: ${escResult.requestId}\n`);

  console.log(`--- Etapa 2: Poll (cache sincrono) ---`);
  const escProcesso = await escavador.pollResult(escResult.requestId);
  if (!escProcesso) {
    console.log('ERRO: nenhum dado retornado pelo Escavador.');
    process.exit(1);
  }
  console.log(`Dados recebidos! Movimentacoes: ${escProcesso.movimentacoes?.length ?? 0}\n`);

  console.log(`--- Etapa 3: Transform para AppSheet ---`);
  const escFlat = transformToAppSheet(escProcesso);
  console.log(JSON.stringify(escFlat, null, 2));

  // Dispatch
  if (webhookUrl) {
    console.log(`\n--- Etapa 4: POST Webhook ---`);
    const dr = await dispatchToAppSheet(webhookUrl, escFlat);
    console.log(`Dispatch: ${dr.success ? 'enviado' : 'falhou'} | Status: ${dr.status} ${dr.statusText}`);
    console.log(`Body: ${dr.body}`);
  }

  // ═══════════════════════════════════════════
  // CODILO (para comparacao)
  // ═══════════════════════════════════════════
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  CODILO (comparacao) — CNJ: ${cnj}`);
  console.log(`${'='.repeat(60)}\n`);

  const codilo = new CodiloProvider();

  console.log(`--- Consulta Codilo ---`);
  const codResult = await codilo.searchByCnj(cnj);
  console.log(`Sub-requests: ${codResult.requestId.split(',').length}`);

  let codProcesso = null;
  for (let attempt = 1; attempt <= 24; attempt++) {
    process.stdout.write(`Polling ${attempt}/24...`);
    await sleep(5000);
    codProcesso = await codilo.pollResult(codResult.requestId);
    if (codProcesso) {
      console.log(` DADOS!\n`);
      break;
    }
    console.log(` pendente`);
  }

  if (!codProcesso) {
    console.log('Codilo: timeout.\n');
    printComparison(escFlat, null);
    return;
  }

  const codFlat = transformToAppSheet(codProcesso);

  // ═══════════════════════════════════════════
  // COMPARACAO
  // ═══════════════════════════════════════════
  printComparison(escFlat, codFlat);
}

function printComparison(esc: AppSheetProcesso, cod: AppSheetProcesso | null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  COMPARACAO: Escavador vs Codilo`);
  console.log(`${'='.repeat(60)}\n`);

  const fields = Object.keys(esc) as (keyof AppSheetProcesso)[];
  const pad = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n);

  console.log(`${pad('Campo', 30)} | ${pad('Escavador', 40)} | ${pad('Codilo', 40)}`);
  console.log(`${'-'.repeat(30)}-+-${'-'.repeat(40)}-+-${'-'.repeat(40)}`);

  let escBetter = 0;
  let codBetter = 0;
  let equal = 0;

  for (const field of fields) {
    const escVal = String(esc[field] ?? '');
    const codVal = cod ? String(cod[field] ?? '') : '(sem dados)';

    let marker = ' ';
    if (cod) {
      const escHas = escVal !== '' && escVal !== 'null' && escVal !== '0';
      const codHas = codVal !== '' && codVal !== 'null' && codVal !== '0';
      if (escHas && !codHas) { marker = 'E'; escBetter++; }
      else if (!escHas && codHas) { marker = 'C'; codBetter++; }
      else { equal++; }
    }

    console.log(`${pad(field, 30)} | ${pad(escVal, 40)} | ${pad(codVal, 40)} ${marker}`);
  }

  if (cod) {
    console.log(`\n--- Resumo ---`);
    console.log(`Campos iguais (ambos tem/nao tem): ${equal}`);
    console.log(`Escavador melhor (E): ${escBetter}`);
    console.log(`Codilo melhor (C):    ${codBetter}`);
    console.log(`\nMovimentacoes: Escavador=${esc.steps} vs Codilo=${cod.steps}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
