// Executa Codigo.gs em Node com uma planilha simulada (mocks do Apps Script).
// Os valores do Simulador vêm do LibreOffice (fórmulas reais recalculadas).
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const [, , GS, JSON_CEN] = process.argv;
const CEN = JSON.parse(fs.readFileSync(JSON_CEN, 'utf8'));

let agoraMs = Date.UTC(2026, 9, 24, 15, 0, 0);
const alertas = [], toasts = [];

function a1(ref) { const m = /^([A-Z]+)(\d+)$/.exec(ref); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return [Number(m[2]), c]; }

class Sheet {
  constructor(name, cells = {}) { this.name = name; this.g = {}; this.maxRows = 1000; this.filter = null; this.images = []; this.fmts = {};
    for (const [k, v] of Object.entries(cells)) { const [r, c] = a1(k); this.set(r, c, v); } }
  set(r, c, v) { this.g[r + ',' + c] = v; }
  get(r, c) { const v = this.g[r + ',' + c]; return v === undefined ? '' : v; }
  getName() { return this.name; }
  getLastRow() { let m = 0; for (const [k, v] of Object.entries(this.g)) if (v !== '') m = Math.max(m, Number(k.split(',')[0])); return m; }
  getMaxRows() { return this.maxRows; }
  insertRowsAfter(_, n) { this.maxRows += n; }
  getRange(a, b, nr, nc) {
    let r, c, h = 1, w = 1;
    if (typeof a === 'string') { const [p, q] = a.split(':'); [r, c] = a1(p); if (q) { const [r2, c2] = a1(q); h = r2 - r + 1; w = c2 - c + 1; } }
    else { r = a; c = b; h = nr || 1; w = nc || 1; }
    const sh = this;
    const rng = {
      getValues: () => Array.from({ length: h }, (_, i) => Array.from({ length: w }, (_, j) => sh.get(r + i, c + j))),
      getValue: () => sh.get(r, c),
      setValues: (vals) => { assert.strictEqual(vals.length, h); vals.forEach((l, i) => { assert.strictEqual(l.length, w); l.forEach((v, j) => sh.set(r + i, c + j, v)); }); return rng; },
      setNumberFormats: (f) => { f.forEach((l, i) => l.forEach((v, j) => sh.fmts[(r + i) + ',' + (c + j)] = v)); return rng; },
      getRow: () => r, getColumn: () => c, getLastRow: () => r + h - 1, getLastColumn: () => c + w - 1, getNumColumns: () => w,
      createFilter: () => { sh.filter = { range: rng, crit: {}, getRange: () => rng, remove: () => { sh.filter = null; },
        getColumnFilterCriteria: (k) => sh.filter.crit[k] || null, setColumnFilterCriteria: (k, v) => { sh.filter.crit[k] = v; } }; return sh.filter; }
    };
    return rng;
  }
  getFilter() { return this.filter; }
  setFrozenRows() {}
  getImages() { return this.images; }
  insertImage() { const img = { s: null, assignScript(f) { this.s = f; }, getScript() { return this.s; }, setWidth() { return img; }, setHeight() { return img; }, setAltTextTitle() {}, remove: () => { this.images = this.images.filter(x => x !== img); } }; this.images.push(img); return img; }
}

function montarPlanilha(cenario) {
  const d = CEN[cenario];
  const hist = new Sheet('Histórico de simulações');
  d.hist4.forEach((t, i) => hist.set(4, i + 1, t));
  hist.set(1, 1, 'HISTÓRICO DE SIMULAÇÕES'); hist.set(2, 1, 'instruções');
  return { sim: new Sheet('Simulador', d.sim), cfg: new Sheet('Configurações', d.cfg), hist };
}
let abas;
function carregarCenario(nome) { const n = montarPlanilha(nome); abas.sim = n.sim; abas.cfg = n.cfg; }

