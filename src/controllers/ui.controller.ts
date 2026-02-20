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
  <title>GregoSantos. · Litix</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:         #0c0c0e;
      --surface:    #161618;
      --surface-2:  #1e1e21;
      --border:     #2a2a2e;
      --border-2:   #3a3a3f;
      --gold:       #c9a84c;
      --gold-dim:   rgba(201,168,76,.10);
      --gold-hover: rgba(201,168,76,.18);
      --text:       #e8e6e2;
      --text-2:     #9b9a9e;
      --text-3:     #5a5a5f;
      --green:      #4caf7a;
      --amber:      #c9a84c;
      --red:        #c95a5a;
      --serif:      'DM Serif Display', Georgia, serif;
      --sans:       'DM Sans', system-ui, sans-serif;
      --mono:       'DM Mono', 'Fira Code', monospace;
    }

    html, body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      font-size: 14px;
      line-height: 1.6;
      min-height: 100vh;
    }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border-2); }

    /* ── Layout ── */
    .container { max-width: 1100px; margin: 0 auto; padding: 0 32px; }

    /* ── Header ── */
    header {
      border-bottom: 1px solid var(--border);
      background: var(--bg);
      position: sticky; top: 0; z-index: 100;
    }
    .header-inner {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 32px; max-width: 1100px; margin: 0 auto;
    }
    .brand { display: flex; align-items: baseline; gap: 16px; }
    .brand-name {
      font-family: var(--serif); font-size: 22px; color: var(--text);
      letter-spacing: -0.3px;
    }
    .brand-sep { color: var(--border-2); font-size: 18px; }
    .brand-sub {
      font-family: var(--sans); font-size: 11px; font-weight: 500;
      letter-spacing: 3px; text-transform: uppercase; color: var(--text-3);
    }
    .header-right { display: flex; align-items: center; gap: 20px; }
    #provider-status { display: flex; align-items: center; gap: 14px; }
    .status-pill {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: var(--text-3); letter-spacing: .5px;
    }
    .dot {
      width: 6px; height: 6px;
      background: var(--border-2);
      display: inline-block;
    }
    .dot-green { background: var(--green); }
    .dot-amber { background: var(--amber); }
    .dot-red   { background: var(--red); }
    .docs-link {
      font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
      color: var(--text-3); text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: color .2s, border-color .2s;
    }
    .docs-link:hover { color: var(--gold); border-color: var(--gold); }

    /* ── Main ── */
    main { padding: 40px 32px 80px; max-width: 1100px; margin: 0 auto; }

    /* ── Section label ── */
    .section-label {
      font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--text-3); margin-bottom: 10px;
    }

    /* ── Card surface ── */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 20px 24px;
    }

    /* ── API Key row ── */
    .apikey-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      margin-bottom: 24px;
    }
    .apikey-label {
      font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--gold); white-space: nowrap; flex-shrink: 0;
    }
    .apikey-input {
      flex: 1; background: transparent; border: none; outline: none;
      font-family: var(--mono); font-size: 12px; color: var(--text-2);
      caret-color: var(--gold);
    }
    .apikey-input::placeholder { color: var(--text-3); }

    /* ── Form ── */
    .form-grid {
      display: grid; grid-template-columns: 120px 1fr; gap: 0;
      border: 1px solid var(--border); margin-bottom: 16px;
    }
    .form-type {
      background: var(--surface-2); border-right: 1px solid var(--border);
      padding: 0;
    }
    .form-type select {
      width: 100%; height: 100%; background: transparent; border: none;
      outline: none; color: var(--text-2); font-family: var(--sans);
      font-size: 12px; letter-spacing: 1px; text-transform: uppercase;
      padding: 0 16px; cursor: pointer; appearance: none;
    }
    .form-valor { display: flex; align-items: center; background: var(--surface); }
    .form-valor input {
      flex: 1; background: transparent; border: none; outline: none;
      font-family: var(--mono); font-size: 14px; color: var(--text);
      padding: 14px 20px; caret-color: var(--gold);
    }
    .form-valor input::placeholder { color: var(--text-3); }

    /* ── Pills ── */
    .pills-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .pill {
      font-family: var(--sans); font-size: 11px; font-weight: 500;
      letter-spacing: 1.5px; text-transform: uppercase;
      padding: 6px 14px; cursor: pointer;
      border: 1px solid var(--border);
      background: var(--surface); color: var(--text-3);
      transition: all .18s;
    }
    .pill.active {
      border-color: var(--gold); background: var(--gold-dim);
      color: var(--gold);
    }
    .pill:hover:not(.active) { border-color: var(--border-2); color: var(--text-2); }

    /* ── Options row ── */
    .options-row {
      display: flex; align-items: center; gap: 24px; margin-bottom: 20px;
    }
    .toggle-label {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: var(--text-2); cursor: pointer;
      user-select: none;
    }
    .toggle-label input[type="checkbox"] {
      accent-color: var(--gold); width: 14px; height: 14px; cursor: pointer;
    }

    /* ── Actions row ── */
    .actions-row { display: flex; gap: 10px; margin-bottom: 32px; }
    .btn-primary {
      font-family: var(--sans); font-size: 11px; font-weight: 600;
      letter-spacing: 2px; text-transform: uppercase;
      padding: 10px 28px; cursor: pointer;
      background: var(--gold); color: #0c0c0e; border: none;
      transition: opacity .18s;
    }
    .btn-primary:hover { opacity: .85; }
    .btn-primary:disabled { opacity: .4; cursor: not-allowed; }
    .btn-secondary {
      font-family: var(--sans); font-size: 11px; font-weight: 500;
      letter-spacing: 1.5px; text-transform: uppercase;
      padding: 10px 24px; cursor: pointer;
      background: transparent; color: var(--text-2);
      border: 1px solid var(--border); transition: all .18s;
    }
    .btn-secondary:hover { border-color: var(--border-2); color: var(--text); }

    /* ── Batch area ── */
    #batch-area { margin-bottom: 24px; display: none; }
    .batch-textarea {
      width: 100%; background: var(--surface); border: 1px solid var(--border);
      color: var(--text); font-family: var(--mono); font-size: 12px;
      padding: 14px 18px; resize: vertical; outline: none;
      caret-color: var(--gold); min-height: 120px;
    }
    .batch-textarea::placeholder { color: var(--text-3); }

    /* ── Spinner ── */
    #loading {
      display: none; padding: 48px 0; text-align: center;
    }
    .spinner {
      width: 28px; height: 28px; margin: 0 auto 12px;
      border: 2px solid var(--border-2);
      border-top-color: var(--gold);
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-3); }

    /* ── Result area ── */
    #result-area { display: none; margin-bottom: 48px; }
    .result-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
    }
    .result-title {
      font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-3);
    }
    .result-badges { display: flex; gap: 8px; }
    .badge {
      font-size: 10px; letter-spacing: 1px; text-transform: uppercase;
      padding: 3px 10px; border: 1px solid;
    }
    .badge-green  { color: var(--green); border-color: var(--green); background: rgba(76,175,122,.08); }
    .badge-red    { color: var(--red);   border-color: var(--red);   background: rgba(201,90,90,.08); }
    .badge-amber  { color: var(--amber); border-color: var(--amber); background: var(--gold-dim); }
    .badge-muted  { color: var(--text-3); border-color: var(--border); }
    .badge-tempo  { color: var(--text-3); border-color: var(--border); font-family: var(--mono); }

    /* ── Process card ── */
    .process-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left-width: 3px;
      padding: 20px 24px;
      cursor: pointer;
      transition: background .18s;
      position: relative;
    }
    .process-card:hover { background: var(--surface-2); }
    .process-card + .process-card { margin-top: 8px; }

    .card-cnj {
      font-family: var(--mono); font-size: 13px; color: var(--gold);
      letter-spacing: .5px; margin-bottom: 6px;
    }
    .card-class {
      font-family: var(--serif); font-size: 17px; color: var(--text);
      margin-bottom: 10px; line-height: 1.3;
    }
    .card-parties {
      font-size: 12px; color: var(--text-2); margin-bottom: 12px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .card-meta {
      display: flex; gap: 20px; flex-wrap: wrap; align-items: center;
    }
    .card-meta-item {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: var(--text-3);
    }
    .card-meta-item strong { color: var(--text-2); font-weight: 500; }
    .card-score {
      margin-left: auto;
      font-family: var(--mono); font-size: 11px; padding: 2px 10px;
      border: 1px solid; opacity: .9;
    }
    .card-cta {
      position: absolute; top: 20px; right: 20px;
      font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--text-3);
    }

    /* ── History table ── */
    .history-section { margin-top: 8px; }
    .history-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }
    .table-wrap { overflow-x: auto; }
    table {
      width: 100%; border-collapse: collapse;
      font-size: 12px;
    }
    thead tr {
      border-bottom: 1px solid var(--border);
    }
    thead th {
      font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--text-3); font-weight: 500; padding: 10px 16px;
      text-align: left; white-space: nowrap;
    }
    tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background .15s;
    }
    tbody tr:hover { background: var(--surface); }
    tbody td {
      padding: 10px 16px; color: var(--text-2); vertical-align: middle;
    }
    td.mono { font-family: var(--mono); font-size: 11px; }
    td.ok   { color: var(--green); }
    td.erro { color: var(--red); }
    td.disp-ok   { color: var(--green); }
    td.disp-fail { color: var(--red); }
    td.disp-off  { color: var(--text-3); }
    .history-empty {
      text-align: center; padding: 40px; color: var(--text-3);
      font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
    }

    /* ── Modal ── */
    #modal {
      position: fixed; inset: 0; z-index: 200;
      display: none; align-items: flex-start; justify-content: flex-end;
    }
    #modal.open { display: flex; }
    .modal-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,.6);
      backdrop-filter: blur(2px);
    }
    .modal-panel {
      position: relative; z-index: 1;
      width: 520px; max-width: 100vw; height: 100vh;
      background: var(--surface);
      border-left: 1px solid var(--border);
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .modal-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .modal-cnj {
      font-family: var(--mono); font-size: 13px; color: var(--gold);
    }
    .modal-close {
      background: none; border: none; color: var(--text-3);
      font-size: 20px; cursor: pointer; padding: 2px 6px;
      line-height: 1; transition: color .15s;
    }
    .modal-close:hover { color: var(--text); }
    .modal-body { flex: 1; overflow-y: auto; padding: 24px; }
    .modal-group { margin-bottom: 28px; }
    .modal-group-title {
      font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--gold); margin-bottom: 14px;
      padding-bottom: 6px; border-bottom: 1px solid var(--border);
    }
    .modal-row {
      display: flex; gap: 12px; margin-bottom: 10px; font-size: 13px;
    }
    .modal-key {
      color: var(--text-3); flex: 0 0 130px; font-size: 11px;
      padding-top: 1px; white-space: nowrap;
    }
    .modal-val { color: var(--text); word-break: break-word; }
    .modal-val.mono { font-family: var(--mono); font-size: 12px; }
    .modal-movs {
      font-size: 11px; color: var(--text-2); line-height: 1.7;
    }
    .modal-movs span { display: block; }
    .modal-link {
      color: var(--gold); text-decoration: none; font-size: 12px;
      border-bottom: 1px solid transparent; transition: border-color .15s;
    }
    .modal-link:hover { border-color: var(--gold); }

    /* ── Monitoring section ── */
    .monitor-section { margin-top: 48px; }
    .monitor-tabs {
      display: flex; gap: 0; border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }
    .mtab {
      font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
      font-weight: 500; padding: 10px 20px; cursor: pointer;
      background: none; border: none; color: var(--text-3);
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: all .18s;
    }
    .mtab.active { color: var(--gold); border-bottom-color: var(--gold); }
    .mtab:hover:not(.active) { color: var(--text-2); }
    .mtab-panel { display: none; }
    .mtab-panel.active { display: block; }
    .monitor-status-bar {
      display: flex; gap: 24px; flex-wrap: wrap;
      padding: 14px 20px; background: var(--surface);
      border: 1px solid var(--border); margin-bottom: 20px;
    }
    .mstat {
      display: flex; flex-direction: column; gap: 2px;
    }
    .mstat-label {
      font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--text-3);
    }
    .mstat-val { font-size: 13px; color: var(--text-2); }
    .mstat-val.gold { color: var(--gold); }
    .monitor-add-row {
      display: flex; gap: 8px; margin-bottom: 16px;
    }
    .monitor-add-row input {
      flex: 1; background: var(--surface); border: 1px solid var(--border);
      color: var(--text); font-family: var(--mono); font-size: 12px;
      padding: 9px 14px; outline: none; caret-color: var(--gold);
    }
    .monitor-add-row input::placeholder { color: var(--text-3); }
    .monitor-add-row input:focus { border-color: var(--gold); }
    .btn-add {
      font-family: var(--sans); font-size: 10px; font-weight: 600;
      letter-spacing: 2px; text-transform: uppercase;
      padding: 9px 18px; cursor: pointer;
      background: var(--gold-dim); color: var(--gold);
      border: 1px solid var(--gold); transition: background .18s;
      white-space: nowrap;
    }
    .btn-add:hover { background: var(--gold-hover); }
    .monitor-list { margin-bottom: 24px; }
    .mentry {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: var(--surface);
      border: 1px solid var(--border); border-top: none;
      gap: 12px;
    }
    .mentry:first-child { border-top: 1px solid var(--border); }
    .mentry-cnj { font-family: var(--mono); font-size: 12px; color: var(--gold); }
    .mentry-meta { font-size: 11px; color: var(--text-3); flex: 1; }
    .mentry-status { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
    .mentry-status.ok { color: var(--green); }
    .mentry-status.alert { color: var(--amber); }
    .mentry-status.pending { color: var(--text-3); }
    .btn-remove {
      background: none; border: none; color: var(--text-3);
      font-size: 16px; cursor: pointer; padding: 2px 6px;
      line-height: 1; transition: color .15s;
    }
    .btn-remove:hover { color: var(--red); }
    .mentry-empty {
      padding: 32px; text-align: center;
      font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--text-3);
      background: var(--surface); border: 1px solid var(--border);
    }
    .alert-item {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 12px 16px; background: var(--surface);
      border: 1px solid var(--border); border-top: none;
    }
    .alert-item:first-child { border-top: 1px solid var(--border); }
    .alert-dot {
      width: 6px; height: 6px; flex-shrink: 0; margin-top: 5px;
    }
    .alert-dot.nova_movimentacao { background: var(--amber); }
    .alert-dot.novo_processo { background: var(--green); }
    .alert-time { font-size: 10px; color: var(--text-3); white-space: nowrap; }
    .alert-body { flex: 1; }
    .alert-cnj { font-family: var(--mono); font-size: 11px; color: var(--gold); }
    .alert-desc { font-size: 12px; color: var(--text-2); }

    /* ── Footer ── */
    footer {
      border-top: 1px solid var(--border);
      padding: 20px 32px;
      text-align: center;
    }
    .footer-text {
      font-size: 11px; letter-spacing: 1px; color: var(--text-3);
    }
    .footer-text em { font-family: var(--serif); font-style: normal; color: var(--text-2); }
  </style>
