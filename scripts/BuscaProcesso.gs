// ============================================================
//  LITIX — BuscaProcesso.gs  (v2 — self-contained)
//  Google Apps Script: busca processo DataJud + Codilo por CNJ
//
//  SETUP (uma vez, como admin):
//    1. Cole este arquivo em script.google.com
//    2. Execute criarTrigger() → autoriza permissões e instala
//       o gatilho automático na planilha
//    3. Pronto. Ao digitar/colar um CNJ na coluna "numero" da
//       aba "Processos", o script preenche todos os campos.
//
//  TRIGGER MANUAL:
//    buscarEGravar("50031200920218210021")
//
//  WEB APP (opcional):
//    POST { "cnj": "50031200920218210021" }
//    GET  ?cnj=50031200920218210021
// ============================================================

// ── Configurações ─────────────────────────────────────────────
var CFG = {
  SPREADSHEET_ID: '1JGc_vfBa1BnKUVTcva2bd8LTPliGWrdX-zFcsD-Qbrk',
  ABA_PROCESSOS:  'Processos',

  DATAJUD_API_KEY: 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==',
  DATAJUD_URL:     'https://api-publica.datajud.cnj.jus.br',

  CODILO_AUTH_URL:    'https://auth.codilo.com.br/oauth/token',
  CODILO_API_URL:     'https://api.capturaweb.com.br/v1',
  CODILO_CLIENT_ID:   'BEC46876AF2F117D',
  CODILO_CLIENT_SECRET: '2402242ce45fc74929f6fa0de27c912f',
  CODILO_POLL_MAX:    20,
  CODILO_POLL_MS:     3000,

  // Coluna que dispara o trigger (header exato da planilha)
  COLUNA_CNJ:    'numero',
  // Coluna sentinela: se já tiver conteúdo, não reprocesa
  COLUNA_STATUS: 'status',
};

// ── Mapeamento CNJ → alias DataJud ────────────────────────────
var DJ_ESTADUAL  = {
  '01':'tjac','02':'tjal','03':'tjam','04':'tjap','05':'tjba','06':'tjce',
  '07':'tjdft','08':'tjes','09':'tjgo','10':'tjma','11':'tjmt','12':'tjms',
  '13':'tjmg','14':'tjpa','15':'tjpb','16':'tjpr','17':'tjpe','18':'tjpi',
  '19':'tjrj','20':'tjrn','21':'tjrs','22':'tjro','23':'tjrr','24':'tjsc',
  '25':'tjse','26':'tjsp','27':'tjto',
};
var DJ_FEDERAL   = {'01':'trf1','02':'trf2','03':'trf3','04':'trf4','05':'trf5','06':'trf6'};
var DJ_TRABALHO  = {
  '00':'tst','01':'trt1','02':'trt2','03':'trt3','04':'trt4','05':'trt5',
  '06':'trt6','07':'trt7','08':'trt8','09':'trt9','10':'trt10','11':'trt11',
  '12':'trt12','13':'trt13','14':'trt14','15':'trt15','16':'trt16','17':'trt17',
  '18':'trt18','19':'trt19','20':'trt20','21':'trt21','22':'trt22','23':'trt23','24':'trt24',
};
var DJ_ELEITORAL = {
  '00':'tse','01':'treac','02':'treal','03':'tream','04':'treap','05':'treba',
  '06':'trece','07':'tredf','08':'trees','09':'trego','10':'trema','11':'tremt',
  '12':'trems','13':'tremg','14':'trepa','15':'trepb','16':'trepr','17':'trepe',
  '18':'trepi','19':'trerj','20':'trern','21':'trers','22':'trero','23':'trerr',
  '24':'tresc','25':'trese','26':'tresp','27':'treto',
};

// ── Helpers CNJ ───────────────────────────────────────────────