const props = {};
const ctx = {
  SpreadsheetApp: {
    getActive: () => ({ getSheetByName: (n) => ({ 'Simulador': abas.sim, 'Configurações': abas.cfg, 'Histórico de simulações': abas.hist })[n] || null,
      toast: (m) => toasts.push(m), getSpreadsheetTimeZone: () => 'America/Sao_Paulo', getSpreadsheetLocale: () => 'pt_BR' }),
    flush() {}, getUi: () => ({ alert: (t, m) => alertas.push(m || t), ButtonSet: { OK: 1 } })
  },
  LockService: { getDocumentLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  PropertiesService: { getDocumentProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  Utilities: { getUuid: () => require('crypto').randomUUID(), base64Decode: (s) => Buffer.from(s, 'base64'), newBlob: () => ({}),
    formatDate: (d, tz, f) => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
      return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second); } },
  Date: class extends Date { constructor(...a) { a.length ? super(...a) : super(agoraMs); } static now() { return agoraMs; } },
  JSON, Math, Object, String, Number, isFinite, Array, Error
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(GS, 'utf8') + '\nthis.__api={salvarSimulacao,validarECalcular_,configurarPlanilha,COLUNAS_HISTORICO};', ctx);
const api = ctx.__api;

const log = [];
const ok = (nome, cond, det = '') => { log.push(`${cond ? 'PASSOU' : 'FALHOU'}  ${nome}${det ? '  — ' + det : ''}`); if (!cond) process.exitCode = 1; };
const linha = (r) => abas.hist.getRange(r, 1, 1, 23).getValues()[0];
const brl = (x) => 'R$ ' + x.toFixed(2);
abas = montarPlanilha('A_clinica_pix');

// Cabeçalhos do XLSX = colunas do script
ok('Cabeçalhos do histórico (XLSX) iguais aos do script', JSON.stringify(CEN.A_clinica_pix.hist4) === JSON.stringify(api.COLUNAS_HISTORICO.map(c => c[0])));

// Cenário A
alertas.length = 0; api.salvarSimulacao();
let L = linha(5);
ok('A — salvou na linha 5 sem alertas', alertas.length === 0 && /^SIM-20261024-120000-[0-9A-F]{4}$/.test(L[0]), L[0]);
ok('A — clínica 200, Simples 60, materiais 250, total 510', L[14] === 200 && Math.abs(L[18] - 60) < 1e-9 && L[8] === 250 && Math.abs(L[19] - 510) < 1e-9, `${L[14]} / ${L[18]} / ${L[8]} / ${L[19]}`);
ok('A — líquido 490, por curativo 98, margem 49%', Math.abs(L[20] - 490) < 1e-9 && Math.abs(L[21] - 98) < 1e-9 && Math.abs(L[22] - 0.49) < 1e-9, `${L[20]} / ${L[21]} / ${L[22]}`);
ok('A — operadora (Pix) 0%', L[15] === 0 && L[16] === 0);
ok('A — data/hora gravada como data', L[1] instanceof Date || Object.prototype.toString.call(L[1]) === '[object Date]');
ok('A — nenhuma fórmula gravada', L.every(v => !(typeof v === 'string' && v.startsWith('='))));
const registroA = JSON.stringify(L);

// Clique duplo imediato: não duplica
agoraMs += 2000; api.salvarSimulacao();
ok('Clique duplo (2 s depois) não cria cópia', abas.hist.getLastRow() === 5 && /acabou de ser salva/.test(toasts.at(-1)), toasts.at(-1));

// Cenário D: muda TODOS os dados do simulador e as taxas; salva B
agoraMs += 60000; carregarCenario('B_domicilio_2x');
abas.cfg.set(...a1('B24'), 0.06); // mantém coerente com o cenário B recalculado
api.salvarSimulacao();
L = linha(6);
ok('B — salvou na linha 6', alertas.length === 0 && abas.hist.getLastRow() === 6);
ok('B — materiais 250, deslocamento 100, fixas 50', L[8] === 250 && L[10] === 100 && L[12] === 50, `${L[8]} / ${L[10]} / ${L[12]}`);
ok('B — cartão 60, Simples 60, total 520', Math.abs(L[16] - 60) < 1e-9 && Math.abs(L[18] - 60) < 1e-9 && Math.abs(L[19] - 520) < 1e-9, `${L[16]} / ${L[18]} / ${L[19]}`);
ok('B — líquido 480, por curativo 96, margem 48%', Math.abs(L[20] - 480) < 1e-9 && Math.abs(L[21] - 96) < 1e-9 && Math.abs(L[22] - 0.48) < 1e-9, `${L[20]} / ${L[21]} / ${L[22]}`);
abas.cfg.set(...a1('B24'), 0.08); abas.cfg.set(...a1('B7'), 0.3); abas.sim.set(...a1('B6'), 5000);
ok('D — registro A permanece idêntico após mudar simulador e taxas', JSON.stringify(linha(5)) === registroA);

