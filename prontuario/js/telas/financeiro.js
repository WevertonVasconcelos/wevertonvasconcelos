// Resumo financeiro do mês: recebido, custo de material, resultado, por paciente.
import { sb, q } from "../banco.js";
import { h, moeda, dataBR } from "../util.js";
import { TIPOS_PLANO } from "../campos.js";
import { numero } from "./componentes.js";

let mesEscolhido = null;

export async function telaFinanceiro(tela) {
  if (!mesEscolhido) {
    const d = new Date();
    mesEscolhido = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
  const [ano, mes] = mesEscolhido.split("-").map(Number);
  const inicio = `${mesEscolhido}-01`;
  const fimData = new Date(ano, mes, 1);
  const fim = fimData.getFullYear() + "-" + String(fimData.getMonth() + 1).padStart(2, "0") + "-01";
  // evoluções usam data e hora: limites no fuso local
  const inicioTs = new Date(ano, mes - 1, 1).toISOString();
  const fimTs = new Date(ano, mes, 1).toISOString();

  const [pagamentos, evolucoes, planos, pacientes] = await Promise.all([
    q(sb.from("pagamentos").select("*").gte("data", inicio).lt("data", fim).order("data")),
    q(sb.from("evolucoes").select("id, paciente_id, data, evolucao_materiais(quantidade, custo_unitario)").gte("data", inicioTs).lt("data", fimTs)),
    q(sb.from("planos").select("*").eq("situacao", "ativo")),
    q(sb.from("pacientes").select("id, nome")),
  ]);
  const nome = Object.fromEntries(pacientes.map((p) => [p.id, p.nome]));

  const porPaciente = {};
  const linha = (id) => (porPaciente[id] ||= { id, atendimentos: 0, custo: 0, recebido: 0 });
  let custoTotal = 0;
  evolucoes.forEach((e) => {
    const c = e.evolucao_materiais.reduce((s, m) => s + m.quantidade * m.custo_unitario, 0);
    custoTotal += c;
    const l = linha(e.paciente_id);
    l.atendimentos++;
    l.custo += c;
  });
  let recebido = 0;
  pagamentos.forEach((p) => { recebido += Number(p.valor); linha(p.paciente_id).recebido += Number(p.valor); });
  const previstoMensal = planos.filter((p) => p.tipo === "mensal").reduce((s, p) => s + Number(p.valor), 0);
  const linhas = Object.values(porPaciente).sort((a, b) => (nome[a.id] || "").localeCompare(nome[b.id] || ""));

  tela.append(
    h("div", { class: "cabecalho-tela" },
      h("div", null, h("p", { class: "sobretitulo" }, "Gestão"), h("h1", null, "Financeiro")),
      h("input", {
        type: "month", class: "seletor-mes", value: mesEscolhido, "aria-label": "Mês",
        onchange: (e) => { if (e.target.value) { mesEscolhido = e.target.value; window.dispatchEvent(new HashChangeEvent("hashchange")); } },
      }),
    ),
    h("div", { class: "numeros" },
      numero("Recebido no mês", moeda(recebido)),
      numero("Custo de material", moeda(custoTotal)),
      numero("Resultado", moeda(recebido - custoTotal), recebido - custoTotal < 0 ? "negativo" : ""),
      numero("Atendimentos", String(evolucoes.length)),
    ),
    h("p", { class: "texto-suave pequeno" },
      "Resultado = recebido − material. Não inclui deslocamento, impostos, aluguel nem pró-labore. ",
      previstoMensal ? "Planos mensais ativos somam " + moeda(previstoMensal) + "/mês." : ""),

    h("div", { class: "cartao sem-padding" },
      h("h3", { class: "titulo-tabela" }, "Por paciente"),
      linhas.length
        ? h("div", { class: "rolagem" }, h("table", { class: "tabela" },
            h("thead", null, h("tr", null, h("th", null, "Paciente"), h("th", { class: "num" }, "Atend."), h("th", { class: "num" }, "Material"), h("th", { class: "num" }, "Recebido"), h("th", { class: "num" }, "Resultado"))),
            h("tbody", null, linhas.map((l) =>
              h("tr", null,
                h("td", null, h("a", { href: `#/paciente/${l.id}/financeiro` }, nome[l.id] || "—")),
                h("td", { class: "num" }, String(l.atendimentos)),
                h("td", { class: "num" }, moeda(l.custo)),
                h("td", { class: "num" }, moeda(l.recebido)),
                h("td", { class: "num" + (l.recebido - l.custo < 0 ? " negativo" : "") }, moeda(l.recebido - l.custo)),
              ))),
          ))
        : h("p", { class: "vazio" }, "Sem movimento neste mês."),
    ),

    h("div", { class: "cartao sem-padding" },
      h("h3", { class: "titulo-tabela" }, "Pagamentos do mês"),
      pagamentos.length
        ? h("div", { class: "rolagem" }, h("table", { class: "tabela" },
            h("thead", null, h("tr", null, h("th", null, "Data"), h("th", null, "Paciente"), h("th", null, "Forma"), h("th", { class: "num" }, "Valor"))),
            h("tbody", null, pagamentos.map((p) =>
              h("tr", null, h("td", null, dataBR(p.data)), h("td", null, nome[p.paciente_id] || "—"), h("td", null, p.forma || ""), h("td", { class: "num" }, moeda(p.valor))))),
          ))
        : h("p", { class: "vazio" }, "Nenhum pagamento registrado neste mês."),
    ),

    planos.length
      ? h("div", { class: "cartao sem-padding" },
          h("h3", { class: "titulo-tabela" }, "Planos ativos"),
          h("div", { class: "rolagem" }, h("table", { class: "tabela" },
            h("thead", null, h("tr", null, h("th", null, "Paciente"), h("th", null, "Plano"), h("th", null, "Desde"), h("th", { class: "num" }, "Valor"))),
            h("tbody", null, planos.map((p) =>
              h("tr", null,
                h("td", null, h("a", { href: `#/paciente/${p.paciente_id}/financeiro` }, nome[p.paciente_id] || "—")),
                h("td", null, (TIPOS_PLANO[p.tipo] || p.tipo) + (p.descricao ? " · " + p.descricao : "")),
                h("td", null, dataBR(p.inicio)),
                h("td", { class: "num" }, moeda(p.valor))))),
          )))
      : null,
  );
}
