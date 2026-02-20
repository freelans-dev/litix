/**
 * Quick test script to verify end-to-end Codilo API consultation.
 * Usage: npx tsx src/test-consulta.ts [CNJ]
 */
import { CodiloProvider } from './providers/codilo/codilo.provider.js';
import { logger } from './utils/logger.js';
import { sleep } from './utils/sleep.js';

const cnj = process.argv[2] ?? '0804495-71.2018.8.10.0001';

async function main() {
  const provider = new CodiloProvider();

  console.log(`\n🔍 Consultando CNJ: ${cnj}\n`);

  // 1. Initiate search
  const asyncResult = await provider.searchByCnj(cnj);
  console.log(`✅ Autorequest criado. Sub-requests: ${asyncResult.requestId.split(',').length}`);
  console.log(`   IDs: ${asyncResult.requestId.split(',').slice(0, 3).join(', ')}...\n`);

  // 2. Poll until we get data
  const maxAttempts = 24; // 2 minutes max (24 * 5s)
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`⏳ Polling... tentativa ${attempt}/${maxAttempts}`);
    await sleep(5000);

    const result = await provider.pollResult(asyncResult.requestId);

    if (result) {
      console.log('\n✅ DADOS RECEBIDOS!\n');
      console.log(JSON.stringify(result, null, 2));
      return;
    }
  }

  console.log('\n❌ Timeout: nenhum dado retornado após 2 minutos.');
}

main().catch((err) => {
  logger.error({ error: err }, 'Test failed');
  console.error(err);
  process.exit(1);
});
