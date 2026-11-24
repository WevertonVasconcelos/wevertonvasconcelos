// Evolução: descrição do atendimento, avaliação da lesão, fotos, materiais usados e pagamento.
import { sb, q, enviarArquivo } from "../banco.js";
import { h, moeda, numeroOuNulo, paraInputDataHora, dataLocalISO, avisar, mensagemErro, edicao, numeroBR } from "../util.js";
import { AVALIACAO_LESAO, TIPOS_ATENDIMENTO, LOCAIS_ATENDIMENTO, FORMAS_PAGAMENTO } from "../campos.js";
import { camposEl, lerCampos, areaLesao } from "../formulario.js";
import { escolherFotos, gradeFotos } from "./componentes.js";

export async function telaEvolucao(tela, pacienteIdNovo, evolucaoId) {
  let e = { data: new Date().toISOString(), avaliacao: {}, evolucao_materiais: [], tipo: "Curativo", local_atendimento: "Clinical Center" };
  if (evolucaoId) {
    e = await q(sb.from("evolucoes").select("*, evolucao_materiais(*)").eq("id", evolucaoId).single());
  }
  const pacienteId = pacienteIdNovo || e.paciente_id;

  const [p, lesoes, materiais, fotosExistentes, anterior, pagamentoExistente] = await Promise.all([
    q(sb.from("pacientes").select("id, nome").eq("id", pacienteId).single()),
    q(sb.from("lesoes").select("id, nome, situacao").eq("paciente_id", pacienteId).order("criado_em")),
    q(sb.from("materiais").select("*").order("nome")),
    evolucaoId ? q(sb.from("arquivos").select("*").eq("evolucao_id", evolucaoId).order("criado_em")) : [],
    evolucaoId ? [] : q(sb.from("evolucoes").select("lesao_id, tipo, local_atendimento, conduta").eq("paciente_id", pacienteId).order("data", { ascending: false }).limit(1)),
    evolucaoId ? q(sb.from("pagamentos").select("*").eq("evolucao_id", evolucaoId).limit(1)) : [],
  ]);
  // Nova evolução começa com a lesão, tipo e local da última
  if (!evolucaoId && anterior.length) {
    e.lesao_id = anterior[0].lesao_id;
    e.tipo = anterior[0].tipo || e.tipo;
    e.local_atendimento = anterior[0].local_atendimento || e.local_atendimento;
  }
  const lesoesAtivas = lesoes.filter((l) => l.situacao === "em tratamento" || l.id === e.lesao_id);
  // Só uma lesão em tratamento: já vem escolhida
  if (!evolucaoId && !e.lesao_id && lesoesAtivas.length === 1) e.lesao_id = lesoesAtivas[0].id;
  const pagamento = pagamentoExistente[0] || null;

  // ----- Materiais usados -----
  const linhasMat = h("div", { class: "linhas-materiais" });
  const totalMat = h("strong");
  function linhaMaterial(m = {}) {
    const ativos = materiais.filter((x) => x.ativo || x.id === m.material_id);
    const sel = h("select", { name: "mat_id", value: m.material_id || "" },
      h("option", { value: "" }, "Escolha o material"),
      ativos.map((x) => h("option", { value: x.id }, `${x.nome} (${moeda(x.custo_unitario)}/${x.unidade})`)));
    const qtd = h("input", { name: "mat_qtd", type: "text", inputmode: "decimal", value: m.quantidade != null ? String(m.quantidade).replace(".", ",") : "1", "aria-label": "Quantidade" });
    const linha = h("div", { class: "linha-material", dataset: { custo: m.custo_unitario != null ? m.custo_unitario : "" } },
      sel, qtd,
      h("button", { type: "button", class: "botao-icone", "aria-label": "Tirar material", onclick: () => { linha.remove(); recalcular(); edicao.suja = true; } }, "✕"));
    sel.addEventListener("change", () => { linha.dataset.custo = ""; recalcular(); });
    qtd.addEventListener("input", recalcular);
    linhasMat.append(linha);
  }
  function lerMateriais() {
    return [...linhasMat.querySelectorAll(".linha-material")].map((l) => {
      const id = l.querySelector("[name=mat_id]").value;
      const cat = materiais.find((x) => x.id === id);
      const custo = l.dataset.custo !== "" ? Number(l.dataset.custo) : cat ? Number(cat.custo_unitario) : 0;
      return { material_id: id, quantidade: numeroOuNulo(l.querySelector("[name=mat_qtd]").value) || 0, custo_unitario: custo };
    }).filter((m) => m.material_id && m.quantidade > 0);
  }
  function recalcular() {
    totalMat.textContent = moeda(lerMateriais().reduce((s, m) => s + m.quantidade * m.custo_unitario, 0));
  }
  e.evolucao_materiais.forEach(linhaMaterial);
  recalcular();

  // ----- Fotos -----
  const fotos = escolherFotos({ texto: "Tirar ou escolher fotos da lesão", aoMudar: () => (edicao.suja = true) });
  const area = h("p", { class: "destaque-medida" });

  const form = h("form", { class: "ficha", oninput: () => { edicao.suja = true; atualizarArea(); } },
    h("div", { class: "cartao" },
      h("div", { class: "grade-campos" },
        h("div", { class: "campo campo-meia" }, h("label", { for: "ev-data" }, "Data e hora"),
          h("input", { id: "ev-data", name: "data", type: "datetime-local", value: paraInputDataHora(e.data), required: true })),
        h("div", { class: "campo campo-meia" }, h("label", { for: "ev-lesao" }, "Lesão"),
          h("select", { id: "ev-lesao", name: "lesao_id", value: e.lesao_id || "" },
            h("option", { value: "" }, lesoes.length ? "— geral / sem lesão específica —" : "— nenhuma lesão cadastrada —"),
            lesoesAtivas.map((l) => h("option", { value: l.id }, l.nome)))),
        h("div", { class: "campo campo-meia" }, h("label", { for: "ev-tipo" }, "Tipo de atendimento"),
          h("select", { id: "ev-tipo", name: "tipo", value: e.tipo || "" }, h("option", { value: "" }, "—"), TIPOS_ATENDIMENTO.map((t) => h("option", { value: t }, t)))),
        h("div", { class: "campo campo-meia" }, h("label", { for: "ev-local" }, "Local"),
          h("select", { id: "ev-local", name: "local_atendimento", value: e.local_atendimento || "" }, h("option", { value: "" }, "—"), LOCAIS_ATENDIMENTO.map((t) => h("option", { value: t }, t)))),
        h("div", { class: "campo" }, h("label", { for: "ev-desc" }, "Evolução *"),
          h("textarea", { id: "ev-desc", name: "descricao", rows: 7, required: true, value: e.descricao || "",
            placeholder: "Como o paciente chegou, aspecto da lesão, procedimento realizado, intercorrências, orientações…" })),
        h("div", { class: "campo" }, h("label", { for: "ev-conduta" }, "Conduta / cobertura utilizada"),
          h("textarea", { id: "ev-conduta", name: "conduta", rows: 2, value: e.conduta || "" })),
        h("div", { class: "campo campo-meia" }, h("label", { for: "ev-prox" }, "Próximo atendimento"),
          h("input", { id: "ev-prox", name: "proximo_atendimento", type: "date", value: e.proximo_atendimento || "" })),
      ),
    ),

    h("div", { class: "cartao" },
      h("h3", null, "Fotos"),
      fotosExistentes.length ? await gradeFotos(fotosExistentes, { aoApagar: () => window.dispatchEvent(new HashChangeEvent("hashchange")) }) : null,
      fotos.el,
      h("p", { class: "texto-suave pequeno" }, "As fotos são reduzidas automaticamente antes de enviar e ficam só no prontuário (não vão para a galeria do celular se você usar a câmera por aqui)."),
    ),

    h("details", { class: "secao", open: Object.keys(e.avaliacao || {}).length > 0 },
      h("summary", null, "Avaliação da lesão (medidas, tecido, exsudato…)"),
      area,
      camposEl(AVALIACAO_LESAO.filter((c) => c.id !== "lesao_local" && c.id !== "lesao_etiologia" && c.id !== "lesao_tempo"), e.avaliacao),
    ),

    h("details", { class: "secao", open: e.evolucao_materiais.length > 0 },
      h("summary", null, "Materiais usados"),
      materiais.length
        ? h("div", null, linhasMat,
            h("div", { class: "linha-total" },
              h("button", { type: "button", class: "botao botao-secundario botao-pequeno", onclick: () => { linhaMaterial(); edicao.suja = true; } }, "+ Material"),
              h("span", null, "Custo do atendimento: ", totalMat)))
        : h("p", { class: "texto-suave" }, "Cadastre os materiais e seus custos em ", h("a", { href: "#/materiais" }, "Materiais"), " para lançar aqui."),
    ),

    h("details", { class: "secao", open: !!pagamento },
      h("summary", null, "Pagamento recebido nesta sessão (opcional)"),
      h("div", { class: "grade-campos" },
        h("div", { class: "campo campo-meia" }, h("label", { for: "ev-pag" }, "Valor (R$)"),
          h("input", { id: "ev-pag", name: "pag_valor", type: "text", inputmode: "decimal", value: pagamento ? String(pagamento.valor).replace(".", ",") : "" })),
        h("div", { class: "campo campo-meia" }, h("label", { for: "ev-forma" }, "Forma"),
          h("select", { id: "ev-forma", name: "pag_forma", value: pagamento ? pagamento.forma : "Pix" }, FORMAS_PAGAMENTO.map((f) => h("option", { value: f }, f)))),
        h("p", { class: "texto-suave pequeno" }, "Para mensalidade de plano, registre na aba Financeiro do paciente."),
      ),
    ),

    h("div", { class: "barra-salvar" },
      h("a", { href: `#/paciente/${pacienteId}/evolucoes`, class: "botao botao-secundario" }, "Cancelar"),
      h("button", { type: "submit", class: "botao botao-primario" }, "Salvar evolução"),
    ),
  );

  function atualizarArea() {
    const av = lerCampos(form, AVALIACAO_LESAO);
    const a = areaLesao(av);
    area.textContent = a != null ? "Área estimada: " + numeroBR(a, 2) + " cm²" : "";
  }
  atualizarArea();

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = form.elements;
    if (!f.descricao.value.trim()) { avisar("Escreva a evolução.", "erro"); return; }
    const botao = form.querySelector("[type=submit]");
    botao.disabled = true;
    botao.textContent = "Salvando…";
    const registro = {
      paciente_id: pacienteId,
      data: new Date(f.data.value).toISOString(),
      lesao_id: f.lesao_id.value || null,
      tipo: f.tipo.value || null,
      local_atendimento: f.local_atendimento.value || null,
      descricao: f.descricao.value.trim(),
      conduta: f.conduta.value.trim() || null,
      proximo_atendimento: f.proximo_atendimento.value || null,
      avaliacao: lerCampos(form, AVALIACAO_LESAO),
    };
    let salvo;
    try {
      // 1) evolução
      if (e.id) salvo = await q(sb.from("evolucoes").update(registro).eq("id", e.id).select().single());
      else salvo = await q(sb.from("evolucoes").insert(registro).select().single());
      e.id = salvo.id;

      // 2) materiais (substitui a lista)
      const mats = lerMateriais();
      await q(sb.from("evolucao_materiais").delete().eq("evolucao_id", salvo.id));
      if (mats.length) await q(sb.from("evolucao_materiais").insert(mats.map((m) => ({ ...m, evolucao_id: salvo.id }))));

      // 3) pagamento da sessão
      const valor = numeroOuNulo(f.pag_valor.value);
      if (pagamento && !valor) await q(sb.from("pagamentos").delete().eq("id", pagamento.id));
      else if (valor) {
        const pag = { paciente_id: pacienteId, evolucao_id: salvo.id, valor, forma: f.pag_forma.value, data: dataLocalISO(registro.data), descricao: "Sessão " + (registro.tipo || "") };
        if (pagamento) await q(sb.from("pagamentos").update(pag).eq("id", pagamento.id));
        else await q(sb.from("pagamentos").insert(pag));
      }
    } catch (erro) {
      avisar(mensagemErro(erro), "erro");
      botao.disabled = false;
      botao.textContent = "Salvar evolução";
      return;
    }

    // 4) fotos (uma por vez; se alguma falhar, a evolução já está salva)
    const lista = fotos.arquivos();
    const falhas = [];
    for (let i = 0; i < lista.length; i++) {
      botao.textContent = `Enviando foto ${i + 1} de ${lista.length}…`;
      try {
        await enviarArquivo(lista[i], { paciente_id: pacienteId, evolucao_id: salvo.id, lesao_id: registro.lesao_id, categoria: "lesao", data: dataLocalISO(registro.data) });
      } catch (erro) {
        falhas.push(lista[i]);
        console.error(erro);
      }
    }
    edicao.suja = false;
    if (falhas.length) {
      avisar(`Evolução salva, mas ${falhas.length} foto(s) não foram enviadas. Abra a evolução e tente de novo.`, "erro");
      location.hash = "#/evolucao/" + salvo.id;
      return;
    }
    avisar("Evolução salva.");
    location.hash = `#/paciente/${pacienteId}/evolucoes`;
  });

  tela.append(
    h("div", { class: "cabecalho-tela" },
      h("div", null,
        h("a", { href: `#/paciente/${pacienteId}/evolucoes`, class: "voltar" }, "‹ " + p.nome),
        h("h1", null, e.id ? "Editar evolução" : "Nova evolução"),
        e.id ? h("p", { class: "texto-suave" }, "A versão anterior fica guardada no histórico.") : null,
      ),
    ),
    form,
  );
}
