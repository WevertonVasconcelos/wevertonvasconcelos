// Desenha as folhas da ficha (campos.js) no visual da ficha de papel
// e lê os valores de volta.
import { h, $$, numeroOuNulo, numeroBR, dataBR } from "./util.js";
import { FIGURAS_CORPO } from "./campos.js";

let contador = 0;
const novoId = (c) => "c" + ++contador + "_" + (c.id || "x");

// ---------- Folha inteira ----------
// folha: { titulo: ["FICHA DE", "ANAMNESE"], colunas: [[...], [...]], rodape: [...] }
export function folhaEl(folha, valores = {}, { omitir = [], semTitulo = false } = {}) {
  const ctx = { valores, omitir: new Set(omitir) };
  const el = h("section", { class: "folha" },
    semTitulo ? null : tituloFicha(folha.titulo, folha.roxo),
    h("div", { class: "folha-colunas" + (folha.colunas.length > 1 ? " duas" : "") },
      folha.colunas.map((col) => h("div", { class: "folha-coluna" }, col.map((c) => campoEl(c, ctx))))),
    folha.rodape ? h("div", { class: "folha-rodape" }, folha.rodape.map((c) => campoEl(c, ctx))) : null,
  );
  ligarCalculos(el);
  return el;
}

// "FICHA DE **ANAMNESE**"
export function tituloFicha([fino, forte], roxo = false) {
  return h("h2", { class: "titulo-ficha" + (roxo ? " roxo" : "") }, fino ? fino + " " : "", h("b", null, forte));
}

function campoEl(c, ctx) {
  if (c.id && ctx.omitir.has(c.id)) return null;
  const v = c.id ? ctx.valores[c.id] : undefined;
  switch (c.tipo) {
    case "caixa":
      return h("fieldset", { class: "caixa" + (c.grande ? " caixa-grande" : "") },
        c.rotulo ? h("legend", null, c.rotulo) : null,
        c.campos.map((x) => campoEl(x, ctx)));
    case "lado":
      return h("div", { class: "lado" }, c.campos.map((x) => campoEl(x, ctx)));
    case "grade":
      return h("div", { class: "grade-medidas" }, c.campos.filter((x) => !ctx.omitir.has(x.id)).map((x) => {
        const id = novoId(x);
        return h("div", { class: "medida" },
          h("label", { for: id }, x.rotulo, x.unidade ? h("small", null, " " + x.unidade) : null),
          entrada(x, v === undefined ? ctx.valores[x.id] : v, id, "caixa-entrada"));
      }));
    case "tabela":
      return h("table", { class: "tabela-plano" },
        h("tbody", null, c.campos.map((x) => {
          const id = novoId(x);
          return h("tr", null,
            h("th", { scope: "row" }, h("label", { for: id }, x.rotulo)),
            h("td", null, h("textarea", { id, name: x.id, rows: 1, value: ctx.valores[x.id] || "", class: "auto-altura" })));
        })));
    case "simnao":
      return h("div", { class: "pergunta" + (c.compacto ? " compacta" : ""), dataset: { campo: c.id } },
        h("div", { class: "pergunta-linha" },
          h("span", { class: "rotulo-forte" }, c.rotulo),
          h("div", { class: "caixinhas em-linha" }, ["Sim", "Não"].map((o) => caixinha("radio", c.id, o, v === o)))),
        c.sub ? h("div", { class: "pergunta-sub" }, c.sub.map((x) => campoEl(x, ctx))) : null);
    case "marcar":
    case "radio": {
      const marcados = c.tipo === "marcar" ? (Array.isArray(v) ? v : []) : [v];
      return h("div", { class: "bloco-opcoes", dataset: { campo: c.id } },
        c.rotulo ? h("span", { class: "rotulo-forte" }, c.rotulo) : null,
        h("div", { class: "caixinhas" + (c.colunas === 1 ? " uma-coluna" : "") },
          c.opcoes.map((o) => caixinha(c.tipo === "marcar" ? "checkbox" : "radio", c.id, o, marcados.includes(o)))));
    }
    case "mapa":
      return mapaEl(c.id, v, true);
    default: {
      const id = novoId(c);
      return h("div", { class: "campo" + (c.tipo === "area" ? " campo-area" : "") },
        c.rotulo ? h("label", { for: id, class: "rotulo-forte" }, c.rotulo, c.unidade ? h("small", null, " " + c.unidade) : null) : null,
        entrada(c, v, id, c.tipo === "area" ? "caixa-texto" : "linha"));
    }
  }
}