function cnjParaAlias(cnj) {
  var fmt = cnjFormatado(cnj);
  var m   = fmt.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/);
  if (!m) return null;
  var j = m[1], tt = m[2], suf = null;
  if      (j==='1') suf = 'stf';
  else if (j==='3') suf = 'stj';
  else if (j==='7') suf = (tt==='00'||tt==='01') ? 'stm' : null;
  else if (j==='8') suf = DJ_ESTADUAL[tt]  || null;
  else if (j==='4') suf = DJ_FEDERAL[tt]   || null;
  else if (j==='5') suf = DJ_TRABALHO[tt]  || null;
  else if (j==='6') suf = DJ_ELEITORAL[tt] || null;
  return suf ? 'api_publica_' + suf : null;
}

function cnjFormatado(raw) {
  var d = (raw || '').replace(/\D/g,'');
  if (d.length !== 20) return raw || '';
  return d.slice(0,7)+'-'+d.slice(7,9)+'.'+d.slice(9,13)+'.'+d.slice(13,14)+'.'+d.slice(14,16)+'.'+d.slice(16,20);
}

function cnjDigits(cnj) { return (cnj||'').replace(/\D/g,''); }

function justicaBr(cnj) {
  var d = cnjDigits(cnj);
  if (d.length!==20) return '';
  var m = {'1':'STF','2':'CNJ','3':'STJ','4':'Federal','5':'Trabalhista',
            '6':'Eleitoral','7':'Militar','8':'Estadual','9':'Militar Estadual'};
  return m[d[13]] || '';
}

function justicaEn(cnj) {
  var d = cnjDigits(cnj);
  if (d.length!==20) return '';
  var m = {'1':'Federal Supreme Court (STF)','2':'National Justice Council',
            '3':'Superior Court of Justice','4':'Federal Justice','5':'Labour Justice',
            '6':'Electoral Justice','7':'Military Justice','8':'State Justice','9':'State Military Justice'};
  return m[d[13]] || '';
}

// ── Codilo — token com cache ───────────────────────────────────

function codiloToken() {
  var cache = CacheService.getScriptCache();
  var tok   = cache.get('codilo_tok');
  if (tok) { Logger.log('[Codilo] token do cache'); return tok; }

  var body = 'grant_type=client_credentials'
           + '&id='     + encodeURIComponent(CFG.CODILO_CLIENT_ID)
           + '&secret=' + encodeURIComponent(CFG.CODILO_CLIENT_SECRET);

  var r = UrlFetchApp.fetch(CFG.CODILO_AUTH_URL, {
    method:'post', contentType:'application/x-www-form-urlencoded',
    payload:body, muteHttpExceptions:true,
  });
  if (r.getResponseCode()!==200)
    throw new Error('Codilo auth HTTP ' + r.getResponseCode());

  var d = JSON.parse(r.getContentText());
  var ttl = Math.min(Math.max((d.expires_in||3600)-60, 60), 21600);
  cache.put('codilo_tok', d.access_token, ttl);
  Logger.log('[Codilo] novo token, TTL=' + ttl + 's');
  return d.access_token;
}

// ── DataJud ───────────────────────────────────────────────────

function buscarDatajud(cnj) {
  var alias = cnjParaAlias(cnj);
  if (!alias) { Logger.log('[DJ] tribunal não mapeado: '+cnj); return null; }

  var r = UrlFetchApp.fetch(CFG.DATAJUD_URL+'/'+alias+'/_search', {
    method:'post', contentType:'application/json',
    headers:{Authorization:'ApiKey '+CFG.DATAJUD_API_KEY},
    payload: JSON.stringify({query:{term:{numeroProcesso:cnjDigits(cnj)}},size:1}),
    muteHttpExceptions:true,
  });

  if (r.getResponseCode()!==200) {
    Logger.log('[DJ] HTTP '+r.getResponseCode()); return null;
  }
  var body  = JSON.parse(r.getContentText());
  var hits  = (body.hits && body.hits.hits) || [];
  if (!hits.length) { Logger.log('[DJ] sem resultado'); return null; }
  Logger.log('[DJ] OK — '+hits[0]._source.tribunal);
  return hits[0]._source;
}

// ── Codilo ────────────────────────────────────────────────────

