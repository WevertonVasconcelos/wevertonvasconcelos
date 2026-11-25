// Simulador de planos de curativos — mesma lógica da planilha "SIMULADOR DE CURATIVOS TESTE"
// (abas Simulador, Configurações e Planos confirmados).
import { sb, q, nomeDe } from "../banco.js";
import { h, moeda, numeroOuNulo, numeroBR, dataHoraBR, hojeISO, avisar, mensagemErro, confirmar, edicao } from "../util.js";
import { cabecalho, quadro, abas, numero, pilula } from "./componentes.js";

// Taxas da aba "Configurações" da planilha (editáveis aqui e salvas no banco)
export const TAXAS_PADRAO = {
  locais: { "Clinical Center": 0.2, "Domicílio": 0 },
  pagamentos: { "Dinheiro": 0, "Pix": 0, "Cartão 1x": 0, "Cartão 2x": 0.06, "Cartão 3x": 0.084 },
  simples: 0.06,
};

export function abasFinanceiro(ativa) {
  return abas([["mes", "Resumo do mês", "#/financeiro"], ["simulador", "Simulador de curativos", "#/financeiro/simulador"]], ativa);
}

const r2 = (v) => Math.round(v * 100) / 100;

// Cálculo igual ao da planilha
export function calcularPlano(e, taxas) {
  const n = e.curativos || 0;
  const tLocal = taxas.locais[e.local];
  const tPag = taxas.pagamentos[e.forma];
  const custos = {
    materiais: r2(n * (e.material || 0)),
    deslocamento: r2(n * (e.deslocamento || 0)),
    outras: r2(e.outras || 0),
    fixas: r2(e.fixas || 0),
  };
  const percentual = (tLocal || 0) + (tPag || 0) + taxas.simples;
  let valor = e.valor || 0;
  if (e.modo === "meta") {
    const custoFixo = custos.materiais + custos.deslocamento + custos.outras + custos.fixas;
    valor = percentual < 1 ? r2(((e.meta || 0) * n + custoFixo) / (1 - percentual)) : 0;
  }
  const taxaClinica = r2(valor * (tLocal || 0));
  const taxaOperadora = r2(valor * (tPag || 0));
  const simples = r2(valor * taxas.simples);
  const total = r2(taxaClinica + taxaOperadora + simples + custos.materiais + custos.deslocamento + custos.outras + custos.fixas);
  const resultado = r2(valor - total);
  const pendente = !valor || !n || tLocal == null || tPag == null;
  return {
    valor, taxaClinica, taxaOperadora, simples, ...custos, total, resultado,
    porCurativo: n ? r2(resultado / n) : 0, margem: valor ? resultado / valor : 0, pendente,
    taxaLocal: tLocal, taxaPagamento: tPag, taxaSimples: taxas.simples,
  };
}