function entrada(c, v, id, estilo) {
  const base = { id, name: c.id, class: estilo, placeholder: c.dica || "", autocomplete: "off" };
  if (c.tipo === "area") return h("textarea", { ...base, rows: c.linhas || 3, value: v || "" });
  if (c.tipo === "data") return h("input", { ...base, type: "date", value: v || "" });
  if (c.tipo === "opcao") {
    return h("select", { ...base, value: v || "" },
      h("option", { value: "" }, "—"),
      c.opcoes.map((o) => h("option", { value: o }, o)),
      v && !c.opcoes.includes(v) ? h("option", { value: v }, v) : null);
  }
  if (c.tipo === "numero") {
    return h("input", {
      ...base, type: "text", inputmode: "decimal", readonly: !!c.calculado, tabindex: c.calculado ? -1 : null,
      value: v == null ? "" : String(v).replace(".", ","),
      dataset: c.calculado ? { calculado: c.calculado } : undefined,
    });
  }
  return h("input", { ...base, type: "text", value: v || "" });
}

// Caixinha quadrada da ficha (checkbox ou escolha única)
function caixinha(tipo, nome, valor, marcado) {
  return h("label", { class: "caixinha" },
    h("input", {
      type: tipo, name: nome, value: valor, checked: !!marcado,
      dataset: tipo === "radio" ? { estava: marcado ? "1" : "0" } : undefined,
      onclick: tipo === "radio" ? desmarcavel : null,
    }),
    h("span", { class: "quadrado", "aria-hidden": "true" }),
    h("span", { class: "texto" }, valor));
}

// Escolha única que pode ser desmarcada tocando de novo
function desmarcavel(e) {
  const x = e.target;
  const grupo = $$(`input[name="${CSS.escape(x.name)}"]`, x.closest("form") || document);
  if (x.dataset.estava === "1") { x.checked = false; x.dataset.estava = "0"; }
  else { grupo.forEach((g) => (g.dataset.estava = "0")); x.dataset.estava = "1"; }
  x.dispatchEvent(new Event("input", { bubbles: true }));
}

// IMC automático e textarea que cresce
function ligarCalculos(raiz) {
  raiz.addEventListener("input", (e) => {
    if (e.target.name === "peso" || e.target.name === "altura") {
      const imc = raiz.querySelector('[data-calculado="imc"]');
      const p = numeroOuNulo(raiz.querySelector('[name="peso"]')?.value);
      const a = numeroOuNulo(raiz.querySelector('[name="altura"]')?.value);
      if (imc) imc.value = p && a ? numeroBR(p / Math.pow(a / 100, 2), 1) : "";
    }
    if (e.target.classList.contains("auto-altura")) crescer(e.target);
  });
  requestAnimationFrame(() => $$(".auto-altura", raiz).forEach(crescer));
}
function crescer(t) {
  t.style.height = "auto";
  t.style.height = t.scrollHeight + 2 + "px";
}

