// Monta formulários a partir das listas de campos (campos.js)
// e lê os valores de volta.
import { h, $$, numeroOuNulo, numeroBR } from "./util.js";

let contador = 0;

export function campoEl(c, valor) {
  const idHtml = "c" + ++contador + "_" + c.id;
  const largura = c.largura ? " campo-" + c.largura : "";
  const rotulo = h("label", { for: idHtml }, c.rotulo, c.unidade ? h("span", { class: "unidade" }, " (" + c.unidade + ")") : null);
  let entrada;

  switch (c.tipo) {
    case "area":
      entrada = h("textarea", { id: idHtml, name: c.id, rows: 3, placeholder: c.dica || "", value: valor || "" });
      break;
    case "numero":
      entrada = h("input", {
        id: idHtml, name: c.id, type: "text", inputmode: "decimal", placeholder: c.dica || "",
        value: valor == null ? "" : String(valor).replace(".", ","),
      });
      break;
    case "data":
      entrada = h("input", { id: idHtml, name: c.id, type: "date", value: valor || "" });
      break;
    case "opcao":
      entrada = h("select", { id: idHtml, name: c.id, value: valor || "" },
        h("option", { value: "" }, "—"),
        c.opcoes.map((o) => h("option", { value: o }, o)),
        valor && !c.opcoes.includes(valor) ? h("option", { value: valor }, valor) : null,
      );
      break;
    case "radio":
    case "marcar": {
      const multi = c.tipo === "marcar";
      const marcados = multi ? (Array.isArray(valor) ? valor : []) : [valor];
      return h("fieldset", { class: "campo" + largura, dataset: { campo: c.id } },
        h("legend", null, c.rotulo),
        h("div", { class: "opcoes" },
          c.opcoes.map((o) =>
            h("label", { class: "chip" },
              h("input", {
                type: multi ? "checkbox" : "radio", name: c.id, value: o, checked: marcados.includes(o),
                // permite desmarcar o radio tocando de novo
                onclick: multi ? null : (e) => {
                  if (e.target.dataset.estava === "1") { e.target.checked = false; e.target.dataset.estava = "0"; }
                  else { $$(`input[name="${c.id}"]`, e.target.closest("fieldset")).forEach((x) => (x.dataset.estava = "0")); e.target.dataset.estava = "1"; }
                  e.target.dispatchEvent(new Event("input", { bubbles: true }));
                },
                dataset: { estava: marcados.includes(o) ? "1" : "0" },
              }),
              h("span", null, o),
            ),
          ),
        ),
      );
    }
    default:
      entrada = h("input", { id: idHtml, name: c.id, type: "text", placeholder: c.dica || "", value: valor || "" });
  }
  return h("div", { class: "campo" + largura }, rotulo, entrada);
}

export function camposEl(campos, valores = {}) {
  return h("div", { class: "grade-campos" }, campos.map((c) => campoEl(c, valores[c.id])));
}

export function secoesEl(secoes, valores = {}) {
  return secoes.map((s, i) =>
    h("details", { class: "secao", open: i === 0 },
      h("summary", null, h("span", { class: "secao-num" }, String(i + 1).padStart(2, "0")), s.titulo, h("span", { class: "secao-preenchidos" })),
      camposEl(s.campos, valores),
    ),
  );
}

// Mostra quantos campos foram preenchidos em cada seção
export function atualizarContagem(raiz, secoes) {
  const dets = $$("details.secao", raiz);
  secoes.forEach((s, i) => {
    const vals = lerCampos(dets[i], s.campos);
    const n = Object.keys(vals).length;
    const alvo = dets[i] && dets[i].querySelector(".secao-preenchidos");
    if (alvo) alvo.textContent = n ? n + " preenchido" + (n > 1 ? "s" : "") : "";
  });
}

export function lerCampos(raiz, campos) {
  const out = {};
  if (!raiz) return out;
  for (const c of campos) {
    if (c.tipo === "marcar") {
      const v = $$(`input[name="${c.id}"]:checked`, raiz).map((x) => x.value);
      if (v.length) out[c.id] = v;
    } else if (c.tipo === "radio") {
      const x = raiz.querySelector(`input[name="${c.id}"]:checked`);
      if (x) out[c.id] = x.value;
    } else {
      const x = raiz.querySelector(`[name="${c.id}"]`);
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

// Texto legível de um valor (para resumo, impressão e backup)
export function valorTexto(c, v) {
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (c.tipo === "numero") return numeroBR(v, 2) + (c.unidade ? " " + c.unidade : "");
  if (c.tipo === "data" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split("-").reverse().join("/");
  return String(v);
}

// Área estimada da lesão (comprimento × largura)
export function areaLesao(av) {
  const c = numeroOuNulo(av && av.lesao_comprimento);
  const l = numeroOuNulo(av && av.lesao_largura);
  return c != null && l != null ? c * l : null;
}