</head>
<body>

<!-- ══ Header ══════════════════════════════════════════════ -->
<header>
  <div class="header-inner">
    <div class="brand">
      <span class="brand-name">GregoSantos.</span>
      <span class="brand-sep">|</span>
      <span class="brand-sub">Litix</span>
    </div>
    <div class="header-right">
      <div id="provider-status"></div>
      <a href="/api/docs" class="docs-link">API Docs</a>
    </div>
  </div>
</header>

<!-- ══ Main ════════════════════════════════════════════════ -->
<main>

  <!-- API Key -->
  <div class="apikey-row">
    <span class="apikey-label">API Key</span>
    <input id="api-key" class="apikey-input" type="password" placeholder="Bearer token — salvo no navegador" autocomplete="off" />
  </div>

  <!-- Search form -->
  <div class="section-label">Consulta</div>
  <div class="form-grid">
    <div class="form-type">
      <select id="tipo">
        <option value="cnj">CNJ</option>
        <option value="cpf">CPF</option>
        <option value="cnpj">CNPJ</option>
        <option value="oab">OAB</option>
        <option value="nome">Nome</option>
      </select>
    </div>
    <div class="form-valor">
      <input id="valor" type="text" placeholder="0000000-00.0000.0.00.0000" autocomplete="off" />
    </div>
  </div>

  <!-- Provider pills -->
  <div class="section-label">Providers</div>
  <div class="pills-row" id="pills">
    <button class="pill active" data-provider="judit">Judit</button>
    <button class="pill active" data-provider="codilo">Codilo</button>
    <button class="pill active" data-provider="escavador">Escavador</button>
    <button class="pill active" data-provider="predictus">Predictus</button>
  </div>

  <!-- Options -->
  <div class="options-row">
    <label class="toggle-label">
      <input type="checkbox" id="dispatch" checked>
      Enviar para Sheets
    </label>
    <label class="toggle-label">
      <input type="checkbox" id="completa">
      Merge completo
    </label>
  </div>

  <!-- Actions -->
  <div class="actions-row">
    <button id="btn-consultar" class="btn-primary">Consultar</button>
    <button id="btn-lote" class="btn-secondary">Lote</button>
  </div>

  <!-- Batch -->
  <div id="batch-area" class="card" style="margin-bottom:24px;">
    <div class="section-label" style="margin-bottom:10px;">Valores — um por linha</div>
    <textarea id="batch-values" class="batch-textarea" rows="6"
      placeholder="0804495-71.2018.8.10.0001&#10;0001234-56.2024.8.26.0100"></textarea>
    <div style="margin-top:12px;">
      <button id="btn-enviar-lote" class="btn-primary">Enviar Lote</button>
    </div>
  </div>

  <!-- Loading -->
  <div id="loading">
    <div class="spinner"></div>
    <div class="spinner-label">Consultando</div>
  </div>

  <!-- Result -->
  <div id="result-area">
    <div class="result-header">
      <span class="result-title">Resultado</span>
      <div class="result-badges">
        <span id="badge-dispatch" class="badge" style="display:none"></span>
        <span id="badge-tempo" class="badge badge-muted" style="display:none"></span>
        <span id="badge-sources" class="badge badge-muted" style="display:none"></span>
      </div>
    </div>
    <div id="result-cards"></div>
  </div>

  <!-- History -->
  <div class="history-section">
    <div class="history-header">
      <div class="section-label" style="margin:0">Histórico</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Fontes</th>
            <th>Score</th>
            <th>Tempo</th>
            <th>Dispatch</th>
          </tr>
        </thead>
        <tbody id="history-body"></tbody>
      </table>
      <div id="history-empty" class="history-empty">Nenhuma consulta ainda.</div>
    </div>
  </div>

  <!-- ══ Monitoring ══════════════════════════════════════════ -->
  <div class="monitor-section">
    <div class="history-header" style="margin-bottom:16px">
      <div class="section-label" style="margin:0">Monitoramento Automático</div>
      <button id="btn-run-now" class="btn-secondary" style="font-size:10px;padding:6px 14px;">
        ▶ Forçar verificação
      </button>
    </div>

    <!-- Status bar -->
    <div class="monitor-status-bar" id="monitor-status-bar">
      <div class="mstat">
        <span class="mstat-label">CNJ monitor</span>
        <span class="mstat-val" id="mstat-cnj-last">—</span>
      </div>
      <div class="mstat">
        <span class="mstat-label">Próxima verificação</span>
        <span class="mstat-val" id="mstat-cnj-next">—</span>
      </div>
      <div class="mstat">
        <span class="mstat-label">CNJs monitorados</span>
        <span class="mstat-val gold" id="mstat-cnj-total">0</span>
      </div>
      <div class="mstat">
        <span class="mstat-label">Alertas últ. ciclo</span>
        <span class="mstat-val" id="mstat-cnj-alertas">0</span>
      </div>
      <div class="mstat">
        <span class="mstat-label">Docs monitorados</span>
        <span class="mstat-val gold" id="mstat-doc-total">0</span>
      </div>
      <div class="mstat">
        <span class="mstat-label">Novos últ. ciclo</span>
        <span class="mstat-val" id="mstat-doc-novos">0</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="monitor-tabs">
      <button class="mtab active" onclick="switchMTab('cnj')">CNJs</button>
      <button class="mtab" onclick="switchMTab('docs')">CPF / CNPJ</button>
      <button class="mtab" onclick="switchMTab('alertas')">Alertas</button>
    </div>

    <!-- Tab: CNJs -->
    <div class="mtab-panel active" id="mtab-cnj">
      <div class="monitor-add-row">
        <input id="m-cnj-input" type="text" placeholder="CNJ: 0000000-00.0000.0.00.0000" />
        <input id="m-cnj-cliente" type="text" placeholder="Cliente" style="max-width:180px" />
        <button class="btn-add" onclick="addMonitorCnj()">+ Adicionar</button>
      </div>
      <div class="monitor-list" id="monitor-cnj-list">
        <div class="mentry-empty" id="cnj-list-empty">Nenhum CNJ monitorado.</div>
      </div>
    </div>

    <!-- Tab: Docs -->
    <div class="mtab-panel" id="mtab-docs">
      <div class="monitor-add-row">
        <select id="m-doc-tipo" style="background:var(--surface-2);border:1px solid var(--border);color:var(--text-2);padding:9px 12px;font-size:12px;outline:none;cursor:pointer;appearance:none;min-width:80px;">
          <option value="cpf">CPF</option>
          <option value="cnpj">CNPJ</option>
        </select>
        <input id="m-doc-valor" type="text" placeholder="000.000.000-00" />
        <input id="m-doc-nome" type="text" placeholder="Nome" style="max-width:160px" />
        <input id="m-doc-cliente" type="text" placeholder="Cliente" style="max-width:160px" />
        <button class="btn-add" onclick="addMonitorDoc()">+ Adicionar</button>
      </div>
      <div class="monitor-list" id="monitor-doc-list">
        <div class="mentry-empty" id="doc-list-empty">Nenhum documento monitorado.</div>
      </div>
    </div>

    <!-- Tab: Alertas -->
    <div class="mtab-panel" id="mtab-alertas">
      <div id="monitor-alert-list">
        <div class="mentry-empty" id="alert-list-empty">Nenhum alerta registrado.</div>
      </div>
    </div>
  </div>

