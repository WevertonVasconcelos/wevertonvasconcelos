/**
 * mvslides.js — Slides de aula, curso e consultoria da marca Mari Véras (PPTX 16:9).
 *
 * Visual: fundo branco/névoa, título condensado grafite (Oswald), corpo Montserrat,
 * frase de efeito em Cormorant Garamond itálico, ouro da família Véras como detalhe
 * (fio, numerais, bolinhas). Rodapé com assinatura dela e o nome do curso.
 *
 * Uso:
 *   const mv = require("<pasta da skill>/assets/mvslides.js");
 *   const d = mv.novo({ curso: "Bordas da Ferida", modulo: 1 });
 *   mv.capaCurso(d, { titulo: "Bordas da ferida", sub: "O que a borda comunica", foto: "mari.jpg" });
 *   mv.conteudo(d, { titulo: "Por que olhar a borda", itens: ["...", "..."] });
 *   await mv.salvar(d, "saida/curso.pptx");
 *
 * Depende de pptxgenjs (npm install pptxgenjs). Cores SEM "#".
 * Fontes: Oswald, Montserrat, Cormorant Garamond (Google Fonts; arquivos em assets/fonts).
 * No PowerPoint, instale as fontes; no Google Slides elas já existem.
 */
const PptxGenJS = require("pptxgenjs");

const C = {
  branco: "FFFFFF", nevoa: "EDEDEB", cinza: "D6D6D4",
  grafite: "4A4A4A", texto: "6B6B6B", carvao: "2D2D2D",
  ouro: "B89A6A", ouroEscuro: "8C7044", creme: "F5F0EB", taupe: "C8B49A",
  alerta: "B87070",
};
const F = { titulo: "Oswald", corpo: "Montserrat", efeito: "Cormorant Garamond" };
const W = 13.333, H = 7.5, M = 0.7; // LAYOUT_WIDE, margem
const ASSINATURA = "MARI VÉRAS  ·  ENFERMEIRA DERMATOLÓGICA  ·  COREN-PE 528.268";

function novo({ curso = "", modulo = null, autor = "Mari Véras" } = {}) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = autor;
  pptx.title = curso;
  return { pptx, curso, modulo, n: 0 };
}

// ---------------------------------------------------------------- base
function _slide(d, { fundo = C.branco, rodape = true } = {}) {
  const s = d.pptx.addSlide();
  s.background = { color: fundo };
  d.n += 1;
  if (rodape) {
    s.addShape(d.pptx.ShapeType.line, { x: M, y: H - 0.55, w: W - 2 * M, h: 0, line: { color: C.taupe, width: 0.75 } });
    s.addText("MARI VÉRAS  ·  ENFERMEIRA DERMATOLÓGICA", {
      x: M, y: H - 0.5, w: 6, h: 0.3, fontFace: F.corpo, fontSize: 8, bold: true, color: C.texto, charSpacing: 2, margin: 0,
    });
    const dir = [d.curso, d.modulo != null ? `Módulo ${d.modulo}` : null, String(d.n)].filter(Boolean).join("  ·  ");
    s.addText(dir, { x: W - M - 6, y: H - 0.5, w: 6, h: 0.3, fontFace: F.corpo, fontSize: 8, color: C.texto, align: "right", margin: 0 });
  }
  return s;
}