// ---------- Mapa do corpo ----------
// marcas: [{ f: "corpo", x: 0.42, y: 0.31 }]
export function mapaEl(nome, valor, editavel) {
  const marcas = Array.isArray(valor) ? valor.slice() : [];
  const oculto = editavel ? h("input", { type: "hidden", name: nome, value: JSON.stringify(marcas) }) : null;
  const figuras = FIGURAS_CORPO.map((fig) => {
    const caixa = h("div", { class: "mapa-figura mapa-" + fig.id, style: { aspectRatio: fig.largura + " / " + fig.altura } },
      h("img", { src: fig.arquivo, alt: fig.nome, draggable: "false" }));
    if (editavel) {
      caixa.addEventListener("click", (e) => {
        if (e.target.classList.contains("mapa-marca")) return;
        const r = caixa.getBoundingClientRect();
        marcas.push({ f: fig.id, x: +((e.clientX - r.left) / r.width).toFixed(3), y: +((e.clientY - r.top) / r.height).toFixed(3) });
        desenhar(true);
      });
    }
    return caixa;
  });
  function desenhar(mudou) {
    figuras.forEach((caixa, i) => {
      caixa.querySelectorAll(".mapa-marca").forEach((m) => m.remove());
      marcas.forEach((m, n) => {
        if (m.f !== FIGURAS_CORPO[i].id) return;
        caixa.append(h(editavel ? "button" : "span", {
          type: editavel ? "button" : null, class: "mapa-marca", style: { left: m.x * 100 + "%", top: m.y * 100 + "%" },
          title: editavel ? "Tirar esta marca" : null, "aria-label": "Marca " + (n + 1),
          onclick: editavel ? () => { marcas.splice(n, 1); desenhar(true); } : null,
        }, String(n + 1)));
      });
    });
    if (oculto) {
      oculto.value = JSON.stringify(marcas);
      if (mudou) oculto.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  desenhar(false);
  return h("div", { class: "mapa" + (editavel ? " editavel" : "") },
    h("div", { class: "mapa-figuras" }, figuras),
    editavel ? h("p", { class: "mapa-dica" }, "Toque na figura para marcar o local. Toque no número para tirar.") : null,
    oculto);
}

// ---------- Leitura ----------
export function lerCampos(raiz, campos) {
  const out = {};
  if (!raiz) return out;
  for (const c of campos) {
    const sel = `[name="${CSS.escape(c.id)}"]`;
    if (c.tipo === "marcar") {
      const v = $$(sel + ":checked", raiz).map((x) => x.value);
      if (v.length) out[c.id] = v;
    } else if (c.tipo === "radio" || c.tipo === "simnao") {
      const x = raiz.querySelector(sel + ":checked");
      if (x) out[c.id] = x.value;
    } else if (c.tipo === "mapa") {
      const x = raiz.querySelector(sel);
      try { const m = x ? JSON.parse(x.value) : []; if (m.length) out[c.id] = m; } catch (e) { /* ignora */ }
    } else {
      const x = raiz.querySelector(sel);
      if (!x) continue;
      const v = x.value.trim();
      if (v === "") continue;
      if (c.tipo === "numero") {
        const n = numeroOuNulo(v);
        out[c.id] = n == null ? v : n;
      } else out[c.id] = v;
    }
  }
  return out;
}

// Texto legível de um valor (resumo, impressão, backup)
export function valorTexto(c, v) {
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
  if (c.tipo === "mapa") return v.length + (v.length > 1 ? " marcações no mapa" : " marcação no mapa");
  if (Array.isArray(v)) return v.join(", ");
  if (c.tipo === "numero") return numeroBR(v, 2) + (c.unidade ? " " + c.unidade : "");
  if (c.tipo === "data") return dataBR(v);
  return String(v);
}

// ---------- Área e escala PUSH ----------
export function areaLesao(av) {
  const c = numeroOuNulo(av && av.lesao_comprimento);
  const l = numeroOuNulo(av && av.lesao_largura);
  return c != null && l != null ? c * l : null;
}

// PUSH 3.0 (Pressure Ulcer Scale for Healing): área (0–10) + exsudato (0–3) + tecido (0–4) = 0 a 17
export function calcularPush(av) {
  const area = areaLesao(av);
  if (area == null) return null;
  const pArea = area <= 0 ? 0 : area < 0.3 ? 1 : area <= 0.6 ? 2 : area <= 1 ? 3 : area <= 2 ? 4 : area <= 3 ? 5
    : area <= 4 ? 6 : area <= 8 ? 7 : area <= 12 ? 8 : area <= 24 ? 9 : 10;
  const ex = av.lesao_exsudato || [];
  let pEx = ex.includes("Abundante") ? 3 : ex.includes("Moderado") ? 2 : ex.includes("Pouco") ? 1 : ex.includes("Ausente") ? 0 : null;
  const t = av.lesao_tecido || [];
  let pTec = t.includes("Necrose seca") || t.includes("Necrose úmida") ? 4 : t.includes("Esfacelo") ? 3
    : t.includes("Granulação") ? 2 : t.includes("Epitelial") ? 1 : null;
  if (area <= 0) { pTec = 0; if (pEx == null) pEx = 0; }
  const total = pEx != null && pTec != null ? pArea + pEx + pTec : null;
  return { area, pArea, pEx, pTec, total };
}

export function textoPush(p) {
  if (!p) return "";
  const parte = (n) => (n == null ? "?" : n);
  return `PUSH ${p.total == null ? "incompleto" : p.total} (área ${numeroBR(p.area, 2)} cm² = ${p.pArea} · exsudato ${parte(p.pEx)} · tecido ${parte(p.pTec)})`;
}