// Mesma simulação idêntica, em outro momento (fora da janela): grava de novo
carregarCenario('B_domicilio_2x'); agoraMs += 15000; api.salvarSimulacao();
ok('Simulação idêntica em momento distinto é gravada (linha 7)', abas.hist.getLastRow() === 7 && linha(7)[0] !== linha(6)[0]);

// Cenário C
carregarCenario('C_dinheiro'); agoraMs += 15000; api.salvarSimulacao(); L = linha(8);
ok('C — dinheiro: operadora 0 e Simples 6% de 1000 = 60', L[6] === 'Dinheiro' && L[16] === 0 && Math.abs(L[18] - 60) < 1e-9 && L[17] === 0.06, `${L[16]} / ${L[18]}`);

// Prejuízo é gravado (resultado negativo é válido)
carregarCenario('F_prejuizo'); agoraMs += 15000; api.salvarSimulacao(); L = linha(9);
ok('Prejuízo é salvo com valor negativo', Math.abs(L[20] - (-178.2)) < 1e-9 && Math.abs(L[22] - (-0.594)) < 1e-9, `${L[20]} / ${L[22]}`);

// Cenário E e demais validações: bloqueiam sem gravar
for (const [cen, padrao] of [['E1_zero_curativos', /inteiro maior que zero/], ['E2_cartao1x', /Cartão 1x.*não foi configurada/],
  ['G_fracionado', /inteiro maior que zero/], ['H_negativo', /Outras despesas/], ['I_vazio', /nome do paciente/], ['J_sem_nome', /nome do paciente/]]) {
  carregarCenario(cen); alertas.length = 0; const antes = abas.hist.getLastRow(); agoraMs += 15000; api.salvarSimulacao();
  ok(`Bloqueio: ${cen}`, abas.hist.getLastRow() === antes && alertas.length === 1 && padrao.test(alertas[0]), alertas[0] && alertas[0].split('\n').slice(2).join(' '));
}

// Integridade: fórmula adulterada/apagada no Simulador
carregarCenario('A_clinica_pix'); abas.sim.set(...a1('B26'), 999); alertas.length = 0; agoraMs += 15000; api.salvarSimulacao();
ok('Integridade: resultado adulterado bloqueia', abas.hist.getLastRow() === 9 && /não conferem/.test(alertas[0]));
carregarCenario('A_clinica_pix'); abas.sim.set(...a1('B23'), ''); alertas.length = 0; agoraMs += 15000; api.salvarSimulacao();
ok('Integridade: resultado vazio bloqueia', abas.hist.getLastRow() === 9 && /vazio ou inválido/.test(alertas[0]));

// Filtro cobre registros; aba cheia é ampliada
ok('Filtro criado a partir do cabeçalho (linha 4)', abas.hist.filter && abas.hist.filter.range.getRow() === 4 && abas.hist.filter.range.getLastRow() >= 9);
abas.hist.maxRows = 9; abas.hist.filter.crit[6] = 'criterio-local'; carregarCenario('A_clinica_pix'); agoraMs += 15000; api.salvarSimulacao();
ok('Aba cheia: insere linhas, grava na 10 e mantém critério do filtro', abas.hist.getLastRow() === 10 && abas.hist.filter.range.getLastRow() >= 10 && abas.hist.filter.crit[6] === 'criterio-local');

// configurarPlanilha: botão único vinculado
api.configurarPlanilha(); api.configurarPlanilha();
ok('Configurar planilha 2x: um único botão vinculado a salvarSimulacao', abas.sim.images.length === 1 && abas.sim.images[0].getScript() === 'salvarSimulacao');

console.log(log.join('\n'));
console.log('\nHistórico final (ID | paciente | pagamento | líquido | margem):');
for (let r = 5; r <= abas.hist.getLastRow(); r++) { const l = linha(r); console.log(`  L${r}: ${l[0]} | ${l[2]} | ${l[6]} | ${brl(l[20])} | ${(l[22] * 100).toFixed(1)}%`); }
