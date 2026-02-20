/**
 * Fluxo completo: Codilo API -> ProcessoUnificado -> AppSheet flat JSON -> Webhook
 * Usage: npx tsx src/test-appsheet.ts [CNJ]
 */
import 'dotenv/config';
import { CodiloProvider } from './providers/codilo/codilo.provider.js';
import { transformToAppSheet } from './transformers/appsheet.transformer.js';
import { dispatchToAppSheet } from './services/appsheet-dispatcher.service.js';
import { sleep } from './utils/sleep.js';

const cnj = process.argv[2] ?? '0804495-71.2018.8.10.0001';
const webhookUrl = process.env.APPSHEET_WEBHOOK_URL;

async function main() {
  const provider = new CodiloProvider();

  console.log(`\n=== ETAPA 1: Consulta Codilo ===`);
  console.log(`CNJ: ${cnj}\n`);

  const asyncResult = await provider.searchByCnj(cnj);
  console.log(`Autorequest criado. Sub-requests: ${asyncResult.requestId.split(',').length}\n`);

  console.log(`=== ETAPA 2: Polling ===\n`);
  let processo = null;
  for (let attempt = 1; attempt <= 24; attempt++) {
    process.stdout.write(`Polling ${attempt}/24...`);
    await sleep(5000);
    processo = await provider.pollResult(asyncResult.requestId);
    if (processo) {
      console.log(` DADOS!\n`);
      break;
    }
    console.log(` pendente`);
  }

  if (!processo) {
    console.log('\nTimeout: nenhum dado retornado.');
    process.exit(1);
  }

  console.log(`=== ETAPA 3: Transform para AppSheet ===\n`);
  const flat = transformToAppSheet(processo);
  console.log(JSON.stringify(flat, null, 2));

  // ETAPA 4: POST webhook
  if (!webhookUrl) {
    console.log('\nAPPSHEET_WEBHOOK_URL nao configurada. Pulando envio.');
    return;
  }

  console.log(`\n=== ETAPA 4: POST Webhook (via AppSheet Dispatcher) ===`);
  console.log(`URL: ${webhookUrl}\n`);

  const result = await dispatchToAppSheet(webhookUrl, flat);

  console.log(`Status:  ${result.status} ${result.statusText}`);
  console.log(`Method:  ${result.method}`);
  console.log(`Success: ${result.success}`);
  console.log(`Body:\n${result.body}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