function _rotulo(s, txt, x, y, w = 8, cor = C.ouroEscuro) {
  s.addText(String(txt).toUpperCase(), { x, y, w, h: 0.3, fontFace: F.corpo, fontSize: 10, bold: true, color: cor, charSpacing: 4, margin: 0 });
}
function _fio(d, s, x, y, w = 0.9, cor = C.ouro) {
  s.addShape(d.pptx.ShapeType.rect, { x, y, w, h: 0.04, fill: { color: cor }, line: { color: cor, width: 0 } });
}
function _titulo(s, txt, x, y, w, h = 1.0, tam = 34, cor = C.grafite, align = "left") {
  s.addText(txt, { x, y, w, h, fontFace: F.titulo, fontSize: tam, bold: true, color: cor, valign: "top", align, margin: 0, fit: "shrink" });
}
/** Converte "texto com **destaque**" em runs (destaque em ouro-escuro e negrito). */
function runs(txt, base = {}) {
  return String(txt).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) =>
    p.startsWith("**") ? { text: p.slice(2, -2), options: { ...base, bold: true, color: C.ouroEscuro } } : { text: p, options: { ...base } });
}
/** Lista de tópicos em que cada item pode ter **destaque** sem quebrar o parágrafo. */
function itensComDestaque(itens, base, bullet) {
  const out = [];
  itens.forEach((it, i) => {
    const rs = runs(it, base);
    rs.forEach((r, k) => {
      const o = { ...r.options };
      if (k === 0) Object.assign(o, { bullet, paraSpaceAfter: 14 });
      if (k === rs.length - 1 && i < itens.length - 1) o.breakLine = true;
      out.push({ text: r.text, options: o });
    });
  });
  return out;
}
function _cabecalho(d, s, { rotulo, titulo }) {
  if (rotulo) _rotulo(s, rotulo, M, 0.55);
  _fio(d, s, M, 0.95);
  _titulo(s, titulo, M, 1.1, W - 2 * M, 0.95, 32);
}
function _bolinha(d, s, n, x, y, r = 0.42) {
  s.addShape(d.pptx.ShapeType.ellipse, { x, y, w: r, h: r, fill: { color: C.ouro }, line: { color: C.ouro, width: 0 } });
  s.addText(String(n), { x, y, w: r, h: r, fontFace: F.titulo, fontSize: 15, bold: true, color: C.branco, align: "center", valign: "middle", margin: 0 });
}

// ---------------------------------------------------------------- tipos de slide
/** Capa do curso: faixa clara com título condensado à esquerda + foto dela à direita (opcional). */
function capaCurso(d, { titulo, sub = "", rotulo = "CURSO", foto = null }) {
  const s = _slide(d, { fundo: C.branco, rodape: false });
  const larg = foto ? 6.6 : W - 2 * M;
  if (foto) s.addImage({ path: foto, x: 7.1, y: 0, w: W - 7.1, h: H, sizing: { type: "cover", w: W - 7.1, h: H } });
  _rotulo(s, rotulo, M, 1.6);
  _fio(d, s, M, 2.0);
  _titulo(s, titulo, M, 2.2, larg - 0.3, 2.4, 54);
  if (sub) s.addText(sub, { x: M, y: 4.7, w: larg - 0.3, h: 0.9, fontFace: F.corpo, fontSize: 18, color: C.texto, margin: 0, valign: "top" });
  s.addText(ASSINATURA, { x: M, y: H - 0.9, w: larg, h: 0.3, fontFace: F.corpo, fontSize: 9, bold: true, color: C.texto, charSpacing: 2, margin: 0 });
  return s;
}

/** Abertura de módulo: numeral grande em ouro + título. */
function capaModulo(d, { numero, titulo, sub = "" }) {
  d.modulo = numero;
  const s = _slide(d, { fundo: C.nevoa });
  s.addText(String(numero).padStart(2, "0"), { x: M, y: 1.2, w: 4, h: 2.4, fontFace: F.titulo, fontSize: 150, bold: true, color: C.ouro, margin: 0, valign: "top" });
  _rotulo(s, `MÓDULO ${numero}`, M, 3.75);
  _titulo(s, titulo, M, 4.1, W - 2 * M, 1.3, 44);
  if (sub) s.addText(sub, { x: M, y: 5.4, w: W - 2 * M, h: 0.6, fontFace: F.corpo, fontSize: 16, color: C.texto, margin: 0 });
  return s;
}

