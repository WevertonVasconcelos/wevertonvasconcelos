// Simulação mínima das APIs do Google Apps Script usadas por Codigo.gs, para rodar em Node.
// Métodos de formatação são aceitos e registrados (sem efeito); valores, fórmulas, imagens,
// metadados, mesclagens e validações são mantidos em memória para conferência.
'use strict';

function a1ParaRC(ref) {
  const m = /^\$?([A-Z]+)\$?(\d+)$/.exec(ref);
  let c = 0;
  for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
  return [Number(m[2]), c];
}
function rcParaA1(r, c) {
  let s = '';
  for (let n = c; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s + r;
}

// Métodos reais do Apps Script aceitos sem efeito (lista fechada: nome errado no script = erro no teste)
const PERMITIDOS = new Set([
  // Range
  'setFontFamily', 'setFontSize', 'setFontColor', 'setFontWeight', 'setBackground', 'setVerticalAlignment',
  'setHorizontalAlignment', 'setWrap', 'setBorder',
  // Protection
  'setDescription', 'setWarningOnly',
  // DataValidationBuilder
  'requireValueInRange', 'requireFormulaSatisfied', 'setAllowInvalid', 'setHelpText',
  // ConditionalFormatRuleBuilder
  'whenFormulaSatisfied', 'setRanges'
]);
function encadeavel(registro, extras = {}) {
  const p = new Proxy(extras, {
    get(alvo, nome) {
      if (nome in alvo) return alvo[nome];
      if (typeof nome !== 'string' || !PERMITIDOS.has(nome)) throw new Error('Método não simulado/inexistente: ' + String(nome));
      return (...args) => { registro.push([nome, ...args]); return p; };
    }
  });
  return p;
}

class Planilha {
  constructor() { this.abas = []; this.ativa = null; this.toasts = []; this.alertas = []; this.respostaUi = 'YES'; }
  getSheetByName(n) { return this.abas.find(a => a.nome === n) || null; }
  getSheets() { return this.abas.slice(); }
  insertSheet(n, idx = this.abas.length) {
    if (this.getSheetByName(n)) throw new Error('aba duplicada ' + n);
    const a = new Aba(n, this); this.abas.splice(idx, 0, a); return a;
  }
  deleteSheet(a) { this.abas = this.abas.filter(x => x !== a); }
  getActiveSheet() { return this.ativa; }
  setActiveSheet(a) { this.ativa = a; return a; }
  moveActiveSheet(pos) { this.abas = this.abas.filter(x => x !== this.ativa); this.abas.splice(pos - 1, 0, this.ativa); }
  toast(m) { this.toasts.push(m); }
}

class Aba {
  constructor(nome, ss) {
    this.nome = nome; this.ss = ss; this.cel = {}; this.fmt = {}; this.maxRows = 1000; this.maxCols = 26;
    this.imagens = []; this.meta = []; this.mescladas = []; this.validacoes = {}; this.ocultas = []; this.oculta = false;
    this.formatacao = []; this.protecoes = []; this.regrasCond = []; this.resolver = null;
  }
  getName() { return this.nome; }
  setName(n) { this.nome = n; return this; }
  hideSheet() { this.oculta = true; return this; }
  hideColumns(c) { this.ocultas.push(c); }
  setHiddenGridlines() { return this; }
  setTabColor() { return this; }
  setColumnWidth(c, w) { this.formatacao.push(['largura', c, w]); return this; }
  setRowHeight(r, h) { this.formatacao.push(['altura', r, h]); return this; }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  deleteColumns(c, n) { this.maxCols -= n; }
  deleteRows(r, n) { this.maxRows -= n; }
  insertRowsAfter(_, n) { this.maxRows += n; }
  getLastRow() {
    let m = 0;
    for (const [k, v] of Object.entries(this.cel)) if (v !== '' && v !== null) m = Math.max(m, a1ParaRC(k)[0]);
    return m;
  }
  valor(a1) {
    const v = this.cel[a1];
    if (typeof v === 'string' && v.startsWith('=')) return this.resolver ? this.resolver(a1, this) : '';
    return v === undefined ? '' : v;
  }
  addDeveloperMetadata(k) { this.meta.push(k); }
  getDeveloperMetadata() { return this.meta.map(k => ({ getKey: () => k })); }
  getImages() { return this.imagens; }
  insertImage(_, col, row) {
    const aba = this;
    const img = { script: null, col, row,
      assignScript(f) { this.script = f; return img; }, getScript() { return this.script; },
      setWidth() { return img; }, setHeight() { return img; }, setAltTextTitle() { return img; },
      remove() { aba.imagens = aba.imagens.filter(x => x !== img); } };
    this.imagens.push(img); return img;
  }
  setConditionalFormatRules(r) { this.regrasCond = r; }
  getRangeList(lista) {
    const rs = lista.map(a => this.getRange(a));
    return { getRanges: () => rs, clearContent: () => { rs.forEach(r => r.clearContent()); } };
  }
  setActiveSelection() {}
  getRange(a, b, nr, nc) {
    let r, c, h = 1, w = 1;
    if (typeof a === 'string') {
      const [p, q] = a.split(':'); [r, c] = a1ParaRC(p);
      if (q) { const [r2, c2] = a1ParaRC(q); h = r2 - r + 1; w = c2 - c + 1; }
    } else { r = a; c = b; h = nr || 1; w = nc || 1; }
    return novaFaixa(this, r, c, h, w);
  }
}

function novaFaixa(aba, r, c, h, w) {
  const celulas = () => { const o = []; for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) o.push(rcParaA1(r + i, c + j)); return o; };
  const extras = {
    getValue: () => aba.valor(rcParaA1(r, c)),
    getDisplayValue: () => String(aba.valor(rcParaA1(r, c))),
    getValues: () => Array.from({ length: h }, (_, i) => Array.from({ length: w }, (_, j) => aba.valor(rcParaA1(r + i, c + j)))),
    setValue: (v) => { celulas().forEach(k => { aba.cel[k] = v; }); return faixa; },
    setFormula: (f) => { aba.cel[rcParaA1(r, c)] = f; return faixa; },
    setValues: (vals) => {
      if (vals.length !== h || vals.some(l => l.length !== w)) throw new Error('dimensões incompatíveis');
      vals.forEach((l, i) => l.forEach((v, j) => { aba.cel[rcParaA1(r + i, c + j)] = v; })); return faixa;
    },
    setNumberFormats: (f) => { f.forEach((l, i) => l.forEach((v, j) => { aba.fmt[rcParaA1(r + i, c + j)] = v; })); return faixa; },
    setNumberFormat: (f) => { celulas().forEach(k => { aba.fmt[k] = f; }); return faixa; },
    clearContent: () => { celulas().forEach(k => { delete aba.cel[k]; }); return faixa; },
    setDataValidation: (v) => { celulas().forEach(k => { aba.validacoes[k] = v; }); return faixa; },
    getMergedRanges: () => aba.mescladas.filter(m => celulas().some(k => m.cel.includes(k))).map(m => m.faixa),
    breakApart: () => { aba.mescladas = aba.mescladas.filter(m => !celulas().some(k => m.cel.includes(k))); return faixa; },
    protect: () => { const p = encadeavel([]); aba.protecoes.push(celulas()); return p; },
    offset: (dr, dc, nh, nw) => novaFaixa(aba, r + dr, c + dc, nh || h, nw || w),
    getRow: () => r, getColumn: () => c, getA1: () => celulas()
  };
  const faixa = encadeavel(aba.formatacao, extras);
  return faixa;
}