function buscarCodilo(cnj) {
  try {
    var tok = codiloToken();
    var fmt = cnjFormatado(cnj);

    // autorequest
    var ar = UrlFetchApp.fetch(CFG.CODILO_API_URL+'/autorequest', {
      method:'post', contentType:'application/json',
      headers:{Authorization:'Bearer '+tok},
      payload: JSON.stringify({key:'cnj', value:fmt}),
      muteHttpExceptions:true,
    });
    var arCode = ar.getResponseCode();
    if (arCode!==200 && arCode!==201) {
      Logger.log('[Codilo] autorequest HTTP '+arCode+': '+ar.getContentText().slice(0,200));
      return null;
    }
    var arData = JSON.parse(ar.getContentText());
    var ids = ((arData.data && arData.data.requests) || []).map(function(x){return x.id;});
    Logger.log('[Codilo] '+ids.length+' sub-requests');

    // poll cada sub-request
    for (var i=0; i<ids.length; i++) {
      var res = codiloPollar(tok, ids[i]);
      if (res) { Logger.log('[Codilo] dados via '+ids[i]); return res; }
    }
    Logger.log('[Codilo] sem dados em nenhum sub-request');
    return null;
  } catch(e) {
    Logger.log('[Codilo] erro: '+e.message);
    return null;
  }
}

function codiloPollar(tok, id) {
  for (var i=0; i<CFG.CODILO_POLL_MAX; i++) {
    Utilities.sleep(CFG.CODILO_POLL_MS);
    var r = UrlFetchApp.fetch(CFG.CODILO_API_URL+'/request/'+id, {
      method:'get', headers:{Authorization:'Bearer '+tok}, muteHttpExceptions:true,
    });
    if (r.getResponseCode()!==200) continue;
    var d = JSON.parse(r.getContentText());
    var st = d.requested && d.requested.status;
    Logger.log('[Codilo] poll #'+(i+1)+' '+id+' → '+st);
    if (st==='success' && d.data && d.data.length) return d.data[0];
    if (st==='error' || st==='not_found') return null;
  }
  return null;
}

// ── Extração de campos ────────────────────────────────────────

/**
 * Transforma cover[] em mapa {description → value}.
 * Ex: [{description:'Valor da Causa',value:'R$ 10.000,00'}]
 *     → {'Valor da Causa':'R$ 10.000,00'}
 */
function coverMap(cover) {
  var m = {};
  if (!cover) return m;
  for (var i=0; i<cover.length; i++) m[cover[i].description] = cover[i].value;
  return m;
}