</main>

<!-- ══ Footer ══════════════════════════════════════════════ -->
<footer>
  <div class="footer-text">
    &copy; <em>GregoSantos.</em> Advogados &nbsp;&middot;&nbsp; OABPR 3.691
    &nbsp;&middot;&nbsp; Powered by Litix
  </div>
</footer>

<!-- ══ Detail Modal ════════════════════════════════════════ -->
<div id="modal">
  <div class="modal-backdrop" onclick="closeModal()"></div>
  <div class="modal-panel">
    <div class="modal-head">
      <span id="modal-cnj" class="modal-cnj">—</span>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>

<script>
// ── State ────────────────────────────────────────────────
const apiKeyInput = document.getElementById('api-key');
apiKeyInput.value = localStorage.getItem('gs_litix_key') || '';
apiKeyInput.addEventListener('input', () => localStorage.setItem('gs_litix_key', apiKeyInput.value.trim()));

function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const k = apiKeyInput.value.trim();
  if (k) h['Authorization'] = 'Bearer ' + k;
  return h;
}

// ── Provider pills ───────────────────────────────────────
document.querySelectorAll('#pills .pill').forEach(pill => {
  pill.addEventListener('click', () => pill.classList.toggle('active'));
});

function getActiveProviders() {
  return Array.from(document.querySelectorAll('#pills .pill.active'))
    .map(p => p.dataset.provider);
}