function criarAmbiente(ss) {
  const props = {};
  let agora = Date.UTC(2026, 9, 26, 18, 0, 0);
  const DateFalsa = class extends Date { constructor(...a) { a.length ? super(...a) : super(agora); } static now() { return agora; } };
  let uuid = 0;
  const ctx = {
    SpreadsheetApp: {
      getActive: () => ss, flush() {},
      getUi: () => ({
        alert: (t, m) => { ss.alertas.push(m || t); return ss.respostaUi; },
        ButtonSet: { OK: 'OK', YES_NO: 'YES_NO' }, Button: { YES: 'YES', NO: 'NO' }
      }),
      newDataValidation: () => { const reg = []; return encadeavel(reg, { build: () => ({ regras: reg }) }); },
      newConditionalFormatRule: () => { const reg = []; return encadeavel(reg, { build: () => ({ regras: reg }) }); },
      BorderStyle: { SOLID: 'SOLID', SOLID_MEDIUM: 'SOLID_MEDIUM' }
    },
    LockService: { getDocumentLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    PropertiesService: { getDocumentProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    Utilities: {
      getUuid: () => '00000000-0000-4000-8000-' + String(++uuid).padStart(12, '0'),
      base64Decode: s => Buffer.from(s, 'base64'), newBlob: () => ({})
    },
    Date: DateFalsa, JSON, Math, Object, String, Number, isFinite, Array, Error, Buffer
  };
  return { ctx, avancar: ms => { agora += ms; }, props };
}

function planilhaDeJson(dados) {
  const ss = new Planilha();
  for (const [nome, d] of Object.entries(dados)) {
    const a = ss.insertSheet(nome);
    for (const [k, v] of Object.entries(d.celulas)) a.cel[k] = (v && v.data) ? new Date(v.data) : v;
    a.mescladas = d.mescladas.map(f => {
      const [p, q] = f.split(':'); const [r1, c1] = a1ParaRC(p), [r2, c2] = a1ParaRC(q); const cel = [];
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) cel.push(rcParaA1(r, c));
      return { faixa: f, cel };
    });
  }
  ss.ativa = ss.abas[0];
  return ss;
}

module.exports = { planilhaDeJson, criarAmbiente, a1ParaRC, rcParaA1 };