/** Pega o primeiro valor não vazio de uma lista de chaves no mapa cover. */
function coverGet(map) {
  var keys = Array.prototype.slice.call(arguments, 1);
  for (var i=0; i<keys.length; i++) {
    var v = map[keys[i]];
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

/** Converte string de valor monetário para número. */
function parseValor(str) {
  if (!str) return null;
  var s = String(str).replace(/[R$\s\.]/g,'').replace(',','.');
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Converte "20210302143554" → "2021-03-02" */
function fmtDataRaw(raw) {
  if (!raw || raw.length<8) return raw||'';
  return raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8);
}

/** Normaliza datas ISO ou BR para "YYYY-MM-DD". */
function fmtData(str) {
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0,10);
  var br = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return br[3]+'-'+br[2]+'-'+br[1];
  return str.slice(0,10);
}

/** Determina polo (autor/reu) a partir do campo pole do Codilo. */
function mapPolo(pole) {
  var t = (pole||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if (t.includes('activ')||t.includes('ativo')||t.includes('autor')||t.includes('requerente')||t.includes('exequente')) return 'autor';
  if (t.includes('passiv')||t.includes('reu')||t.includes('requerido')||t.includes('executado')) return 'reu';
  if (t.includes('advog')) return 'advogado';
  return pole||'';
}

/**
 * Monta objeto completo com todos os campos para a planilha,
 * usando DataJud como base e Codilo para enriquecer/sobrescrever.
 */
function montarCampos(cnj, dj, co) {
  var f = {
    // ── Processo ──
    numero:              cnjFormatado(cnj),
    distribuicao:        '',
    distribuicao_origem: '',
    autor:               '',
    reu:                 '',
    caso:                '',
    foro:                '',
    tipo:                '',
    natureza:            '',
    classe:              '',
    classe_origem:       '',
    valor:               null,
    status:              '',
    justica:             justicaBr(cnj),
    instancia:           null,
    ente:                '',
    orgao:               '',
    atualizacao:         '',
    andamento:           '',

    // ── Tracking ──
    timestamp:  new Date().toISOString().replace('T',' ').slice(0,19),
    request:    '',
    step:       '',
    steps:      0,

    // ── Internacional ──
    justice:        justicaEn(cnj),
    tribunal_en:    (cnjParaAlias(cnj)||'').replace('api_publica_','').toUpperCase(),
    instance_en:    '',
    acronym:        (cnjParaAlias(cnj)||'').replace('api_publica_','').toUpperCase(),
    secrecy:        '0',
    subjects:       '',
    classification: '',
    court:          '',

    // ── Meta ──
    link_tribunal:            '',
    ultimas_5_movimentacoes:  '',
    dias_sem_movimentacao:    null,

    // ── Partes (até 10) ──
    parte_1:'', posicao_1:'', documento_1:'', advogado_1:'',
    parte_2:'', posicao_2:'', documento_2:'', advogado_2:'',
    parte_3:'', posicao_3:'', documento_3:'', advogado_3:'',
    parte_4:'', posicao_4:'', documento_4:'', advogado_4:'',
    parte_5:'', posicao_5:'', documento_5:'', advogado_5:'',
    parte_6:'', posicao_6:'', documento_6:'', advogado_6:'',
    parte_7:'', posicao_7:'', documento_7:'', advogado_7:'',
    parte_8:'', posicao_8:'', documento_8:'', advogado_8:'',
    parte_9:'', posicao_9:'', documento_9:'', advogado_9:'',
    parte_10:'',posicao_10:'',documento_10:'',advogado_10:'',
  };

  // ── Preenche com DataJud ──────────────────────────────────
  if (dj) {
    f.tribunal_en    = dj.tribunal || f.tribunal_en;
    f.acronym        = f.tribunal_en;
    f.classe         = (dj.classe && dj.classe.nome) || '';
    f.classification = f.classe;
    f.subjects       = (dj.assuntos||[]).map(function(a){return a.nome;}).join(' | ');
    f.caso           = f.classe + (f.subjects ? ' — ' + dj.assuntos[0].nome : '');
    f.orgao          = (dj.orgaoJulgador && dj.orgaoJulgador.nome) || '';
    f.court          = f.orgao;
    f.distribuicao   = fmtDataRaw(dj.dataAjuizamento);
    f.atualizacao    = (dj.dataHoraUltimaAtualizacao||'').slice(0,10);
    f.secrecy        = String(dj.nivelSigilo||0);
    f.instancia      = dj.grau === 'G2' ? 2 : (dj.grau === 'G1' ? 1 : null);
    f.instance_en    = f.instancia ? String(f.instancia) : '';

    // Movimentações DataJud
    var movsDJ = (dj.movimentos||[]).slice().sort(function(a,b){
      return (b.dataHora||'') > (a.dataHora||'') ? 1 : -1;
    });
    f.steps   = movsDJ.length;
    f.step    = movsDJ[0] ? movsDJ[0].nome : '';
    f.andamento = movsDJ[0] ? movsDJ[0].nome + ' (' + (movsDJ[0].dataHora||'').slice(0,10) + ')' : '';
    f.ultimas_5_movimentacoes = movsDJ.slice(0,5).map(function(m){
      return '[' + (m.dataHora||'').slice(0,10) + '] ' + m.nome;
    }).join(' | ');
    if (movsDJ[0] && movsDJ[0].dataHora) {
      f.dias_sem_movimentacao = Math.floor((Date.now() - new Date(movsDJ[0].dataHora).getTime())/(86400000));
    }

    // Partes DataJud (se presentes)
    if (dj.partes && dj.partes.length) {
      preencherPartes(f, dj.partes.map(function(p){
        return {nome:p.nome||'', polo:p.polo||'', doc:p.cpfCnpj||'', adv:''};
      }));
    }
  }

  // ── Preenche / enriquece com Codilo ──────────────────────
  if (co) {
    var cv = coverMap(co.cover);
    var pr = co.properties || {};

    // Classe
    var classeRaw = pr['class'] || coverGet(cv,'Classe Judicial','Classe','Classe Processual');
    f.classe         = classeRaw.replace(/\s*\(\d+\)\s*$/, '').trim() || f.classe;
    f.classification = f.classe;

    // Assunto / Caso
    var assunto = pr.subject || coverGet(cv,'Assunto','Assunto Principal');
    f.subjects  = assunto || f.subjects;
    f.caso      = f.classe + (assunto ? ' — ' + assunto.split(' - ')[0] : '');
    f.tipo      = mapArea(assunto);
    f.natureza  = f.tipo;

    // Datas
    var dtDist = pr.startAt || coverGet(cv,'Data da Distribuição','Data de Distribuição','Data Distribuição');
    if (dtDist) f.distribuicao = fmtData(dtDist);

    // Foro / Órgão
    f.foro  = pr.jurisdiction || coverGet(cv,'Jurisdição','Foro','Comarca') || f.foro;
    f.orgao = pr.origin       || coverGet(cv,'Órgão Julgador','Vara','Juízo') || f.orgao;
    f.court = f.orgao;

    // Status / situação
    var st = pr.status || coverGet(cv,'Situação','Situacao','Status do Processo','Status');
    f.status = st || f.status;

    // Instância / Grau
    var grauStr = pr.degree || coverGet(cv,'Grau','Instância','Instancia','Grau do Processo');
    if (grauStr) {
      var grauNum = parseInt(grauStr, 10);
      f.instancia  = isNaN(grauNum) ? f.instancia : grauNum;
      f.instance_en = String(f.instancia||'');
    }

    // ── VALOR DA CAUSA ────────────────────────────────────
    var valorStr = pr.actionValue
                || coverGet(cv, 'Valor da Ação','Valor da Causa','Valor Ação','Valor Causa','Valor');
    f.valor = parseValor(valorStr);

    // Tribunal
    var sigla = pr.jurisdiction || coverGet(cv,'Tribunal');
    if (sigla) { f.tribunal_en = sigla; f.acronym = sigla; }

    // Request ID
    f.request = (co._requestId || '');

    // Movimentações Codilo (steps)
    if (co.steps && co.steps.length) {
      var movsCo = co.steps.slice().sort(function(a,b){
        return (b.timestamp||'') > (a.timestamp||'') ? 1 : -1;
      });
      f.steps   = movsCo.length;
      f.step    = movsCo[0] ? movsCo[0].title : f.step;
      f.andamento = movsCo[0]
        ? movsCo[0].title + ' (' + (movsCo[0].timestamp||'').slice(0,10) + ')'
        : f.andamento;
      f.ultimas_5_movimentacoes = movsCo.slice(0,5).map(function(m){
        return '[' + (m.timestamp||'').slice(0,10) + '] ' + m.title;
      }).join(' | ');
      f.atualizacao = (movsCo[0] && movsCo[0].timestamp) ? movsCo[0].timestamp.slice(0,10) : f.atualizacao;
      if (movsCo[0] && movsCo[0].timestamp) {
        f.dias_sem_movimentacao = Math.floor((Date.now() - new Date(movsCo[0].timestamp).getTime())/(86400000));
      }
    }

    // Partes Codilo (people) — sobrescreve DataJud
    if (co.people && co.people.length) {
      preencherPartes(f, co.people.map(function(p){
        var adv = (p.lawyers||[]).map(function(l){return l.name;}).join('; ');
        return {nome:p.name||'', polo:mapPolo(p.pole||p.description||''), doc:p.doc||'', adv:adv};
      }));
    }
  }

  // Autor / Réu (derivados das partes já preenchidas)
  var autores = [], reus = [];
  for (var n=1; n<=10; n++) {
    var nm = f['parte_'+n], po = f['posicao_'+n];
    if (!nm) continue;
    if (po==='autor') autores.push(nm);
    else if (po==='reu') reus.push(nm);
  }
  f.autor = autores.join('; ');
  f.reu   = reus.join('; ');

  // Ente público
  var todasPartes = [];
  for (var k=1; k<=10; k++) if (f['parte_'+k]) todasPartes.push(f['parte_'+k]);
  f.ente = detectEnte(todasPartes);

  return f;
}

function preencherPartes(f, partes) {
  var max = Math.min(partes.length, 10);
  for (var i=0; i<max; i++) {
    var n = i+1, p = partes[i];
    f['parte_'+n]    = p.nome  || '';
    f['posicao_'+n]  = p.polo  || '';
    f['documento_'+n]= p.doc   || '';
    f['advogado_'+n] = p.adv   || '';
  }
}

function mapArea(assunto) {
  if (!assunto) return '';
  var t = assunto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if (t.includes('civel')||t.includes('civil')||t.includes('contrato')||t.includes('obrigac')) return 'civel';
  if (t.includes('crimin')||t.includes('penal')) return 'criminal';
  if (t.includes('trabalh')||t.includes('clt')) return 'trabalhista';
  if (t.includes('tribut')||t.includes('fiscal')) return 'tributario';
  if (t.includes('administrat')) return 'administrativo';
  if (t.includes('consumidor')||t.includes('cdc')) return 'consumidor';
  if (t.includes('previdenc')||t.includes('inss')) return 'previdenciario';
  if (t.includes('eleitoral')) return 'eleitoral';
  return '';
}

function detectEnte(nomes) {
  var kw = ['estado','municipio','prefeitura','uniao federal','fazenda','ministerio','autarquia','inss','governo'];
  for (var i=0; i<nomes.length; i++) {
    var n = nomes[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    for (var k=0; k<kw.length; k++) if (n.includes(kw[k])) return nomes[i];
  }
  return '';
}

// ── Escrita na planilha ───────────────────────────────────────

/**
 * Busca dados e escreve na próxima linha vazia OU atualiza a
 * linha existente onde o CNJ já está na coluna "numero".
 */
function buscarEGravar(cnj) {
  cnj = (cnj||'').trim();
  if (!cnj) return;

  Logger.log('=== buscarEGravar: ' + cnj + ' ===');

  var dj = buscarDatajud(cnj);
  var co = buscarCodilo(cnj);
  var campos = montarCampos(cnj, dj, co);

  var ss  = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  var aba = ss.getSheetByName(CFG.ABA_PROCESSOS);
  if (!aba) { Logger.log('Aba "'+CFG.ABA_PROCESSOS+'" não encontrada'); return; }

  // Lê cabeçalhos da primeira linha
  var lastCol = aba.getLastColumn();
  var headers = lastCol > 0
    ? aba.getRange(1, 1, 1, lastCol).getValues()[0]
    : [];

  // Mapa header → índice coluna (1-based)
  var colIdx = {};
  for (var i=0; i<headers.length; i++) {
    if (headers[i]) colIdx[String(headers[i]).trim()] = i+1;
  }

  // Procura linha existente com o mesmo CNJ
  var targetRow = encontrarOuCriarLinha(aba, colIdx[CFG.COLUNA_CNJ], cnjFormatado(cnj), cnjDigits(cnj));

  // Grava cada campo na coluna correspondente
  for (var campo in campos) {
    var col = colIdx[campo];
    if (!col) continue; // campo não existe na planilha — pula
    var val = campos[campo];
    if (val === null || val === undefined) val = '';
    aba.getRange(targetRow, col).setValue(val);
  }

  Logger.log('[Sheet] Gravado CNJ='+cnjFormatado(cnj)+' na linha '+targetRow);
  SpreadsheetApp.flush();
}

/**
 * Encontra linha com o CNJ ou retorna a próxima vazia.
 */
function encontrarOuCriarLinha(aba, colCnj, cnjFmt, cnjRaw) {
  var lastRow = aba.getLastRow();
  if (colCnj && lastRow > 1) {
    var vals = aba.getRange(2, colCnj, lastRow-1, 1).getValues();
    for (var i=0; i<vals.length; i++) {
      var v = String(vals[i][0]||'').replace(/\D/g,'');
      if (v === cnjRaw) return i+2;
    }
  }
  // Linha nova
  return lastRow + 1;
}

// ── Trigger automático (onEdit installable) ───────────────────
//
// Quando o usuário digita/cola um CNJ na coluna "numero" da aba
// "Processos", o script dispara automaticamente.
// Requer trigger installable (não funciona com Simple Trigger
// porque UrlFetchApp requer autorização explícita).

/**
 * Execute UMA VEZ como admin para instalar o trigger.
 * Após isso não precisa mais executar nada manualmente.
 */
function criarTrigger() {
  // Remove triggers duplicados da mesma função
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'processarEdicao') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processarEdicao')
    .forSpreadsheet(CFG.SPREADSHEET_ID)
    .onEdit()
    .create();
  Logger.log('Trigger installable criado para processarEdicao()');
}

/**
 * Handler do trigger onEdit.
 * Detecta quando uma célula da coluna "numero" recebe um novo valor.
 */
function processarEdicao(e) {
  try {
    var range = e.range;
    var ss    = e.source;
    var aba   = ss.getActiveSheet();

    // Só processa a aba correta
    if (aba.getName() !== CFG.ABA_PROCESSOS) return;

    // Só processa edições na linha 2+ (não o cabeçalho)
    var row = range.getRow();
    if (row < 2) return;

    // Verifica se a coluna editada é a coluna "numero"
    var lastCol = aba.getLastColumn();
    var headers = aba.getRange(1,1,1,lastCol).getValues()[0];
    var colCnj  = -1;
    for (var i=0; i<headers.length; i++) {
      if (String(headers[i]).trim() === CFG.COLUNA_CNJ) { colCnj = i+1; break; }
    }
    if (colCnj < 0 || range.getColumn() !== colCnj) return;

    var cnj = String(e.value||'').trim();
    if (!cnj) return;

    // Se a coluna sentinela já tem valor, não reprocessa
    var colStatus = -1;
    for (var j=0; j<headers.length; j++) {
      if (String(headers[j]).trim() === CFG.COLUNA_STATUS) { colStatus = j+1; break; }
    }
    if (colStatus > 0) {
      var statusVal = String(aba.getRange(row, colStatus).getValue()||'').trim();
      if (statusVal) { Logger.log('Linha '+row+' já tem status, pulando'); return; }
    }

    // Executa a busca e gravação
    buscarEGravar(cnj);

  } catch(err) {
    Logger.log('processarEdicao erro: ' + err.message);
  }
}

// ── Web App ───────────────────────────────────────────────────
// POST { "cnj": "50031200920218210021" }
// GET  ?cnj=50031200920218210021

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var cnj  = (body.cnj||'').trim();
    if (!cnj) return jsonResp({error:'campo cnj obrigatório'});
    buscarEGravar(cnj);
    return jsonResp({ok:true, cnj:cnjFormatado(cnj)});
  } catch(err) {
    return jsonResp({error:err.message});
  }
}

function doGet(e) {
  var cnj = ((e.parameter && e.parameter.cnj)||'').trim();
  if (!cnj) return jsonResp({error:'parâmetro cnj obrigatório'});
  buscarEGravar(cnj);
  return jsonResp({ok:true, cnj:cnjFormatado(cnj)});
}

function jsonResp(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Teste manual ──────────────────────────────────────────────

function testar() {
  buscarEGravar('50031200920218210021'); // TJRS — Acidente de Trânsito, baixado
}