/** Objetivos: "Ao final desta aula, você vai..." */
function objetivos(d, { itens, titulo = "Ao final desta aula, você vai:" }) {
  const s = _slide(d);
  _cabecalho(d, s, { rotulo: "OBJETIVOS", titulo });
  itens.slice(0, 5).forEach((it, i) => {
    const y = 2.35 + i * 0.85;
    _bolinha(d, s, i + 1, M, y);
    s.addText(runs(it, { fontFace: F.corpo, fontSize: 20, color: C.texto }), { x: M + 0.65, y: y - 0.08, w: W - 2 * M - 0.7, h: 0.6, margin: 0, valign: "middle" });
  });
  return s;
}

/** Conteúdo: tópicos (máx. 5) e, se houver, imagem à direita. */
function conteudo(d, { titulo, itens = [], rotulo = null, foto = null, legenda = null }) {
  const s = _slide(d);
  _cabecalho(d, s, { rotulo, titulo });
  const w = foto ? 6.4 : W - 2 * M;
  s.addText(itensComDestaque(itens.slice(0, 5), { fontFace: F.corpo, fontSize: 20, color: C.texto }, { code: "25CF" }), { x: M, y: 2.3, w, h: 4.2, valign: "top", margin: 0 });
  if (foto) {
    s.addImage({ path: foto, x: 7.6, y: 2.25, w: 5.0, h: 3.7, sizing: { type: "cover", w: 5.0, h: 3.7 }, rounding: false });
    if (legenda) s.addText(legenda, { x: 7.6, y: 6.0, w: 5.0, h: 0.35, fontFace: F.corpo, fontSize: 10, italic: true, color: C.texto, margin: 0 });
  }
  return s;
}

/** Duas colunas (ex.: "O que é" × "O que fazer"). */
function duasColunas(d, { titulo, rotulo = null, esquerda, direita }) {
  const s = _slide(d);
  _cabecalho(d, s, { rotulo, titulo });
  [[esquerda, M], [direita, M + (W - 2 * M) / 2 + 0.2]].forEach(([col, x]) => {
    const w = (W - 2 * M) / 2 - 0.2;
    s.addShape(d.pptx.ShapeType.roundRect, { x, y: 2.3, w, h: 4.2, fill: { color: C.creme }, line: { color: C.taupe, width: 1 }, rectRadius: 0.12 });
    s.addText(col.titulo, { x: x + 0.3, y: 2.5, w: w - 0.6, h: 0.5, fontFace: F.titulo, fontSize: 22, bold: true, color: C.grafite, margin: 0 });
    s.addText(col.itens.map((it, i, a) => ({ text: it, options: { bullet: { code: "25CF" }, breakLine: i < a.length - 1, paraSpaceAfter: 8 } })),
      { x: x + 0.3, y: 3.1, w: w - 0.6, h: 3.2, fontFace: F.corpo, fontSize: 18, color: C.texto, valign: "top", margin: 0 });
  });
  return s;
}

/** Tabela comparativa. linhas = [["a","b"],...]. */
function tabela(d, { titulo, cabecalho, linhas, rotulo = "COMPARATIVO", larguras = null }) {
  const s = _slide(d);
  _cabecalho(d, s, { rotulo, titulo });
  const head = cabecalho.map((h) => ({ text: h.toUpperCase(), options: { bold: true, color: C.branco, fill: { color: C.grafite }, fontFace: F.corpo, fontSize: 13, charSpacing: 1 } }));
  const body = linhas.map((l, i) => l.map((c) => ({ text: c, options: { color: C.carvao, fill: { color: i % 2 ? C.branco : C.creme }, fontFace: F.corpo, fontSize: 16 } })));
  s.addTable([head, ...body], { x: M, y: 2.3, w: W - 2 * M, colW: larguras || undefined, border: { type: "solid", pt: 0.75, color: C.taupe }, margin: 0.12, rowH: 0.6, valign: "middle", autoPage: false });
  return s;
}