// ── Provider status ──────────────────────────────────────
async function loadProviderStatus() {
  try {
    const data = await fetch('/health/providers').then(r => r.json());
    const el = document.getElementById('provider-status');
    el.innerHTML = Object.entries(data).map(([name, info]) => {
      const cls = info.healthy ? 'dot-green' : info.circuitState === 'half-open' ? 'dot-amber' : 'dot-red';
      return '<span class="status-pill"><span class="dot ' + cls + '"></span>' + name + '</span>';
    }).join('');
  } catch {}
}

// ── Completeness color ───────────────────────────────────
function scoreColor(score) {
  if (score == null) return 'var(--border-2)';
  if (score >= 0.8) return 'var(--green)';
  if (score >= 0.5) return 'var(--gold)';
  return 'var(--red)';
}
function scoreLabel(score) {
  if (score == null) return '—';
  return Math.round(score * 100) + '%';
}

// ── Build result card ────────────────────────────────────
function buildCard(p, tempoMs, dispatchStatus, sources) {
  const score = p.completeness_score;
  const color = scoreColor(score);
  const div = document.createElement('div');
  div.className = 'process-card';
  div.style.borderLeftColor = color;

  const cls   = p.classe || p.classification || '—';
  const cnj   = p.numero || '—';
  const autor = p.autor || '—';
  const reu   = p.reu   || '—';
  const trib  = [p.tribunal_en, p.instancia ? p.instancia + 'ª Inst.' : '', p.justica].filter(Boolean).join(' · ');
  const movs  = p.steps || 0;
  const sit   = p.status || '—';

  div.innerHTML =
    '<div class="card-cta">Ver detalhes →</div>' +
    '<div class="card-cnj">' + esc(cnj) + '</div>' +
    '<div class="card-class">' + esc(cls) + '</div>' +
    '<div class="card-parties">' + esc(autor) + ' &nbsp;×&nbsp; ' + esc(reu) + '</div>' +
    '<div class="card-meta">' +
      (trib ? '<span class="card-meta-item"><strong>' + esc(trib) + '</strong></span>' : '') +
      '<span class="card-meta-item"><strong>' + movs + '</strong>&nbsp;movs.</span>' +
      '<span class="card-meta-item"><strong>' + esc(sit) + '</strong></span>' +
      '<span class="card-score" style="color:' + color + ';border-color:' + color + '">' + scoreLabel(score) + '</span>' +
    '</div>';

  div.addEventListener('click', () => openModal(p));
  return div;
}

