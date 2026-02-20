import { Router, type Request, type Response } from 'express';

export function createUIRouter(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.type('html').send(getMainPageHtml());
  });

  router.get('/api/docs', (_req: Request, res: Response) => {
    res.type('html').send(getDocsPageHtml());
  });

  return router;
}

function getMainPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Litix - Consulta Processual</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .dot-green { background: #22c55e; }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #eab308; }
    pre.json { max-height: 500px; overflow: auto; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen text-gray-800">

  <!-- Header -->
  <header class="bg-white border-b shadow-sm">
    <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold text-indigo-700">Litix</h1>
        <span class="text-sm text-gray-400">Consulta Processual</span>
      </div>
      <div class="flex items-center gap-4">
        <div id="provider-status" class="flex items-center gap-3 text-xs"></div>
        <a href="/api/docs" class="text-sm text-indigo-600 hover:underline">API Docs</a>
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-6 py-8 space-y-6">

    <!-- API Key -->
    <div class="bg-white rounded-lg border p-4">
      <label class="block text-sm font-medium text-gray-600 mb-1">API Key</label>
      <input id="api-key" type="password" placeholder="Cole sua API_ACCESS_KEY aqui"
        class="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      <p class="text-xs text-gray-400 mt-1">Salvo no navegador. Necessario para autenticar chamadas a API.</p>
    </div>

    <!-- Search Form -->
    <div class="bg-white rounded-lg border p-6 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Tipo</label>
          <select id="tipo" class="w-full border rounded px-3 py-2 text-sm">
            <option value="cnj">CNJ</option>
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
            <option value="oab">OAB</option>
            <option value="nome">Nome</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-600 mb-1">Valor</label>
          <input id="valor" type="text" placeholder="0000000-00.0000.0.00.0000"
            class="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Provider</label>
          <select id="provider-select" class="w-full border rounded px-3 py-2 text-sm">
            <option value="todos">Todos</option>
            <option value="judit">Judit</option>
            <option value="codilo">Codilo</option>
            <option value="escavador">Escavador</option>
            <option value="predictus">Predictus</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" id="dispatch" checked class="rounded" />
          Enviar para AppSheet
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" id="completa" class="rounded" />
          Consulta completa (merge)
        </label>
      </div>

      <div class="flex gap-3">
        <button id="btn-consultar"
          class="bg-indigo-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-indigo-700 transition">
          Consultar
        </button>
        <button id="btn-lote"
          class="bg-gray-200 text-gray-700 px-6 py-2 rounded text-sm font-medium hover:bg-gray-300 transition">
          Consulta em Lote
        </button>
      </div>
    </div>

    <!-- Batch Area -->
    <div id="batch-area" class="bg-white rounded-lg border p-6 hidden space-y-4">
      <label class="block text-sm font-medium text-gray-600">Valores (um por linha)</label>
      <textarea id="batch-values" rows="6" placeholder="0804495-71.2018.8.10.0001&#10;0001234-56.2024.8.26.0100&#10;..."
        class="w-full border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"></textarea>
      <button id="btn-enviar-lote"
        class="bg-indigo-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-indigo-700 transition">
        Enviar Lote
      </button>
    </div>

    <!-- Loading -->
    <div id="loading" class="hidden text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-200 border-t-indigo-600"></div>
      <p class="text-sm text-gray-500 mt-2">Consultando...</p>
    </div>

    <!-- Result -->
    <div id="result-area" class="hidden space-y-4">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold">Resultado</h2>
        <span id="dispatch-badge" class="hidden text-xs px-2 py-1 rounded font-medium"></span>
        <span id="tempo-badge" class="text-xs text-gray-400"></span>
      </div>
      <pre id="result-json" class="json bg-gray-900 text-green-400 p-4 rounded-lg text-xs leading-relaxed"></pre>
    </div>

    <!-- History -->
    <div class="bg-white rounded-lg border">
      <div class="px-6 py-4 border-b">
        <h2 class="text-lg font-semibold">Historico de Consultas</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              <th class="px-6 py-3">Hora</th>
              <th class="px-6 py-3">Tipo</th>
              <th class="px-6 py-3">Valor</th>
              <th class="px-6 py-3">Status</th>
              <th class="px-6 py-3">Providers</th>
              <th class="px-6 py-3">Tempo</th>
              <th class="px-6 py-3">Dispatch</th>
            </tr>
          </thead>
          <tbody id="history-body" class="divide-y"></tbody>
        </table>
        <p id="history-empty" class="text-center text-gray-400 text-sm py-6">Nenhuma consulta ainda.</p>
      </div>
    </div>

  </main>

<script>
// --- State ---
const apiKeyInput = document.getElementById('api-key');
apiKeyInput.value = localStorage.getItem('litix_api_key') || '';
apiKeyInput.addEventListener('input', () => {
  localStorage.setItem('litix_api_key', apiKeyInput.value);
});

function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const key = apiKeyInput.value.trim();
  if (key) h['Authorization'] = 'Bearer ' + key;
  return h;
}

// --- Provider Status ---
async function loadProviderStatus() {
  try {
    const res = await fetch('/health/providers');
    const data = await res.json();
    const container = document.getElementById('provider-status');
    container.innerHTML = Object.entries(data).map(([name, info]) => {
      const dotClass = info.healthy ? 'dot-green' : info.circuitState === 'half-open' ? 'dot-yellow' : 'dot-red';
      return '<span class="flex items-center gap-1"><span class="dot ' + dotClass + '"></span>' + name + '</span>';
    }).join('');
  } catch {}
}

// --- Single Consultation ---
document.getElementById('btn-consultar').addEventListener('click', async () => {
  const tipo = document.getElementById('tipo').value;
  const valor = document.getElementById('valor').value.trim();
  if (!valor) return alert('Preencha o valor');

  const dispatch = document.getElementById('dispatch').checked;
  const completa = document.getElementById('completa').checked;
  const providerSelect = document.getElementById('provider-select').value;

  const body = { tipo, valor, dispatch, prioridade: completa ? 'completa' : 'rapida' };
  if (providerSelect !== 'todos') body.providers = [providerSelect];

  showLoading();
  try {
    const res = await fetch('/api/v1/consulta', { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      showResult(data, null, null, true);
    } else {
      showResult(data.processo, data.dispatch_status, data.tempo_ms, false);
    }
    loadHistory();
  } catch (err) {
    showResult({ error: err.message }, null, null, true);
  }
  hideLoading();
});

// --- Batch ---
document.getElementById('btn-lote').addEventListener('click', () => {
  document.getElementById('batch-area').classList.toggle('hidden');
});

document.getElementById('btn-enviar-lote').addEventListener('click', async () => {
  const tipo = document.getElementById('tipo').value;
  const text = document.getElementById('batch-values').value;
  const valores = text.split('\\n').map(v => v.trim()).filter(Boolean);
  if (valores.length === 0) return alert('Cole pelo menos um valor');

  const dispatch = document.getElementById('dispatch').checked;
  const completa = document.getElementById('completa').checked;
  const providerSelect = document.getElementById('provider-select').value;

  const body = { tipo, valores, dispatch, prioridade: completa ? 'completa' : 'rapida' };
  if (providerSelect !== 'todos') body.providers = [providerSelect];

  showLoading();
  try {
    const res = await fetch('/api/v1/consulta/batch', { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    showResult(data, null, null, !res.ok);
    loadHistory();
  } catch (err) {
    showResult({ error: err.message }, null, null, true);
  }
  hideLoading();
});

// --- UI Helpers ---
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('result-area').classList.add('hidden');
}
function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function showResult(data, dispatchStatus, tempoMs, isError) {
  const area = document.getElementById('result-area');
  area.classList.remove('hidden');
  document.getElementById('result-json').textContent = JSON.stringify(data, null, 2);

  const badge = document.getElementById('dispatch-badge');
  if (dispatchStatus) {
    badge.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700', 'bg-gray-100', 'text-gray-600');
    if (dispatchStatus === 'enviado') { badge.classList.add('bg-green-100', 'text-green-700'); badge.textContent = 'AppSheet: enviado'; }
    else if (dispatchStatus === 'falhou') { badge.classList.add('bg-red-100', 'text-red-700'); badge.textContent = 'AppSheet: falhou'; }
    else { badge.classList.add('bg-gray-100', 'text-gray-600'); badge.textContent = 'AppSheet: desativado'; }
  } else {
    badge.classList.add('hidden');
  }

  const tempo = document.getElementById('tempo-badge');
  tempo.textContent = tempoMs ? tempoMs + 'ms' : '';
}

// --- History ---
async function loadHistory() {
  try {
    const res = await fetch('/api/v1/status', { headers: getHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('history-body');
    const empty = document.getElementById('history-empty');

    if (!data.recent_queries || data.recent_queries.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    tbody.innerHTML = data.recent_queries.map(q => {
      const time = new Date(q.timestamp).toLocaleTimeString('pt-BR');
      const statusClass = q.status === 'ok' ? 'text-green-600' : 'text-red-600';
      const dispatchClass = q.dispatch === 'enviado' ? 'text-green-600' : q.dispatch === 'falhou' ? 'text-red-600' : 'text-gray-400';
      return '<tr class="hover:bg-gray-50">'
        + '<td class="px-6 py-3 text-gray-500">' + time + '</td>'
        + '<td class="px-6 py-3 uppercase font-medium">' + q.tipo + '</td>'
        + '<td class="px-6 py-3 font-mono text-xs">' + escapeHtml(q.valor) + '</td>'
        + '<td class="px-6 py-3 font-medium ' + statusClass + '">' + q.status + '</td>'
        + '<td class="px-6 py-3">' + (q.providers || []).join(', ') + '</td>'
        + '<td class="px-6 py-3">' + q.tempoMs + 'ms</td>'
        + '<td class="px-6 py-3 ' + dispatchClass + '">' + q.dispatch + '</td>'
        + '</tr>';
    }).join('');
  } catch {}
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// --- Init ---
loadProviderStatus();
loadHistory();
setInterval(loadProviderStatus, 30000);
</script>
</body>
</html>`;
}

function getDocsPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Litix API Documentation</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    pre { overflow-x: auto; }
    .endpoint { scroll-margin-top: 80px; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen text-gray-800">

  <header class="bg-white border-b shadow-sm sticky top-0 z-10">
    <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a href="/" class="text-2xl font-bold text-indigo-700">Litix</a>
        <span class="text-sm text-gray-400">API v1 Documentation</span>
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-8 space-y-10">

    <!-- TOC -->
    <nav class="bg-white rounded-lg border p-6">
      <h2 class="font-semibold mb-3">Endpoints</h2>
      <ul class="space-y-1 text-sm">
        <li><a href="#auth" class="text-indigo-600 hover:underline">Autenticacao</a></li>
        <li><a href="#post-consulta" class="text-indigo-600 hover:underline">POST /api/v1/consulta</a></li>
        <li><a href="#post-batch" class="text-indigo-600 hover:underline">POST /api/v1/consulta/batch</a></li>
        <li><a href="#get-status" class="text-indigo-600 hover:underline">GET /api/v1/status</a></li>
        <li><a href="#post-cnj" class="text-indigo-600 hover:underline">POST /api/v1/consulta/cnj (legacy)</a></li>
        <li><a href="#post-documento" class="text-indigo-600 hover:underline">POST /api/v1/consulta/documento (legacy)</a></li>
        <li><a href="#get-health" class="text-indigo-600 hover:underline">GET /health</a></li>
      </ul>
    </nav>

    <!-- Auth -->
    <section id="auth" class="endpoint bg-white rounded-lg border p-6 space-y-3">
      <h2 class="text-xl font-bold">Autenticacao</h2>
      <p class="text-sm text-gray-600">Todas as rotas <code>/api/v1/*</code> requerem autenticacao via header:</p>
      <pre class="bg-gray-900 text-green-400 p-4 rounded text-sm">Authorization: Bearer {API_ACCESS_KEY}</pre>
      <p class="text-sm text-gray-600">Configure a variavel <code>API_ACCESS_KEY</code> no <code>.env</code>. Se nao configurada, a autenticacao e desabilitada.</p>
    </section>

    <!-- POST /api/v1/consulta -->
    <section id="post-consulta" class="endpoint bg-white rounded-lg border p-6 space-y-4">
      <div class="flex items-center gap-3">
        <span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">POST</span>
        <code class="text-sm font-bold">/api/v1/consulta</code>
      </div>
      <p class="text-sm text-gray-600">Consulta unificada. Busca por CNJ, CPF, CNPJ, OAB ou Nome. Opcionalmente envia resultado para AppSheet.</p>

      <h4 class="font-semibold text-sm">Request Body</h4>
      <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs">{
  "tipo": "cnj" | "cpf" | "cnpj" | "oab" | "nome",
  "valor": "0804495-71.2018.8.10.0001",
  "dispatch": true,                          // envia pro AppSheet (default: true)
  "providers": ["judit", "codilo"],           // opcional, default: todos
  "prioridade": "rapida" | "completa"         // rapida = primeiro resultado, completa = merge
}</pre>

      <h4 class="font-semibold text-sm">Response (200)</h4>
      <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs">{
  "success": true,
  "processo": {
    "cnj": "0804495-71.2018.8.10.0001",
    "area": "tributario",
    "classe": "EXECUCAO FISCAL (1116)",
    "tribunal_sigla": "TJMA",
    "tribunal_nome": "...",
    "polo_ativo_nomes": "ESTADO DO MARANHAO",
    "polo_passivo_nomes": "...",
    "total_movimentacoes": 64,
    "... (32 campos flat)"
  },
  "dispatch_status": "enviado" | "falhou" | "desativado",
  "providers_consultados": ["codilo"],
  "tempo_ms": 4500
}</pre>

      <h4 class="font-semibold text-sm">curl</h4>
      <pre class="bg-gray-800 text-gray-200 p-4 rounded text-xs">curl -X POST http://localhost:3000/api/v1/consulta \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"tipo":"cnj","valor":"0804495-71.2018.8.10.0001","dispatch":true}'</pre>
    </section>

    <!-- POST /api/v1/consulta/batch -->
    <section id="post-batch" class="endpoint bg-white rounded-lg border p-6 space-y-4">
      <div class="flex items-center gap-3">
        <span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">POST</span>
        <code class="text-sm font-bold">/api/v1/consulta/batch</code>
      </div>
      <p class="text-sm text-gray-600">Consulta em lote (max 50 valores). Processa sequencialmente.</p>

      <h4 class="font-semibold text-sm">Request Body</h4>
      <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs">{
  "tipo": "cnj",
  "valores": [
    "0804495-71.2018.8.10.0001",
    "0001234-56.2024.8.26.0100"
  ],
  "dispatch": true,
  "providers": ["codilo"],
  "prioridade": "rapida"
}</pre>

      <h4 class="font-semibold text-sm">Response (200)</h4>
      <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs">{
  "total": 2,
  "sucesso": 1,
  "falha": 1,
  "resultados": [
    {
      "valor": "0804495-71.2018.8.10.0001",
      "status": "ok",
      "processo": { "... (32 campos)" },
      "dispatch_status": "enviado"
    },
    {
      "valor": "0001234-56.2024.8.26.0100",
      "status": "erro",
      "erro": "Process not found"
    }
  ]
}</pre>

      <h4 class="font-semibold text-sm">curl</h4>
      <pre class="bg-gray-800 text-gray-200 p-4 rounded text-xs">curl -X POST http://localhost:3000/api/v1/consulta/batch \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"tipo":"cnj","valores":["0804495-71.2018.8.10.0001"],"dispatch":true}'</pre>
    </section>

    <!-- GET /api/v1/status -->
    <section id="get-status" class="endpoint bg-white rounded-lg border p-6 space-y-4">
      <div class="flex items-center gap-3">
        <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">GET</span>
        <code class="text-sm font-bold">/api/v1/status</code>
      </div>
      <p class="text-sm text-gray-600">Status do sistema: providers, uptime, ultimas consultas.</p>

      <h4 class="font-semibold text-sm">Response (200)</h4>
      <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs">{
  "status": "online",
  "uptime": "2h 15m",
  "started_at": "2026-02-19T18:00:00.000Z",
  "providers": {
    "judit": { "healthy": true, "circuitState": "closed", "consecutiveFailures": 0 },
    "codilo": { "healthy": true, "circuitState": "closed", "consecutiveFailures": 0 },
    "escavador": { "healthy": true, "circuitState": "closed", "consecutiveFailures": 0 },
    "predictus": { "healthy": true, "circuitState": "closed", "consecutiveFailures": 0 }
  },
  "recent_queries": [ { "id": 1, "tipo": "cnj", "valor": "...", "status": "ok", "tempoMs": 4500 } ],
  "total_queries": 42
}</pre>

      <h4 class="font-semibold text-sm">curl</h4>
      <pre class="bg-gray-800 text-gray-200 p-4 rounded text-xs">curl http://localhost:3000/api/v1/status \\
  -H "Authorization: Bearer YOUR_KEY"</pre>
    </section>

    <!-- POST /api/v1/consulta/cnj (legacy) -->
    <section id="post-cnj" class="endpoint bg-white rounded-lg border p-6 space-y-4">
      <div class="flex items-center gap-3">
        <span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">POST</span>
        <code class="text-sm font-bold">/api/v1/consulta/cnj</code>
        <span class="text-xs text-gray-400">(legacy)</span>
      </div>
      <p class="text-sm text-gray-600">Consulta por CNJ retornando ProcessoUnificado completo (nao flat).</p>

      <h4 class="font-semibold text-sm">Request Body</h4>
      <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs">{
  "cnj": "0804495-71.2018.8.10.0001",
  "options": {
    "strategy": "race",
    "useCache": true,
    "timeout": 30000
  }
}</pre>

      <h4 class="font-semibold text-sm">Response (200)</h4>
      <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs">{
  "success": true,
  "data": { "cnj": "...", "area": "...", "partes": [...], "movimentacoes": [...] },
  "meta": { "sources": ["codilo"], "merged": false, "totalDurationMs": 3200 }
}</pre>

      <h4 class="font-semibold text-sm">curl</h4>
      <pre class="bg-gray-800 text-gray-200 p-4 rounded text-xs">curl -X POST http://localhost:3000/api/v1/consulta/cnj \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"cnj":"0804495-71.2018.8.10.0001"}'</pre>
    </section>

    <!-- POST /api/v1/consulta/documento (legacy) -->
    <section id="post-documento" class="endpoint bg-white rounded-lg border p-6 space-y-4">
      <div class="flex items-center gap-3">
        <span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">POST</span>
        <code class="text-sm font-bold">/api/v1/consulta/documento</code>
        <span class="text-xs text-gray-400">(legacy)</span>
      </div>
      <p class="text-sm text-gray-600">Consulta por documento (CPF, CNPJ, OAB ou nome).</p>

      <h4 class="font-semibold text-sm">Request Body</h4>
      <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs">{
  "documentType": "cpf",
  "documentValue": "12345678900"
}</pre>

      <h4 class="font-semibold text-sm">curl</h4>
      <pre class="bg-gray-800 text-gray-200 p-4 rounded text-xs">curl -X POST http://localhost:3000/api/v1/consulta/documento \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"documentType":"cpf","documentValue":"12345678900"}'</pre>
    </section>

    <!-- GET /health -->
    <section id="get-health" class="endpoint bg-white rounded-lg border p-6 space-y-4">
      <div class="flex items-center gap-3">
        <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">GET</span>
        <code class="text-sm font-bold">/health</code>
        <span class="text-xs text-gray-400">(sem auth)</span>
      </div>
      <p class="text-sm text-gray-600">Health check. Retorna status de todos os providers.</p>

      <h4 class="font-semibold text-sm">Response (200)</h4>
      <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs">{
  "status": "healthy",
  "providers": {
    "judit": { "healthy": true, "circuitState": "closed" },
    "codilo": { "healthy": true, "circuitState": "closed" },
    "escavador": { "healthy": true, "circuitState": "closed" },
    "predictus": { "healthy": true, "circuitState": "closed" }
  },
  "timestamp": "2026-02-19T21:00:00.000Z"
}</pre>

      <h4 class="font-semibold text-sm">curl</h4>
      <pre class="bg-gray-800 text-gray-200 p-4 rounded text-xs">curl http://localhost:3000/health</pre>
    </section>

    <footer class="text-center text-sm text-gray-400 py-8">
      Litix API v1 &mdash; Consulta Processual Unificada
    </footer>
  </main>

</body>
</html>`;
}