/** Fluxo em etapas (3 a 5 caixas com setas). */
function fluxo(d, { titulo, etapas, rotulo = "PASSO A PASSO" }) {
  const s = _slide(d, { fundo: C.nevoa });
  _cabecalho(d, s, { rotulo, titulo });
  const n = Math.min(etapas.length, 5), vao = 0.35, w = (W - 2 * M - vao * (n - 1)) / n;
  etapas.slice(0, n).forEach((e, i) => {
    const x = M + i * (w + vao);
    s.addShape(d.pptx.ShapeType.roundRect, { x, y: 2.6, w, h: 3.0, fill: { color: C.branco }, line: { color: C.taupe, width: 1 }, rectRadius: 0.12 });
    _bolinha(d, s, i + 1, x + 0.25, 2.85);
    s.addText(e.titulo, { x: x + 0.25, y: 3.45, w: w - 0.5, h: 0.7, fontFace: F.titulo, fontSize: 22, bold: true, color: C.grafite, margin: 0, valign: "top", fit: "shrink" });
    if (e.texto) s.addText(e.texto, { x: x + 0.25, y: 4.15, w: w - 0.5, h: 1.3, fontFace: F.corpo, fontSize: 15, color: C.texto, margin: 0, valign: "top", fit: "shrink" });
    if (i < n - 1) s.addText("›", { x: x + w, y: 3.7, w: vao, h: 0.6, fontFace: F.titulo, fontSize: 30, color: C.ouro, align: "center", margin: 0 });
  });
  return s;
}

/** Erros comuns / alerta: barra rosada discreta. */
function alerta(d, { titulo = "Erros comuns", itens }) {
  const s = _slide(d);
  s.addShape(d.pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: H, fill: { color: C.alerta }, line: { color: C.alerta, width: 0 } });
  _cabecalho(d, s, { rotulo: "ATENÇÃO", titulo });
  s.addText(itens.slice(0, 5).map((it, i, a) => ({ text: it, options: { bullet: { code: "2715" }, breakLine: i < a.length - 1, paraSpaceAfter: 10 } })),
    { x: M, y: 2.3, w: W - 2 * M, h: 4.2, fontFace: F.corpo, fontSize: 20, color: C.texto, valign: "top", margin: 0 });
  return s;
}

/** Caso clínico (sem identificar paciente): situação → raciocínio → conduta. */
function caso(d, { titulo, situacao, raciocinio, conduta, foto = null }) {
  const s = _slide(d);
  s.addShape(d.pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.18, fill: { color: C.ouroEscuro }, line: { color: C.ouroEscuro, width: 0 } });
  _cabecalho(d, s, { rotulo: "CASO CLÍNICO", titulo });
  const w = foto ? 7.4 : W - 2 * M;
  [["Situação", situacao], ["Raciocínio", raciocinio], ["Conduta", conduta]].forEach(([r, t], i) => {
    const y = 2.3 + i * 1.4;
    _rotulo(s, r, M, y, 3);
    s.addText(t, { x: M, y: y + 0.32, w, h: 0.95, fontFace: F.corpo, fontSize: 17, color: C.texto, valign: "top", margin: 0, fit: "shrink" });
  });
  if (foto) s.addImage({ path: foto, x: 8.6, y: 2.3, w: 4.0, h: 4.0, sizing: { type: "cover", w: 4.0, h: 4.0 } });
  return s;
}

/** Imagem grande com legenda (lembre: leito da ferida pixelado, sem identificar paciente). */
function imagem(d, { titulo, foto, legenda = "", rotulo = null }) {
  const s = _slide(d);
  _cabecalho(d, s, { rotulo, titulo });
  s.addImage({ path: foto, x: M, y: 2.2, w: W - 2 * M, h: 3.9, sizing: { type: "contain", w: W - 2 * M, h: 3.9 } });
  if (legenda) s.addText(legenda, { x: M, y: 6.2, w: W - 2 * M, h: 0.4, fontFace: F.corpo, fontSize: 11, italic: true, color: C.texto, align: "center", margin: 0 });
  return s;
}