// ── Show result ──────────────────────────────────────────
function showResult(p, tempoMs, dispatchStatus, sources) {
  const area = document.getElementById('result-area');
  area.style.display = 'block';

  // Badges
  const bdDispatch = document.getElementById('badge-dispatch');
  const bdTempo    = document.getElementById('badge-tempo');
  const bdSources  = document.getElementById('badge-sources');

  if (dispatchStatus) {
    bdDispatch.style.display = '';
    bdDispatch.textContent = dispatchStatus === 'enviado' ? 'Sheets: enviado'
      : dispatchStatus === 'falhou' ? 'Sheets: falhou' : 'Sheets: off';
    bdDispatch.className = 'badge ' + (dispatchStatus === 'enviado' ? 'badge-green'
      : dispatchStatus === 'falhou' ? 'badge-red' : 'badge-muted');
  } else {
    bdDispatch.style.display = 'none';
  }

  if (tempoMs) {
    bdTempo.style.display = '';
    bdTempo.textContent = tempoMs + 'ms';
  } else {
    bdTempo.style.display = 'none';
  }

  if (sources && sources.length) {
    bdSources.style.display = '';
    bdSources.textContent = sources.join(' + ');
  } else {
    bdSources.style.display = 'none';
  }

  const container = document.getElementById('result-cards');
  container.innerHTML = '';
  if (Array.isArray(p)) {
    p.forEach(item => {
      if (item.status === 'ok' && item.processo) {
        container.appendChild(buildCard(item.processo, null, item.dispatch_status, null));
      } else {
        const err = document.createElement('div');
        err.className = 'card';
        err.style.cssText = 'border-left:3px solid var(--red);margin-top:8px;';
        err.innerHTML = '<div class="card-cnj" style="color:var(--red)">' + esc(item.valor) + '</div>' +
          '<div style="color:var(--text-3);font-size:12px;margin-top:4px;">' + esc(item.erro || 'Erro') + '</div>';
        container.appendChild(err);
      }
    });
  } else {
    container.appendChild(buildCard(p, tempoMs, dispatchStatus, sources));
  }
}

// ── Modal ────────────────────────────────────────────────
let currentProcesso = null;

