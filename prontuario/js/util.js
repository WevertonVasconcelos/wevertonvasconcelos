// Ferramentas pequenas usadas em todas as telas.

// O navegador escreve "null" quando recebe um item vazio em append/replaceChildren.
// Aqui os vazios são simplesmente ignorados, em todas as telas.
for (const metodo of ["append", "replaceChildren", "prepend"]) {
  for (const alvo of [Element.prototype, DocumentFragment.prototype]) {
    const original = alvo[metodo];
    alvo[metodo] = function (...itens) { return original.apply(this, itens.filter((x) => x != null && x !== false)); };
  }
}

// Formulário com alterações não salvas (o app pergunta antes de sair da tela)
export const edicao = { suja: false };

// Cria elementos sem usar HTML em texto (evita injeção de código).
// h("div", { class: "x", onclick: fn }, "texto", outroElemento, [lista])
export function h(tag, attrs, ...filhos) {
  const el = document.createElement(tag);
  let valor;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "value") valor = v;
      else if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k in el && k !== "list" && k !== "form" && typeof v !== "string") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
  }
  acrescentar(el, filhos);
  if (valor !== undefined) el.value = valor; // depois dos filhos, para <select> funcionar
  return el;
}

function acrescentar(el, filhos) {
  for (const f of filhos) {
    if (f == null || f === false) continue;
    if (Array.isArray(f)) acrescentar(el, f);
    else if (f instanceof Node) el.appendChild(f);
    else el.appendChild(document.createTextNode(String(f)));
  }
}

export const $ = (s, raiz = document) => raiz.querySelector(s);
export const $$ = (s, raiz = document) => Array.from(raiz.querySelectorAll(s));

// ---------- Formatos ----------
const fmtMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function moeda(v) {
  return fmtMoeda.format(Number(v) || 0);
}
export function numeroBR(v, casas = 1) {
  if (v == null || v === "" || isNaN(Number(v))) return "";
  return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: casas });
}
// "2026-11-24" -> "24/11/2026" (sem erro de fuso)
export function dataBR(iso) {
  if (!iso) return "";
  const s = String(iso);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [a, m, d] = s.split("-");
    return `${d}/${m}/${a}`;
  }
  return new Date(s).toLocaleDateString("pt-BR");
}
export function dataHoraBR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
export function hojeISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
// Valor para <input type="datetime-local">
export function paraInputDataHora(iso) {
  const d = iso ? new Date(iso) : new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function dataLocalISO(iso) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export function idade(nascimento) {
  if (!nascimento) return null;
  const [a, m, d] = nascimento.split("-").map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--;
  return anos;
}
export function semAcentos(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}
export function nomeArquivoSeguro(nome) {
  const limpo = semAcentos(nome).replace(/[^A-Za-z0-9._ -]+/g, "").replace(/\s+/g, " ").trim();
  return (limpo || "sem-nome").slice(0, 80);
}
export function numeroOuNulo(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

// ---------- Mensagens ----------
let timerAviso = null;
export function avisar(texto, tipo = "ok") {
  let el = $("#aviso");
  el.textContent = texto;
  el.className = "aviso aviso-" + tipo;
  el.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => (el.hidden = true), tipo === "erro" ? 6000 : 3200);
}

export function mensagemErro(erro) {
  const msg = (erro && (erro.message || erro.error_description)) || String(erro || "");
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(msg)) {
    return "Sem conexão com o servidor. Confira a internet e tente de novo.";
  }
  if (/JWT|session|not authenticated/i.test(msg)) return "Sua sessão expirou. Entre de novo.";
  if (/row-level security|permission denied/i.test(msg)) return "Sem permissão. Confira se o seu usuário está na equipe.";
  return msg || "Erro desconhecido.";
}

// Janela de confirmação (Promise<boolean>)
export function confirmar(texto, { sim = "Confirmar", nao = "Cancelar", perigo = false } = {}) {
  return new Promise((resolver) => {
    const dlg = h("dialog", { class: "dialogo" },
      h("p", null, texto),
      h("div", { class: "dialogo-botoes" },
        h("button", { type: "button", class: "botao botao-secundario", onclick: () => fechar(false) }, nao),
        h("button", { type: "button", class: "botao " + (perigo ? "botao-perigo" : "botao-primario"), onclick: () => fechar(true) }, sim),
      ),
    );
    function fechar(v) {
      dlg.close();
      dlg.remove();
      resolver(v);
    }
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); fechar(false); });
    document.body.appendChild(dlg);
    dlg.showModal();
  });
}

// Janela com conteúdo livre. Retorna { dlg, fechar }
export function janela(titulo, conteudo) {
  const dlg = h("dialog", { class: "dialogo dialogo-largo" },
    h("div", { class: "dialogo-topo" },
      h("h3", null, titulo),
      h("button", { type: "button", class: "botao-icone", "aria-label": "Fechar", onclick: () => fechar() }, "✕"),
    ),
    conteudo,
  );
  function fechar() {
    dlg.close();
    dlg.remove();
  }
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); fechar(); });
  document.body.appendChild(dlg);
  dlg.showModal();
  return { dlg, fechar };
}

// ---------- Imagens ----------
// Diminui a foto antes de enviar (economiza espaço e internet).
export async function reduzirImagem(arquivo, ladoMaximo = 1600, qualidade = 0.82) {
  const bitmap = await carregarImagem(arquivo);
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const hh = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = hh;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, hh);
  ctx.drawImage(bitmap, 0, 0, w, hh);
  if (bitmap.close) bitmap.close();
  return await new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error("Não consegui processar a imagem."))), "image/jpeg", qualidade),
  );
}

async function carregarImagem(arquivo) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    } catch (e) { /* tenta do jeito antigo */ }
  }
  return await new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => falha(new Error("Formato de imagem não suportado. Tente tirar a foto de novo ou enviar em JPG."));
    img.src = URL.createObjectURL(arquivo);
  });
}

export function ehImagem(arquivo) {
  return /^image\//.test(arquivo.type) || /\.(jpe?g|png|heic|heif|webp)$/i.test(arquivo.name || "");
}

// ---------- ZIP (sem compressão: fotos já são comprimidas) ----------
const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// arquivos: [{ nome: "pasta/arquivo.txt", dados: Uint8Array | string }]
export function criarZip(arquivos) {
  const enc = new TextEncoder();
  const partes = [];
  const central = [];
  let posicao = 0;
  const agora = new Date();
  const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | Math.floor(agora.getSeconds() / 2);
  const dia = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();

  for (const arq of arquivos) {
    const nome = enc.encode(arq.nome);
    const dados = typeof arq.dados === "string" ? enc.encode(arq.dados) : arq.dados;
    const crc = crc32(dados);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nomes em UTF-8
    local.setUint16(8, 0, true);
    local.setUint16(10, hora, true);
    local.setUint16(12, dia, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, dados.length, true);
    local.setUint32(22, dados.length, true);
    local.setUint16(26, nome.length, true);
    local.setUint16(28, 0, true);
    partes.push(local, nome, dados);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, hora, true);
    c.setUint16(14, dia, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, dados.length, true);
    c.setUint32(24, dados.length, true);
    c.setUint16(28, nome.length, true);
    c.setUint32(42, posicao, true);
    central.push(c, nome);
    posicao += 30 + nome.length + dados.length;
  }
  let tamanhoCentral = 0;
  for (const p of central) tamanhoCentral += p.byteLength;
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, arquivos.length, true);
  fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamanhoCentral, true);
  fim.setUint32(16, posicao, true);
  return new Blob([...partes, ...central, fim], { type: "application/zip" });
}

export function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: nome });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function escaparHTML(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
