// Sessão (evolução): procedimento, fotos, avaliação da lesão, materiais usados e pagamento.
import { sb, q, enviarArquivo, sessao } from "../banco.js";
import { h, moeda, numeroOuNulo, paraInputDataHora, dataLocalISO, dataBR, avisar, mensagemErro, edicao, confirmar } from "../util.js";
import { AVALIACAO, OMITIR_NA_EVOLUCAO, TIPOS_ATENDIMENTO, LOCAIS_ATENDIMENTO, FORMAS_PAGAMENTO, camposDe, ASSINATURA } from "../campos.js";
import { folhaEl, lerCampos, calcularPush, textoPush } from "../formulario.js";
import { escolherFotos, gradeFotos, abas, quadro, cabecalho } from "./componentes.js";
import { blocoPeDiabetico, CAMPOS_PE_DIABETICO } from "../pediabetico.js";
import { sincronizarPacienteSePuder } from "../pasta.js";

const CAMPOS_AV = () => [...camposDe(AVALIACAO).filter((c) => !OMITIR_NA_EVOLUCAO.includes(c.id)), ...CAMPOS_PE_DIABETICO()];

export async function telaEvolucao(tela, pacienteIdNovo, evolucaoId) {
  let e = { data: new Date().toISOString(), avaliacao: {}, evolucao_materiais: [], tipo: "Curativo", local_atendimento: "Clinical Center" };
  if (evolucaoId) e = await q(sb.from("evolucoes").select("*, evolucao_materiais(*)").eq("id", evolucaoId).single());
  const pacienteId = pacienteIdNovo || e.paciente_id;

  const [p, lesoes, materiais, fotosExistentes, anterior, pagamentoExistente, admissoes] = await Promise.all([
    q(sb.from("pacientes").select("id, nome").eq("id", pacienteId).single()),
    q(sb.from("lesoes").select("id, nome, situacao, etiologia").eq("paciente_id", pacienteId).order("criado_em")),
    q(sb.from("materiais").select("*").order("nome")),
    evolucaoId ? q(sb.from("arquivos").select("*").eq("evolucao_id", evolucaoId).order("criado_em")) : [],
    evolucaoId ? [] : q(sb.from("evolucoes").select("lesao_id, tipo, local_atendimento, data, avaliacao").eq("paciente_id", pacienteId).order("data", { ascending: false }).limit(60)),
    evolucaoId ? q(sb.from("pagamentos").select("*").eq("evolucao_id", evolucaoId).limit(1)) : [],
    q(sb.from("admissoes").select("id, data, tipo, alta_em, criado_em, dados").eq("paciente_id", pacienteId).order("data", { ascending: false }).order("criado_em", { ascending: false })),
  ]);
  // Sessão nova começa com a lesão, o tipo e o local da última
  if (!evolucaoId && anterior.length) {
    e.lesao_id = anterior[0].lesao_id;
    e.tipo = anterior[0].tipo || e.tipo;
    e.local_atendimento = anterior[0].local_atendimento || e.local_atendimento;
  }
  const lesoesAtivas = lesoes.filter((l) => l.situacao === "em tratamento" || l.id === e.lesao_id);
  if (!evolucaoId && !e.lesao_id && lesoesAtivas.length === 1) e.lesao_id = lesoesAtivas[0].id;
  const pagamento = pagamentoExistente[0] || null;

  // ----- Materiais usados -----
  const linhasMat = h("div", { class: "linhas-materiais" });
  const totalMat = h("strong");
  function linhaMaterial(m = {}) {
    const ativos = materiais.filter((x) => x.ativo || x.id === m.material_id);
    const sel = h("select", { name: "mat_id", class: "caixa-entrada", value: m.material_id || "" },
      h("option", { value: "" }, "Escolha o material"),
      ativos.map((x) => h("option", { value: x.id }, `${x.nome} (${moeda(x.custo_unitario)}/${x.unidade})`)));
    const qtd = h("input", { name: "mat_qtd", type: "text", class: "caixa-entrada", inputmode: "decimal", value: m.quantidade != null ? String(m.quantidade).replace(".", ",") : "1", "aria-label": "Quantidade" });
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

  const fotos = escolherFotos({ texto: "Tirar ou escolher fotos da lesão", aoMudar: () => (edicao.suja = true) });
  const pushEl = h("p", { class: "resumo-push" });

  const painelCampo = (rotulo, entrada, largura = "meia") => h("label", { class: "painel-campo " + largura }, h("span", { class: "rotulo" }, rotulo), entrada);
  const opcoes = (lista, valor) => [h("option", { value: "" }, "—"), ...lista.map((t) => h("option", { value: t }, t)),
    valor && !lista.includes(valor) ? h("option", { value: valor }, valor) : null];

  // ----- Aba 1: registro da sessão -----
  const abaSessao = h("div", { class: "aba-corpo" },
    h("div", { class: "painel" },
      h("div", { class: "painel-grade" },
        h("div", { class: "painel-campo" }, h("span", { class: "rotulo" }, "Paciente"), h("span", { class: "valor" }, p.nome)),
        painelCampo("Data", h("input", { name: "data", type: "datetime-local", value: paraInputDataHora(e.data), required: true })),
        painelCampo("Lesão", h("select", { name: "lesao_id", value: e.lesao_id || "" },
          h("option", { value: "" }, lesoes.length ? "Geral" : "Nenhuma cadastrada"),
          lesoesAtivas.map((l) => h("option", { value: l.id }, l.nome)))),
        painelCampo("Tipo", h("select", { name: "tipo", value: e.tipo || "" }, opcoes(TIPOS_ATENDIMENTO, e.tipo))),
        painelCampo("Local", h("select", { name: "local_atendimento", value: e.local_atendimento || "" }, opcoes(LOCAIS_ATENDIMENTO, e.local_atendimento))),
      ),
    ),
    quadro("Procedimento / evolução",
      h("textarea", { name: "descricao", class: "caixa-texto", rows: 7, required: true, value: e.descricao || "",
        placeholder: "Como o paciente chegou, aspecto da lesão, procedimento realizado, intercorrências, orientações…" })),
    h("div", { class: "dois-quadros" },
      quadro("Conduta / cobertura", h("textarea", { name: "conduta", class: "caixa-texto", rows: 3, value: e.conduta || "" })),
      quadro("Próximo atendimento", h("input", { name: "proximo_atendimento", type: "date", class: "caixa-entrada", value: e.proximo_atendimento || "" }))),
    quadro("Fotos",
      fotosExistentes.length ? await gradeFotos(fotosExistentes, { aoApagar: () => window.dispatchEvent(new HashChangeEvent("hashchange")) }) : null,
      fotos.el,
      h("p", { class: "texto-suave pequeno" }, "As fotos são reduzidas antes de enviar e ficam só no prontuário.")),
  );

  // ----- Aba 2: avaliação da lesão (mesma folha da admissão) + pé diabético -----
  const etiologiaLesao = (lesoes.find((l) => l.id === e.lesao_id) || {}).etiologia;
  const abaAvaliacao = h("div", { class: "aba-corpo", hidden: true });
  const conteudoAvaliacao = h("div");
  let blocoPe;
  function montarAvaliacao(valores, etiologia) {
    blocoPe = blocoPeDiabetico(valores, () => lerCampos(conteudoAvaliacao, camposDe(AVALIACAO)), { etiologia });
    conteudoAvaliacao.replaceChildren(folhaEl(AVALIACAO, valores, { omitir: OMITIR_NA_EVOLUCAO, semTitulo: true }), pushEl, blocoPe.el);
  }
  montarAvaliacao(e.avaliacao || {}, etiologiaLesao);

  // ----- Copiar a avaliação da última sessão (só em sessão nova) -----
  // Procura a avaliação mais recente da lesão escolhida; se não houver sessão, usa a da admissão.
  const ehDaAvaliacao = (k) => (k.startsWith("lesao_") || k.startsWith("pd_")) && k !== "lesao_id" && !OMITIR_NA_EVOLUCAO.includes(k);
  const soAvaliacao = (d) => Object.fromEntries(Object.entries(d || {}).filter(([k]) => ehDaAvaliacao(k)));
  function avaliacaoAnterior(lesaoId) {
    const daLesao = anterior.find((x) => (x.lesao_id || null) === (lesaoId || null) && Object.keys(soAvaliacao(x.avaliacao)).length);
    if (daLesao) return { valores: soAvaliacao(daLesao.avaliacao), origem: "sessão de " + dataBR(daLesao.data) };
    const adm = admissoes.find((a) => a.dados && (a.dados.lesao_id || null) === (lesaoId || null) && Object.keys(soAvaliacao(a.dados)).length)
      || (!lesaoId && admissoes.find((a) => a.dados && Object.keys(soAvaliacao(a.dados)).length));
    if (adm) return { valores: soAvaliacao(adm.dados), origem: "admissão de " + dataBR(adm.data) };
    const qualquer = !lesaoId && anterior.find((x) => Object.keys(soAvaliacao(x.avaliacao)).length);
    return qualquer ? { valores: soAvaliacao(qualquer.avaliacao), origem: "sessão de " + dataBR(qualquer.data) } : null;
  }
  const botaoCopiar = h("button", { type: "button", class: "botao botao-secundario" });
  const infoCopiar = h("p", { class: "texto-suave pequeno", style: { margin: "6px 0 0" } });
  function rotularCopiar() {
    const fonte = avaliacaoAnterior(form.elements.lesao_id.value);
    botaoCopiar.hidden = !fonte;
    botaoCopiar.textContent = fonte ? "Copiar avaliação da " + fonte.origem : "";
    infoCopiar.textContent = fonte ? "Traz medidas, tecido, exsudato, bordas, mapa e pé diabético da consulta anterior para você só ajustar o que mudou." : "";
  }
  botaoCopiar.addEventListener("click", async () => {
    const fonte = avaliacaoAnterior(form.elements.lesao_id.value);
    if (!fonte) return;
    const atual = lerCampos(conteudoAvaliacao, CAMPOS_AV());
    if (Object.keys(atual).length && !(await confirmar("Substituir o que já foi preenchido nesta avaliação pela " + fonte.origem + "?", { sim: "Substituir" }))) return;
    const etiologia = (lesoes.find((l) => l.id === form.elements.lesao_id.value) || {}).etiologia;
    montarAvaliacao(fonte.valores, etiologia);
    edicao.suja = true;
    atualizarPush();
    avisar("Avaliação copiada da " + fonte.origem + ". Ajuste o que mudou.");
  });
  abaAvaliacao.append(!evolucaoId ? h("div", { class: "copiar-avaliacao" }, botaoCopiar, infoCopiar) : null, conteudoAvaliacao);

  // ----- Aba 3: materiais e pagamento -----
  const abaMateriais = h("div", { class: "aba-corpo", hidden: true },
    quadro("Materiais usados",
      materiais.length
        ? h("div", null, linhasMat,
            h("div", { class: "linha-total" },
              h("button", { type: "button", class: "botao botao-secundario botao-pequeno", onclick: () => { linhaMaterial(); edicao.suja = true; } }, "+ Material"),
              h("span", null, "Custo da sessão: ", totalMat)))
        : h("p", { class: "texto-suave" }, "Cadastre os materiais e seus custos em ", h("a", { href: "#/materiais" }, "Materiais"), " para lançar aqui.")),
    quadro("Pagamento recebido nesta sessão",
      h("div", { class: "grade-medidas" },
        h("div", { class: "medida" }, h("label", { for: "ev-pag" }, "Valor (R$):"),
          h("input", { id: "ev-pag", name: "pag_valor", type: "text", class: "caixa-entrada", inputmode: "decimal", value: pagamento ? String(pagamento.valor).replace(".", ",") : "" })),
        h("div", { class: "medida" }, h("label", { for: "ev-forma" }, "Forma:"),
          h("select", { id: "ev-forma", name: "pag_forma", class: "caixa-entrada", value: pagamento ? pagamento.forma : "Pix" }, FORMAS_PAGAMENTO.map((f) => h("option", { value: f }, f))))),
      h("p", { class: "texto-suave pequeno" }, "Opcional. Mensalidade de plano se registra na aba Financeiro do paciente.")),
  );

  const corpos = { sessao: abaSessao, avaliacao: abaAvaliacao, materiais: abaMateriais };
  const barraAbas = h("div");
  function mostrarAba(k) {
    Object.entries(corpos).forEach(([c, el]) => (el.hidden = c !== k));
    barraAbas.replaceChildren(abas([["sessao", "Sessão"], ["avaliacao", "Avaliação da lesão"], ["materiais", "Materiais e pagamento"]], k, mostrarAba));
  }

  const form = h("form", { oninput: (ev) => { edicao.suja = true; atualizarPush(); if (!blocoPe.el.contains(ev.target)) blocoPe.atualizar(); },
    onchange: (ev) => {
      if (ev.target.name === "lesao_id") {
        if (!evolucaoId) rotularCopiar();
        const l = lesoes.find((x) => x.id === ev.target.value);
        if (l && l.etiologia === "Pé diabético") blocoPe.abrir();
      }
    } },
    barraAbas, abaSessao, abaAvaliacao, abaMateriais,
    h("p", { class: "assinatura-ficha" }, h("span", null, "Assinatura: ", h("b", null, ASSINATURA))),
    h("div", { class: "barra-salvar" },
      h("a", { href: `#/paciente/${pacienteId}/sessoes`, class: "botao botao-secundario" }, "Cancelar"),
      h("button", { type: "submit", class: "botao botao-primario" }, "Salvar sessão"),
    ),
  );
  function atualizarPush() {
    const pu = calcularPush(lerCampos(conteudoAvaliacao, CAMPOS_AV()));
    pushEl.textContent = pu ? textoPush(pu) : "Preencha comprimento, largura, exsudato e tecido para calcular o PUSH.";
    blocoPe.atualizar();
  }
  atualizarPush();
  mostrarAba("sessao");
  if (!evolucaoId) rotularCopiar();

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = form.elements;
    if (!f.descricao.value.trim()) { mostrarAba("sessao"); avisar("Escreva o procedimento / evolução.", "erro"); return; }
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
      avaliacao: lerCampos(conteudoAvaliacao, CAMPOS_AV()),
    };
    // Liga a sessão ao episódio (admissão ou readmissão) em que ela aconteceu
    const diaSessao = dataLocalISO(registro.data);
    // Sessão já ligada continua no mesmo episódio; nova vai para o episódio aberto (sem alta)
    const episodio = (e.admissao_id && admissoes.find((a) => a.id === e.admissao_id))
      || admissoes.find((a) => !a.alta_em && a.data <= diaSessao)
      || admissoes.find((a) => a.data <= diaSessao)
      || admissoes[admissoes.length - 1];
    registro.admissao_id = episodio ? episodio.id : null;
    let salvo;
    try {
      // 1) sessão
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
      botao.textContent = "Salvar sessão";
      return;
    }
    // 4) fotos (uma por vez; se alguma falhar, a sessão já está salva)
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
    sincronizarPacienteSePuder(pacienteId);
    if (falhas.length) {
      avisar(`Sessão salva, mas ${falhas.length} foto(s) não foram enviadas. Abra a sessão e tente de novo.`, "erro");
      location.hash = "#/evolucao/" + salvo.id;
      return;
    }
    avisar("Sessão salva.");
    location.hash = `#/paciente/${pacienteId}/sessoes`;
  });

  tela.append(
    cabecalho({
      voltar: [`#/paciente/${pacienteId}/sessoes`, p.nome],
      subtitulo: e.id ? "Sessão de " + dataBR(e.data) + " · a versão anterior fica no histórico" : null,
      titulo: e.id ? ["EDITAR", "SESSÃO"] : ["NOVA", "SESSÃO"],
    }),
    form,
  );
}