function openModal(p) {
  currentProcesso = p;
  document.getElementById('modal-cnj').textContent = p.numero || '—';

  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  // helper
  function group(title, rows) {
    const g = document.createElement('div');
    g.className = 'modal-group';
    g.innerHTML = '<div class="modal-group-title">' + title + '</div>';
    rows.forEach(([k, v, isMono]) => {
      if (v == null || v === '' || v === '0' || v === false) return;
      const row = document.createElement('div');
      row.className = 'modal-row';
      row.innerHTML = '<span class="modal-key">' + k + '</span>' +
        '<span class="modal-val' + (isMono ? ' mono' : '') + '">' + esc(String(v)) + '</span>';
      g.appendChild(row);
    });
    return g;
  }

  body.appendChild(group('Processo', [
    ['Número (CNJ)',    p.numero,        true],
    ['Classe',         p.classe,        false],
    ['Distribuição',   p.distribuicao,  false],
    ['Situação',       p.status,        false],
    ['Instância',      p.instancia != null ? p.instancia + 'ª instância' : null, false],
    ['Área',           p.tipo,          false],
    ['Caso',           p.caso,          false],
    ['Foro',           p.foro,          false],
    ['Órgão Julgador', p.orgao,         false],
    ['Tribunal',       p.tribunal_en,   false],
    ['Justiça',        p.justica,       false],
    ['Valor',          p.valor ? 'R$ ' + Number(p.valor).toLocaleString('pt-BR') : null, false],
    ['Ente Público',   p.ente,          false],
    ['Sigilo',         p.secrecy && p.secrecy !== '0' ? 'Nível ' + p.secrecy : null, false],
    ['Atualização',    p.atualizacao,   false],
    ['Score',          p.completeness_score != null ? Math.round(p.completeness_score * 100) + '%' : null, false],
    ['Fontes',         p.merged ? 'Merged' : p.request, true],
  ]));

  // Partes
  const partes = [];
  for (let i = 1; i <= 10; i++) {
    const nome = p['parte_' + i];
    if (!nome) break;
    partes.push([
      p['posicao_' + i] || 'parte',
      nome + (p['documento_' + i] ? ' · ' + p['documento_' + i] : '') +
        (p['advogado_' + i] ? ' (adv: ' + p['advogado_' + i] + ')' : '')
    ]);
  }
  if (partes.length) {
    body.appendChild(group('Partes', partes.map(([pos, val]) => [pos, val, false])));
  }

  // Últimas movimentações
  if (p.ultimas_5_movimentacoes) {
    const movGroup = document.createElement('div');
    movGroup.className = 'modal-group';
    movGroup.innerHTML = '<div class="modal-group-title">Últimas Movimentações</div>';
    const movDiv = document.createElement('div');
    movDiv.className = 'modal-movs';
    p.ultimas_5_movimentacoes.split(' | ').forEach(m => {
      const s = document.createElement('span');
      s.textContent = m;
      movDiv.appendChild(s);
    });
    movGroup.appendChild(movDiv);
    body.appendChild(movGroup);
  }

  // Meta
  const metaRows = [
    ['Total movs.', p.steps ? String(p.steps) : null, false],
    ['Dias sem mov.', p.dias_sem_movimentacao != null ? p.dias_sem_movimentacao + ' dias' : null, false],
    ['Assuntos', p.subjects, false],
  ];
  if (p.link_tribunal) {
    const linkGroup = document.createElement('div');
    linkGroup.className = 'modal-group';
    linkGroup.innerHTML = '<div class="modal-group-title">Links</div>' +
      '<div class="modal-row"><span class="modal-key">Tribunal</span>' +
      '<a href="' + p.link_tribunal + '" target="_blank" class="modal-link">' + esc(p.link_tribunal) + '</a></div>';
    body.appendChild(linkGroup);
  }
  const metaGrp = group('Meta', metaRows);
  if (metaGrp.querySelectorAll('.modal-row').length) body.appendChild(metaGrp);

  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
  currentProcesso = null;
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Single consultation ──────────────────────────────────
document.getElementById('btn-consultar').addEventListener('click', async () => {
  const tipo  = document.getElementById('tipo').value;
  const valor = document.getElementById('valor').value.trim();
  if (!valor) return;

  const dispatch   = document.getElementById('dispatch').checked;
  const completa   = document.getElementById('completa').checked;
  const providers  = getActiveProviders();

  const body = { tipo, valor, dispatch, prioridade: completa ? 'completa' : 'rapida' };
  if (providers.length > 0 && providers.length < 4) body.providers = providers;

  setLoading(true);
  try {
    const res  = await fetch('/api/v1/consulta', { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      showResult(data.processo, data.tempo_ms, data.dispatch_status, data.providers_consultados);
    } else {
      showError(data.error || data.message || JSON.stringify(data));
    }
    loadHistory();
  } catch (err) {
    showError(err.message);
  }
  setLoading(false);
});

// ── Batch ────────────────────────────────────────────────
document.getElementById('btn-lote').addEventListener('click', () => {
  const area = document.getElementById('batch-area');
  area.style.display = area.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('btn-enviar-lote').addEventListener('click', async () => {
  const tipo    = document.getElementById('tipo').value;
  const text    = document.getElementById('batch-values').value;
  const valores = text.split('\\n').map(v => v.trim()).filter(Boolean);
  if (!valores.length) return;

  const dispatch  = document.getElementById('dispatch').checked;
  const completa  = document.getElementById('completa').checked;
  const providers = getActiveProviders();

  const body = { tipo, valores, dispatch, prioridade: completa ? 'completa' : 'rapida' };
  if (providers.length > 0 && providers.length < 4) body.providers = providers;

  setLoading(true);
  try {
    const res  = await fetch('/api/v1/consulta/batch', { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) showResult(data.resultados, null, null, null);
    else showError(data.error || JSON.stringify(data));
    loadHistory();
  } catch (err) {
    showError(err.message);
  }
  setLoading(false);
});

// ── History ──────────────────────────────────────────────
async function loadHistory() {
  try {
    const res  = await fetch('/api/v1/status', { headers: getHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('history-body');
    const empty = document.getElementById('history-empty');

    if (!data.recent_queries || !data.recent_queries.length) {
      tbody.innerHTML = '';
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = data.recent_queries.map(q => {
      const time = new Date(q.timestamp).toLocaleTimeString('pt-BR');
      const statusCls = q.status === 'ok' ? 'ok' : 'erro';
      const dispCls   = q.dispatch === 'enviado' ? 'disp-ok' : q.dispatch === 'falhou' ? 'disp-fail' : 'disp-off';
      const score     = q.completeness_score != null ? Math.round(q.completeness_score * 100) + '%' : '—';
      return '<tr>'
        + '<td style="color:var(--text-3)">' + time + '</td>'
        + '<td style="letter-spacing:.5px;font-size:10px;text-transform:uppercase">' + esc(q.tipo) + '</td>'
        + '<td class="mono">' + esc(q.valor) + '</td>'
        + '<td>' + (q.providers || []).join(', ') + '</td>'
        + '<td class="mono">' + score + '</td>'
        + '<td class="mono" style="color:var(--text-3)">' + (q.tempoMs || 0) + 'ms</td>'
        + '<td class="' + dispCls + '">' + (q.dispatch || '—') + '</td>'
        + '</tr>';
    }).join('');
  } catch {}
}

// ── Helpers ──────────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function setLoading(on) {
  document.getElementById('loading').style.display = on ? 'block' : 'none';
  document.getElementById('btn-consultar').disabled = on;
  if (!on) return;
  document.getElementById('result-area').style.display = 'none';
}

function showError(msg) {
  const area = document.getElementById('result-area');
  area.style.display = 'block';
  document.getElementById('result-cards').innerHTML =
    '<div class="card" style="border-left:3px solid var(--red);">' +
    '<div style="color:var(--red);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">Erro</div>' +
    '<div style="font-family:var(--mono);font-size:12px;color:var(--text-2)">' + esc(msg) + '</div></div>';
  ['badge-dispatch','badge-tempo','badge-sources'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
}

// ── Monitoring ───────────────────────────────────────────
function switchMTab(id) {
  document.querySelectorAll('.mtab').forEach((t, i) => {
    const ids = ['cnj','docs','alertas'];
    t.classList.toggle('active', ids[i] === id);
  });
  document.querySelectorAll('.mtab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'mtab-' + id);
  });
}

async function loadMonitorStatus() {
  try {
    const res = await fetch('/api/v1/monitor/status', { headers: getHeaders() });
    if (!res.ok) return;
    const { data } = await res.json();
    const fmt = s => s ? new Date(s).toLocaleString('pt-BR') : '—';
    document.getElementById('mstat-cnj-last').textContent    = fmt(data.cnj_monitor.last_run);
    document.getElementById('mstat-cnj-next').textContent    = fmt(data.cnj_monitor.next_run);
    document.getElementById('mstat-cnj-total').textContent   = data.cnj_monitor.total_monitorados;
    document.getElementById('mstat-cnj-alertas').textContent = data.cnj_monitor.alertas_ultimo_ciclo;
    document.getElementById('mstat-doc-total').textContent   = data.cpf_monitor.total_monitorados;
    document.getElementById('mstat-doc-novos').textContent   = data.cpf_monitor.novos_ultimo_ciclo;
  } catch {}
}

async function loadMonitorCnjs() {
  try {
    const res = await fetch('/api/v1/monitor/cnj', { headers: getHeaders() });
    if (!res.ok) return;
    const { data } = await res.json();
    const list = document.getElementById('monitor-cnj-list');
    const empty = document.getElementById('cnj-list-empty');
    if (!data || !data.length) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    list.innerHTML = data.map(e =>
      '<div class="mentry">' +
        '<span class="mentry-cnj">' + esc(e.cnj) + '</span>' +
        '<span class="mentry-meta">' + esc(e.cliente) +
          (e.ultima_verificacao ? ' · ' + new Date(e.ultima_verificacao).toLocaleString('pt-BR') : '') +
          (e.total_movs_conhecido ? ' · ' + e.total_movs_conhecido + ' movs' : '') +
        '</span>' +
        '<span class="mentry-status ' + (e.ultimo_hash_movs ? 'ok' : 'pending') + '">' +
          (e.ultimo_hash_movs ? 'ativo' : 'aguardando') + '</span>' +
        '<button class="btn-remove" onclick="removeCnj(' + JSON.stringify(e.cnj) + ')" title="Remover">&times;</button>' +
      '</div>'
    ).join('');
  } catch {}
}

async function loadMonitorDocs() {
  try {
    const res = await fetch('/api/v1/monitor/documento', { headers: getHeaders() });
    if (!res.ok) return;
    const { data } = await res.json();
    const list = document.getElementById('monitor-doc-list');
    const empty = document.getElementById('doc-list-empty');
    if (!data || !data.length) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    list.innerHTML = data.map(e =>
      '<div class="mentry">' +
        '<span class="mentry-cnj">' + esc(e.tipo.toUpperCase() + ' ' + e.valor) + '</span>' +
        '<span class="mentry-meta">' + esc(e.nome) + ' · ' + esc(e.cliente) +
          ' · ' + e.cnjs_conhecidos.length + ' processos' + '</span>' +
        '<button class="btn-remove" onclick="removeDoc(' + JSON.stringify(e.valor) + ')" title="Remover">&times;</button>' +
      '</div>'
    ).join('');
  } catch {}
}

async function loadMonitorAlertas() {
  try {
    const res = await fetch('/api/v1/monitor/alertas', { headers: getHeaders() });
    if (!res.ok) return;
    const { data } = await res.json();
    const list = document.getElementById('monitor-alert-list');
    const empty = document.getElementById('alert-list-empty');
    if (!data || !data.length) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    list.innerHTML = data.map(a =>
      '<div class="alert-item">' +
        '<span class="alert-dot ' + a.tipo + '"></span>' +
        '<div class="alert-body">' +
          '<div class="alert-cnj">' + esc(a.cnj) + ' · ' + esc(a.cliente) + '</div>' +
          '<div class="alert-desc">' + esc(a.descricao) + '</div>' +
        '</div>' +
        '<span class="alert-time">' + new Date(a.timestamp).toLocaleString('pt-BR') + '</span>' +
      '</div>'
    ).join('');
  } catch {}
}

async function addMonitorCnj() {
  const cnj     = document.getElementById('m-cnj-input').value.trim();
  const cliente = document.getElementById('m-cnj-cliente').value.trim();
  if (!cnj || !cliente) return;
  try {
    const res = await fetch('/api/v1/monitor/cnj', {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ cnj, cliente }),
    });
    if (res.ok) {
      document.getElementById('m-cnj-input').value = '';
      document.getElementById('m-cnj-cliente').value = '';
      loadMonitorCnjs();
      loadMonitorStatus();
    } else {
      const d = await res.json();
      alert(d.error || 'Erro ao adicionar CNJ');
    }
  } catch(e) { alert(e.message); }
}

async function removeCnj(cnj) {
  if (!confirm('Remover ' + cnj + ' do monitoramento?')) return;
  try {
    await fetch('/api/v1/monitor/cnj/' + encodeURIComponent(cnj), {
      method: 'DELETE', headers: getHeaders(),
    });
    loadMonitorCnjs();
    loadMonitorStatus();
  } catch {}
}

async function addMonitorDoc() {
  const tipo    = document.getElementById('m-doc-tipo').value;
  const valor   = document.getElementById('m-doc-valor').value.trim();
  const nome    = document.getElementById('m-doc-nome').value.trim();
  const cliente = document.getElementById('m-doc-cliente').value.trim();
  if (!valor || !nome || !cliente) return;
  try {
    const res = await fetch('/api/v1/monitor/documento', {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ tipo, valor, nome, cliente }),
    });
    if (res.ok) {
      document.getElementById('m-doc-valor').value = '';
      document.getElementById('m-doc-nome').value = '';
      document.getElementById('m-doc-cliente').value = '';
      loadMonitorDocs();
      loadMonitorStatus();
    } else {
      const d = await res.json();
      alert(d.error || 'Erro ao adicionar documento');
    }
  } catch(e) { alert(e.message); }
}

async function removeDoc(valor) {
  if (!confirm('Remover ' + valor + ' do monitoramento?')) return;
  try {
    await fetch('/api/v1/monitor/documento/' + encodeURIComponent(valor), {
      method: 'DELETE', headers: getHeaders(),
    });
    loadMonitorDocs();
    loadMonitorStatus();
  } catch {}
}

document.getElementById('btn-run-now').addEventListener('click', async () => {
  const btn = document.getElementById('btn-run-now');
  btn.disabled = true;
  btn.textContent = '⏳ Executando...';
  try {
    await fetch('/api/v1/monitor/run', { method: 'POST', headers: getHeaders() });
    await Promise.all([loadMonitorStatus(), loadMonitorCnjs(), loadMonitorAlertas()]);
  } catch {}
  btn.disabled = false;
  btn.textContent = '▶ Forçar verificação';
});

// Also expose GET endpoints for listing (auto-monitor controller)
// We monkey-patch fetch to add list endpoints reading from monitor routes

// ── Init ────────────────────────────────────────────────
loadProviderStatus();
loadHistory();
loadMonitorStatus();
loadMonitorCnjs();
loadMonitorDocs();
loadMonitorAlertas();
setInterval(loadProviderStatus, 30000);
setInterval(() => { loadMonitorStatus(); loadMonitorAlertas(); }, 60000);
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
  <title>GregoSantos. · Litix API Docs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0c0c0e;--surface:#161618;--border:#2a2a2e;
      --gold:#c9a84c;--text:#e8e6e2;--text-2:#9b9a9e;--text-3:#5a5a5f;
      --green:#4caf7a;--serif:'DM Serif Display',Georgia,serif;
      --sans:'DM Sans',system-ui,sans-serif;--mono:'DM Mono','Fira Code',monospace;
    }
    html,body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px;line-height:1.7;min-height:100vh}
    ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--border)}
    header{border-bottom:1px solid var(--border);background:var(--bg);position:sticky;top:0;z-index:10}
    .header-inner{display:flex;align-items:center;justify-content:space-between;padding:18px 40px;max-width:860px;margin:0 auto}
    .brand-name{font-family:var(--serif);font-size:20px}
    .brand-sub{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text-3);margin-left:14px}
    a.back{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-3);text-decoration:none;border-bottom:1px solid transparent;transition:all .15s}
    a.back:hover{color:var(--gold);border-color:var(--gold)}
    main{max-width:860px;margin:0 auto;padding:40px 40px 80px}
    section{margin-bottom:48px}
    h2{font-family:var(--serif);font-size:22px;margin-bottom:16px;color:var(--text)}
    h3{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin:20px 0 10px}
    p{color:var(--text-2);margin-bottom:12px;font-size:13px}
    code{font-family:var(--mono);font-size:12px;background:var(--surface);padding:1px 6px;color:var(--gold)}
    pre{background:var(--surface);border:1px solid var(--border);padding:18px 20px;overflow-x:auto;font-family:var(--mono);font-size:12px;color:#9feaa5;line-height:1.6;margin-bottom:16px}
    .endpoint-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}
    .method{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border:1px solid}
    .method.post{color:var(--green);border-color:var(--green);background:rgba(76,175,122,.08)}
    .method.get{color:var(--gold);border-color:var(--gold);background:var(--gold-dim,rgba(201,168,76,.08))}
    .ep-path{font-family:var(--mono);font-size:14px;color:var(--text)}
    .ep-tag{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-3)}
    footer{border-top:1px solid var(--border);padding:20px 40px;text-align:center;font-size:11px;color:var(--text-3);letter-spacing:1px}
    footer em{font-family:var(--serif);font-style:normal;color:var(--text-2)}
  </style>