export async function telaSimulador(tela) {
  const [config, pacientes, simulacoes, mats] = await Promise.all([
    q(sb.from("configuracoes").select("*").eq("chave", "simulador")),
    q(sb.from("pacientes").select("id, nome, situacao").order("nome")),
    q(sb.from("simulacoes").select("*").eq("tipo", "plano").order("criado_em", { ascending: false }).limit(50)),
    q(sb.from("evolucoes").select("id, evolucao_materiais(quantidade, custo_unitario)").gte("data", new Date(Date.now() - 90 * 86400000).toISOString())),
  ]);
  const taxas = config[0] ? { ...TAXAS_PADRAO, ...config[0].valor } : structuredClone(TAXAS_PADRAO);
  const nomeP = Object.fromEntries(pacientes.map((p) => [p.id, p.nome]));
  // Custo médio real de material por sessão (últimos 90 dias)
  const custosSessao = mats.map((e) => e.evolucao_materiais.reduce((s, m) => s + m.quantidade * m.custo_unitario, 0)).filter((c) => c > 0);
  const mediaMaterial = custosSessao.length ? r2(custosSessao.reduce((a, b) => a + b, 0) / custosSessao.length) : null;

  const campo = (nome, rotulo, attrs = {}) => h("div", { class: "medida" },
    h("label", { for: "sim-" + nome }, rotulo),
    attrs.opcoes
      ? h("select", { id: "sim-" + nome, name: nome, class: "caixa-entrada", value: attrs.valor || "" }, attrs.opcoes.map(([v, t]) => h("option", { value: v }, t)))
      : h("input", { id: "sim-" + nome, name: nome, type: "text", class: "caixa-entrada", inputmode: attrs.modo || "decimal", placeholder: attrs.dica || "", value: attrs.valor != null ? attrs.valor : "" }));

  const opcoesLocal = () => Object.keys(taxas.locais).map((k) => [k, `${k} (${numeroBR(taxas.locais[k] * 100, 1)}%)`]);
  const opcoesPag = () => Object.keys(taxas.pagamentos).map((k) => [k, `${k} (${numeroBR(taxas.pagamentos[k] * 100, 1)}%)`]);

  const form = h("form", { class: "sim-form" },
    h("div", { class: "caixinhas em-linha", style: { marginBottom: "12px" } },
      ["resultado", "meta"].map((m) => h("label", { class: "caixinha" },
        h("input", { type: "radio", name: "modo", value: m, checked: m === "resultado" }), h("span", { class: "quadrado" }),
        h("span", { class: "texto" }, m === "resultado" ? "Tenho o valor: calcular o resultado" : "Tenho a meta: calcular o preço")))),
    h("div", { class: "medida" }, h("label", { for: "sim-paciente" }, "Paciente"),
      h("select", { id: "sim-paciente", name: "paciente", class: "caixa-entrada" },
        h("option", { value: "" }, "— sem paciente / simulação livre —"),
        pacientes.filter((p) => p.situacao === "em tratamento").map((p) => h("option", { value: p.id }, p.nome)))),
    h("div", { class: "grade-medidas sim-grade" },
      h("div", { class: "medida", dataset: { so: "resultado" } }, h("label", { for: "sim-valor" }, "Valor total cobrado (R$)"),
        h("input", { id: "sim-valor", name: "valor", type: "text", class: "caixa-entrada", inputmode: "decimal", value: "" })),
      h("div", { class: "medida", dataset: { so: "meta" }, hidden: true }, h("label", { for: "sim-meta" }, "Meta líquida por curativo (R$)"),
        h("input", { id: "sim-meta", name: "meta", type: "text", class: "caixa-entrada", inputmode: "decimal", value: "" })),
      campo("curativos", "Número de curativos", { modo: "numeric", valor: "10" }),
      campo("local", "Local do atendimento", { opcoes: opcoesLocal(), valor: "Clinical Center" }),
      campo("forma", "Forma de pagamento", { opcoes: opcoesPag(), valor: "Pix" }),
      campo("material", "Material por curativo (R$)", { valor: mediaMaterial != null ? String(mediaMaterial).replace(".", ",") : "" }),
      campo("deslocamento", "Deslocamento por curativo (R$)"),
      campo("outras", "Outras despesas do plano (R$)", { dica: "laser, insumo extra…" }),
      campo("fixas", "Despesas fixas alocadas (R$)"),
    ),
    mediaMaterial != null ? h("p", { class: "pequeno texto-suave" }, `Material já preenchido com a média real das sessões dos últimos 90 dias: ${moeda(mediaMaterial)} por curativo.`) : null,
  );

  const saida = h("div");
  let ultimo = null;
  function ler() {
    const f = form.elements;
    return {
      modo: form.querySelector('[name="modo"]:checked').value,
      paciente_id: f.paciente.value || null,
      valor: numeroOuNulo(f.valor.value),
      meta: numeroOuNulo(f.meta.value),
      curativos: numeroOuNulo(f.curativos.value),
      local: f.local.value,
      forma: f.forma.value,
      material: numeroOuNulo(f.material.value),
      deslocamento: numeroOuNulo(f.deslocamento.value),
      outras: numeroOuNulo(f.outras.value),
      fixas: numeroOuNulo(f.fixas.value),
    };
  }
  function calcular() {
    const e = ler();
    form.querySelectorAll("[data-so]").forEach((el) => (el.hidden = el.dataset.so !== e.modo));
    const r = calcularPlano(e, taxas);
    ultimo = { e, r };
    const linha = (rot, v, pct) => h("tr", null, h("td", null, rot, pct != null ? h("small", { class: "texto-suave" }, ` (${numeroBR(pct * 100, 1)}%)`) : null), h("td", { class: "num" }, v ? moeda(v) : "–"));
    saida.replaceChildren(
      r.pendente ? h("p", { class: "pd-alerta" }, "Preencha valor (ou meta) e número de curativos para ver o resultado.") : null,
      e.modo === "meta" ? h("div", { class: "numero destaque", style: { marginBottom: "12px" } }, h("small", null, "Preço sugerido do plano"), h("strong", null, moeda(r.valor)),
        h("small", null, e.curativos ? moeda(r.valor / e.curativos) + " por curativo" : "")) : null,
      h("table", { class: "tabela-ficha" },
        h("thead", null, h("tr", null, h("th", null, "Descontos e despesas"), h("th", { class: "num" }, "Valor"))),
        h("tbody", null,
          linha("Taxa da clínica", r.taxaClinica, r.taxaLocal),
          linha("Taxa da operadora", r.taxaOperadora, r.taxaPagamento),
          linha("Simples Nacional", r.simples, r.taxaSimples),
          linha("Materiais", r.materiais),
          linha("Deslocamento total", r.deslocamento),
          linha("Outras despesas", r.outras),
          linha("Despesas fixas alocadas", r.fixas),
          h("tr", { class: "total-linha" }, h("td", null, h("b", null, "Total de descontos e despesas")), h("td", { class: "num" }, h("b", null, moeda(r.total)))))),
      h("div", { class: "linha-pilula", style: { marginTop: "16px" } }, pilula("Resultado do plano")),
      h("div", { class: "numeros" },
        numero("Resultado líquido estimado", r.pendente ? "–" : moeda(r.resultado), r.resultado < 0 ? "negativo" : "destaque"),
        numero("Líquido por curativo", r.pendente ? "–" : moeda(r.porCurativo), r.porCurativo < 0 ? "negativo" : ""),
        numero("Margem estimada", r.pendente ? "–" : numeroBR(r.margem * 100, 1) + "%", r.margem < 0 ? "negativo" : "")),
      h("p", { class: "pequeno texto-suave" }, "Conferir valores antes de salvar o plano. O resultado não inclui pró-labore nem despesas não lançadas."),
    );
  }
  form.addEventListener("input", calcular);
  form.addEventListener("change", calcular);

  async function salvar(criarPlano) {
    const { e, r } = ultimo;
    if (r.pendente) { avisar("Preencha o valor (ou a meta) e o número de curativos.", "erro"); return; }
    if (criarPlano && !e.paciente_id) { avisar("Escolha o paciente para criar o plano.", "erro"); return; }
    try {
      await q(sb.from("simulacoes").insert({
        paciente_id: e.paciente_id, tipo: "plano",
        descricao: `${e.curativos} curativos · ${e.local} · ${e.forma}`, dados: e, resultado: r,
      }));
      if (criarPlano) {
        await q(sb.from("planos").insert({
          paciente_id: e.paciente_id, tipo: "pacote", valor: r.valor, sessoes_previstas: e.curativos, inicio: hojeISO(),
          descricao: `${e.curativos} curativos · ${e.local} · ${e.forma}`,
          observacoes: `Simulação: resultado estimado ${moeda(r.resultado)} (${numeroBR(r.margem * 100, 1)}%).`,
        }));
        avisar("Plano criado no financeiro de " + nomeP[e.paciente_id] + ".");
      } else avisar("Simulação salva.");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } catch (err) { avisar(mensagemErro(err), "erro"); }
  }

  // ----- Configurações (taxas) -----
  function caixaTaxas() {
    const pct = (v) => numeroBR(v * 100, 2);
    const linhas = [];
    const entrada = (grupo, chave, v) => h("input", { type: "text", class: "caixa-entrada sim-taxa", inputmode: "decimal", value: pct(v), dataset: { grupo, chave } });
    Object.entries(taxas.locais).forEach(([k, v]) => linhas.push(h("tr", null, h("td", null, "Local: " + k), h("td", { class: "num" }, entrada("locais", k, v), " %"))));
    Object.entries(taxas.pagamentos).forEach(([k, v]) => linhas.push(h("tr", null, h("td", null, "Pagamento: " + k), h("td", { class: "num" }, entrada("pagamentos", k, v), " %"))));
    linhas.push(h("tr", null, h("td", null, "Simples Nacional (sobre a receita bruta)"), h("td", { class: "num" }, entrada("simples", "", taxas.simples), " %")));
    const tabela = h("table", { class: "tabela-ficha" }, h("thead", null, h("tr", null, h("th", null, "Taxa"), h("th", { class: "num" }, "Alíquota"))), h("tbody", null, linhas));
    const botao = h("button", { type: "button", class: "botao botao-secundario botao-pequeno" }, "Salvar taxas");
    botao.addEventListener("click", async () => {
      const novo = structuredClone(taxas);
      tabela.querySelectorAll("input").forEach((i) => {
        const v = (numeroOuNulo(i.value) || 0) / 100;
        if (i.dataset.grupo === "simples") novo.simples = v; else novo[i.dataset.grupo][i.dataset.chave] = v;
      });
      try {
        if (config[0]) await q(sb.from("configuracoes").update({ valor: novo }).eq("id", config[0].id));
        else await q(sb.from("configuracoes").insert({ chave: "simulador", valor: novo }));
        avisar("Taxas salvas."); window.dispatchEvent(new HashChangeEvent("hashchange"));
      } catch (err) { avisar(mensagemErro(err), "erro"); }
    });
    return h("details", { class: "sim-config" }, h("summary", null, "Configurações: taxas do local, do pagamento e do imposto"),
      h("div", { class: "rolagem" }, tabela),
      h("p", { class: "pequeno texto-suave" }, "Clinical Center recebe 20% do valor bruto; no domicílio não há essa taxa. Simples Nacional sobre a receita bruta, inclusive dinheiro e Pix: conferir a alíquota efetiva com a contabilidade."),
      h("div", { class: "acoes-form" }, botao));
  }

  // ----- Histórico ("Planos confirmados") -----
  const historico = simulacoes.length
    ? h("div", { class: "rolagem" }, h("table", { class: "tabela-ficha" },
        h("thead", null, h("tr", null, h("th", null, "Data"), h("th", null, "Paciente"), h("th", null, "Plano"), h("th", { class: "num" }, "Receita"),
          h("th", { class: "num" }, "Resultado"), h("th", { class: "num" }, "Por curativo"), h("th", { class: "num" }, "Margem"), h("th", null, ""))),
        h("tbody", null, simulacoes.map((s) => h("tr", null,
          h("td", { class: "col-data" }, dataHoraBR(s.criado_em), h("div", { class: "pequeno texto-suave" }, nomeDe(s.criado_por))),
          h("td", null, nomeP[s.paciente_id] || "—"),
          h("td", null, s.descricao || ""),
          h("td", { class: "num" }, moeda(s.resultado.valor)),
          h("td", { class: "num" + (s.resultado.resultado < 0 ? " negativo" : "") }, moeda(s.resultado.resultado)),
          h("td", { class: "num" }, moeda(s.resultado.porCurativo)),
          h("td", { class: "num" }, numeroBR((s.resultado.margem || 0) * 100, 1) + "%"),
          h("td", { class: "num" }, h("button", { type: "button", class: "botao-link", onclick: async () => {
            if (!(await confirmar("Apagar esta simulação do histórico?", { sim: "Apagar", perigo: true }))) return;
            try { await q(sb.from("simulacoes").delete().eq("id", s.id)); window.dispatchEvent(new HashChangeEvent("hashchange")); }
            catch (err) { avisar(mensagemErro(err), "erro"); }
          } }, "Apagar")),
        )))))
    : h("p", { class: "vazio" }, "Nenhuma simulação salva ainda.");

  tela.append(
    cabecalho({ titulo: ["SIMULADOR DE", "CURATIVOS"] }),
    abasFinanceiro("simulador"),
    h("div", { class: "dois-quadros" },
      quadro("Dados do plano", form),
      quadro("Descontos, despesas e resultado", saida,
        h("div", { class: "acoes-form" },
          h("button", { type: "button", class: "botao botao-secundario", onclick: () => salvar(false) }, "Salvar simulação"),
          h("button", { type: "button", class: "botao botao-primario", onclick: () => salvar(true) }, "Criar plano para o paciente")))),
    caixaTaxas(),
    h("div", null, h("div", { class: "linha-pilula" }, pilula("Simulações salvas")), historico),
  );
  calcular();
  edicao.suja = false;
}