/** Frase de efeito centralizada (Cormorant itálico). */
function frase(d, { frase: f, autor = null, fundo = C.branco }) {
  const s = _slide(d, { fundo });
  _fio(d, s, W / 2 - 0.45, 2.5);
  s.addText(`“${f}”`, { x: 1.5, y: 2.75, w: W - 3, h: 2.0, fontFace: F.efeito, fontSize: 38, italic: true, color: C.carvao, align: "center", valign: "top", margin: 0, fit: "shrink" });
  if (autor) s.addText(autor.toUpperCase(), { x: 1.5, y: 4.9, w: W - 3, h: 0.4, fontFace: F.corpo, fontSize: 10, bold: true, color: C.ouroEscuro, charSpacing: 3, align: "center", margin: 0 });
  return s;
}

/** Resumo da aula: pontos-chave + tarefa (opcional). */
function resumo(d, { titulo = "Para levar desta aula", pontos, tarefa = null }) {
  const s = _slide(d, { fundo: C.nevoa });
  _cabecalho(d, s, { rotulo: "RESUMO", titulo });
  const w = tarefa ? 7.4 : W - 2 * M;
  pontos.slice(0, 4).forEach((p, i) => {
    const y = 2.35 + i * 0.95;
    _bolinha(d, s, i + 1, M, y);
    s.addText(runs(p, { fontFace: F.corpo, fontSize: 19, color: C.texto }), { x: M + 0.65, y: y - 0.1, w: w - 0.7, h: 0.7, margin: 0, valign: "middle" });
  });
  if (tarefa) {
    s.addShape(d.pptx.ShapeType.roundRect, { x: 8.6, y: 2.3, w: 4.0, h: 3.6, fill: { color: C.creme }, line: { color: C.taupe, width: 1 }, rectRadius: 0.12 });
    _rotulo(s, "TAREFA", 8.9, 2.55, 3.4);
    s.addText(tarefa, { x: 8.9, y: 3.0, w: 3.4, h: 2.7, fontFace: F.corpo, fontSize: 16, color: C.carvao, valign: "top", margin: 0, fit: "shrink" });
  }
  return s;
}

/** Slide final: frase + chamada + contato. */
function final(d, { frase: f = "Viva o seu novo momento na enfermagem.", chamada = "", contato = "@mariveras.enf" }) {
  const s = _slide(d, { fundo: C.branco, rodape: false });
  s.addText(`“${f}”`, { x: 1.2, y: 2.2, w: W - 2.4, h: 1.6, fontFace: F.efeito, fontSize: 40, italic: true, color: C.carvao, align: "center", margin: 0, fit: "shrink" });
  if (chamada) s.addText(chamada, { x: 1.2, y: 4.0, w: W - 2.4, h: 0.6, fontFace: F.corpo, fontSize: 16, color: C.texto, align: "center", margin: 0 });
  _fio(d, s, W / 2 - 0.45, 4.9);
  s.addText(ASSINATURA, { x: 1.2, y: 5.15, w: W - 2.4, h: 0.3, fontFace: F.corpo, fontSize: 10, bold: true, color: C.texto, charSpacing: 2, align: "center", margin: 0 });
  s.addText(contato, { x: 1.2, y: 5.5, w: W - 2.4, h: 0.35, fontFace: F.corpo, fontSize: 13, color: C.ouroEscuro, align: "center", margin: 0 });
  return s;
}

async function salvar(d, caminho) {
  await d.pptx.writeFile({ fileName: caminho });
  return caminho;
}

module.exports = { C, F, novo, runs, itensComDestaque, capaCurso, capaModulo, objetivos, conteudo, duasColunas, tabela, fluxo, alerta, caso, imagem, frase, resumo, final, salvar };