</head>
<body>
<header>
  <div class="header-inner">
    <div>
      <span class="brand-name">GregoSantos.</span>
      <span class="brand-sub">Litix API v1</span>
    </div>
    <a href="/" class="back">← Interface</a>
  </div>
</header>
<main>

  <section>
    <h2>Autenticação</h2>
    <p>Todas as rotas <code>/api/v1/*</code> requerem header:</p>
    <pre>Authorization: Bearer {API_ACCESS_KEY}</pre>
    <p>Configure <code>API_ACCESS_KEY</code> no <code>.env</code>. Se ausente, autenticação é desabilitada.</p>
  </section>

  <section>
    <div class="endpoint-head">
      <span class="method post">POST</span>
      <code class="ep-path">/api/v1/consulta</code>
    </div>
    <p>Consulta unificada por CNJ, CPF, CNPJ, OAB ou Nome. Retorna AppSheet flat JSON (90 campos).</p>
    <h3>Request</h3>
    <pre>{
  "tipo":      "cnj" | "cpf" | "cnpj" | "oab" | "nome",
  "valor":     "0804495-71.2018.8.10.0001",
  "dispatch":  true,
  "providers": ["judit", "codilo"],       // opcional
  "prioridade":"rapida" | "completa"      // completa = merge
}</pre>
    <h3>Response 200</h3>
    <pre>{
  "success": true,
  "processo": { /* AppSheetProcesso — 90 campos flat */ },
  "dispatch_status": "enviado" | "falhou" | "desativado",
  "providers_consultados": ["codilo"],
  "tempo_ms": 4500
}</pre>
    <h3>curl</h3>
    <pre>curl -X POST http://localhost:3000/api/v1/consulta \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"tipo":"cnj","valor":"0804495-71.2018.8.10.0001","dispatch":true}'</pre>
  </section>

  <section>
    <div class="endpoint-head">
      <span class="method post">POST</span>
      <code class="ep-path">/api/v1/consulta/batch</code>
    </div>
    <p>Lote de até 50 valores. Processamento sequencial.</p>
    <h3>Request</h3>
    <pre>{
  "tipo":    "cnj",
  "valores": ["0804495-71.2018.8.10.0001", "..."],
  "dispatch": true,
  "prioridade": "rapida"
}</pre>
    <h3>Response 200</h3>
    <pre>{
  "total": 2, "sucesso": 1, "falha": 1,
  "resultados": [
    { "valor": "...", "status": "ok", "processo": {}, "dispatch_status": "enviado" },
    { "valor": "...", "status": "erro", "erro": "Process not found" }
  ]
}</pre>
  </section>

  <section>
    <div class="endpoint-head">
      <span class="method get">GET</span>
      <code class="ep-path">/api/v1/status</code>
    </div>
    <p>Status do sistema, providers e últimas consultas.</p>
    <pre>{
  "status": "online",
  "uptime": "2h 15m",
  "providers": { "judit": { "healthy": true }, "codilo": { "healthy": true } },
  "recent_queries": [{ "tipo": "cnj", "valor": "...", "tempoMs": 4500 }],
  "total_queries": 42
}</pre>
  </section>

  <section>
    <div class="endpoint-head">
      <span class="method get">GET</span>
      <code class="ep-path">/health</code>
      <span class="ep-tag">sem auth</span>
    </div>
    <p>Health check de todos os providers.</p>
    <pre>{ "status": "healthy", "providers": { ... }, "timestamp": "..." }</pre>
  </section>

</main>
<footer>
  &copy; <em>GregoSantos.</em> Advogados &nbsp;&middot;&nbsp; OABPR 3.691
</footer>
</body>
</html>`;
}
