// Página do paciente: resumo, evoluções, fotos, arquivos e financeiro.
import { sb, q, nomeDe, enviarArquivo } from "../banco.js";
import { h, dataBR, dataHoraBR, idade, moeda, numeroBR, avisar, mensagemErro, janela, hojeISO } from "../util.js";
import { AVALIACAO_LESAO, SITUACOES_LESAO } from "../campos.js";
import { valorTexto, areaLesao } from "../formulario.js";
import { gradeFotos, painelFinanceiro, escolherFotos, campoTxt, campoSel, campoData } from "./componentes.js";

const ABAS = [
  ["resumo", "Resumo"],
  ["evolucoes", "Evoluções"],
  ["fotos", "Fotos"],
  ["arquivos", "Exames e documentos"],
  ["financeiro", "Financeiro"],
];

export async function telaPaciente(tela, id, aba = "resumo") {
  const p = await q(sb.from("pacientes").select("*").eq("id", id).single());
  const anos = idade(p.data_nascimento);

  tela.append(
    h("div", { class: "cabecalho-tela cabecalho-paciente" },
      h("div", null,
        h("a", { href: "#/pacientes", class: "voltar" }, "‹ Pacientes"),
        h("h1", null, p.nome),
        h("p", { class: "texto-suave" },
          [anos != null ? anos + " anos" : null, p.sexo, p.telefone, p.situacao !== "em tratamento" ? p.situacao.toUpperCase() : null]
            .filter(Boolean).join(" · ")),
      ),
      h("a", { href: `#/paciente/${id}/evolucao/nova`, class: "botao botao-primario" }, "+ Nova evolução"),
    ),
    h("nav", { class: "abas", "aria-label": "Seções do paciente" },
      ABAS.map(([k, t]) => h("a", { href: `#/paciente/${id}/${k}`, class: "aba" + (k === aba ? " ativa" : "") }, t)),
    ),
  );

  const corpo = h("div", { class: "aba-corpo" });
  tela.append(corpo);
  if (aba === "evolucoes") await abaEvolucoes(corpo, p);
  else if (aba === "fotos") await abaFotos(corpo, p);
  else if (aba === "arquivos") await abaArquivos(corpo, p);
  else if (aba === "financeiro") corpo.append(await painelFinanceiro(id));
  else await abaResumo(corpo, p);
}

// ---------- Resumo ----------
async function abaResumo(corpo, p) {
  const [admissoes, lesoes, ultima] = await Promise.all([
    q(sb.from("admissoes").select("id, data, dados").eq("paciente_id", p.id).order("data", { ascending: false })),
    q(sb.from("lesoes").select("*").eq("paciente_id", p.id).order("criado_em")),
    q(sb.from("evolucoes").select("data, tipo, descricao").eq("paciente_id", p.id).order("data", { ascending: false }).limit(1)),
  ]);
  const adm = admissoes[0];
  const d = (adm && adm.dados) || {};

  // Alertas clínicos tirados da admissão
  const alertas = [];
  if (d.alergias === "Sim") alertas.push("Alergia: " + (d.alergias_quais || "sim (ver admissão)"));
  (d.medicacoes_atencao || []).forEach((m) => alertas.push(m));
  (d.comorbidades || []).forEach((c) => alertas.push(c));

  corpo.append(
    alertas.length ? h("div", { class: "alertas" }, alertas.map((a) => h("span", { class: "alerta" }, a))) : null,

    h("div", { class: "cartao" },
      h("div", { class: "subcabecalho" },
        h("h3", null, "Admissão"),
        adm
          ? h("a", { class: "botao botao-secundario botao-pequeno", href: `#/paciente/${p.id}/admissao/${adm.id}` }, "Abrir ficha")
          : h("a", { class: "botao botao-primario botao-pequeno", href: `#/paciente/${p.id}/admissao` }, "Preencher admissão"),
      ),
      adm
        ? h("div", null,
            h("p", null, "Admitido em ", h("strong", null, dataBR(adm.data)),
              d.lesao_etiologia ? " · " + d.lesao_etiologia : "", d.lesao_local ? " · " + d.lesao_local : ""),
            d.queixa_principal ? h("p", { class: "texto-suave" }, d.queixa_principal) : null,
            admissoes.length > 1 ? h("p", { class: "texto-suave" }, "Admissões anteriores: ",
              admissoes.slice(1).map((a, i) => [i ? ", " : "", h("a", { href: `#/paciente/${p.id}/admissao/${a.id}` }, dataBR(a.data))])) : null,
            h("a", { href: `#/paciente/${p.id}/admissao`, class: "botao-link" }, "+ Nova admissão (readmissão)"),
          )
        : h("p", { class: "texto-suave" }, "Ainda não há ficha de admissão."),
    ),

    h("div", { class: "cartao" },
      h("div", { class: "subcabecalho" },
        h("h3", null, "Lesões"),
        h("button", { type: "button", class: "botao botao-secundario botao-pequeno", onclick: () => editarLesao(p.id) }, "+ Lesão"),
      ),
      lesoes.length
        ? h("ul", { class: "lista-simples" }, lesoes.map((l) =>
            h("li", null,
              h("div", null,
                h("strong", null, l.nome),
                h("small", null, [l.etiologia, l.inicio ? "desde " + dataBR(l.inicio) : null, l.situacao].filter(Boolean).join(" · ")),
              ),
              h("button", { type: "button", class: "botao-link", onclick: () => editarLesao(p.id, l) }, "Editar"),
            )))
        : h("p", { class: "texto-suave" }, "Cadastre cada ferida (ex.: “Pé D – plantar”). Assim as fotos e medidas de cada uma ficam numa linha do tempo própria."),
    ),

    h("div", { class: "cartao" },
      h("div", { class: "subcabecalho" }, h("h3", null, "Último atendimento")),
      ultima.length
        ? h("div", null,
            h("p", null, h("strong", null, dataHoraBR(ultima[0].data)), ultima[0].tipo ? " · " + ultima[0].tipo : ""),
            h("p", { class: "texto-corrido" }, ultima[0].descricao),
            h("a", { href: `#/paciente/${p.id}/evolucoes`, class: "botao-link" }, "Ver todas as evoluções"))
        : h("p", { class: "texto-suave" }, "Nenhuma evolução registrada."),
    ),

    h("div", { class: "cartao" },
      h("div", { class: "subcabecalho" },
        h("h3", null, "Dados do paciente"),
        h("a", { class: "botao botao-secundario botao-pequeno", href: `#/paciente/${p.id}/editar` }, "Editar"),
      ),
      h("dl", { class: "dados" },
        par("Nascimento", dataBR(p.data_nascimento)),
        par("CPF", p.cpf),
        par("Telefone", p.telefone),
        par("Endereço", p.endereco),
        par("Responsável", [p.responsavel, p.responsavel_telefone].filter(Boolean).join(" · ")),
        par("Observações", p.observacoes),
      ),
    ),

    h("div", { class: "acoes-rodape" },
      h("a", { class: "botao botao-secundario", href: `#/paciente/${p.id}/imprimir` }, "🖨 Imprimir / PDF do prontuário"),
    ),
  );
}

function par(rotulo, valor) {
  if (!valor) return null;
  return [h("dt", null, rotulo), h("dd", null, valor)];
}

function editarLesao(pacienteId, l = { situacao: "em tratamento" }) {
  const etiologias = AVALIACAO_LESAO.find((c) => c.id === "lesao_etiologia").opcoes;
  const f = h("form", { class: "grade-campos" },
    campoTxt("nome", "Nome / local *", l.nome, "", null, "Ex.: Pé D – região plantar"),
    campoSel("etiologia", "Etiologia", [["", "—"], ...etiologias.map((e) => [e, e])], l.etiologia || "", "meia"),
    campoData("inicio", "Desde quando", l.inicio, "meia"),
    campoSel("situacao", "Situação", SITUACOES_LESAO.map((s) => [s, s]), l.situacao, "meia"),
    campoTxt("observacoes", "Observações", l.observacoes),
    h("div", { class: "acoes-form" }, h("button", { type: "submit", class: "botao botao-primario" }, "Salvar")),
  );
  const { fechar } = janela(l.id ? "Editar lesão" : "Nova lesão", f);
  f.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const d = {
      paciente_id: pacienteId,
      nome: f.elements.nome.value.trim(),
      etiologia: f.elements.etiologia.value || null,
      inicio: f.elements.inicio.value || null,
      situacao: f.elements.situacao.value,
      observacoes: f.elements.observacoes.value.trim() || null,
    };
    if (!d.nome) { avisar("Dê um nome para a lesão.", "erro"); return; }
    try {
      if (l.id) await q(sb.from("lesoes").update(d).eq("id", l.id));
      else await q(sb.from("lesoes").insert(d));
      fechar();
      avisar("Lesão salva.");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } catch (e) { avisar(mensagemErro(e), "erro"); }
  });
}

// ---------- Evoluções ----------
async function abaEvolucoes(corpo, p) {
  const [evolucoes, lesoes, fotos] = await Promise.all([
    q(sb.from("evolucoes").select("*, evolucao_materiais(quantidade, custo_unitario, materiais(nome, unidade))")
      .eq("paciente_id", p.id).order("data", { ascending: false })),
    q(sb.from("lesoes").select("id, nome").eq("paciente_id", p.id)),
    q(sb.from("arquivos").select("*").eq("paciente_id", p.id).not("evolucao_id", "is", null).order("criado_em")),
  ]);
  if (!evolucoes.length) {
    corpo.append(h("div", { class: "cartao vazio" }, "Nenhuma evolução ainda. ",
      h("a", { href: `#/paciente/${p.id}/evolucao/nova` }, "Registrar a primeira")));
    return;
  }
  const nomeLesao = Object.fromEntries(lesoes.map((l) => [l.id, l.nome]));
  const lista = h("ol", { class: "linha-tempo" });
  corpo.append(lista);
  for (const e of evolucoes) {
    const minhasFotos = fotos.filter((f) => f.evolucao_id === e.id);
    const custo = e.evolucao_materiais.reduce((s, m) => s + m.quantidade * m.custo_unitario, 0);
    const area = areaLesao(e.avaliacao);
    const av = AVALIACAO_LESAO.filter((c) => c.id !== "lesao_local" && valorTexto(c, e.avaliacao[c.id]))
      .map((c) => h("span", null, h("b", null, c.rotulo + ": "), valorTexto(c, e.avaliacao[c.id])));
    lista.append(
      h("li", { class: "cartao evolucao" },
        h("div", { class: "subcabecalho" },
          h("div", null,
            h("strong", null, dataHoraBR(e.data)),
            h("small", { class: "texto-suave" }, " " + [e.tipo, nomeLesao[e.lesao_id], e.local_atendimento].filter(Boolean).join(" · ")),
          ),
          h("a", { href: "#/evolucao/" + e.id, class: "botao-link" }, "Editar"),
        ),
        h("p", { class: "texto-corrido" }, e.descricao),
        area != null ? h("p", { class: "destaque-medida" }, "Área estimada: " + numeroBR(area, 2) + " cm²") : null,
        av.length ? h("details", { class: "avaliacao-resumo" }, h("summary", null, "Avaliação da lesão"), h("div", null, av)) : null,
        e.conduta ? h("p", null, h("b", null, "Conduta: "), e.conduta) : null,
        e.evolucao_materiais.length
          ? h("p", { class: "texto-suave" }, "Materiais: ",
              e.evolucao_materiais.map((m) => `${numeroBR(m.quantidade, 2)} ${m.materiais ? m.materiais.unidade + " " + m.materiais.nome : ""}`).join(", "),
              " · custo " + moeda(custo))
          : null,
        e.proximo_atendimento ? h("p", { class: "texto-suave" }, "Próximo atendimento: " + dataBR(e.proximo_atendimento)) : null,
        minhasFotos.length ? await gradeFotos(minhasFotos) : null,
        h("p", { class: "assinatura" }, nomeDe(e.criado_por),
          e.atualizado_em && Math.abs(new Date(e.atualizado_em) - new Date(e.criado_em)) > 60000
            ? " · editado em " + dataHoraBR(e.atualizado_em) + (nomeDe(e.atualizado_por) ? " por " + nomeDe(e.atualizado_por) : "")
            : ""),
      ),
    );
  }
}

// ---------- Fotos (linha do tempo por lesão) ----------
async function abaFotos(corpo, p) {
  const [fotos, lesoes, evolucoes] = await Promise.all([
    q(sb.from("arquivos").select("*").eq("paciente_id", p.id).eq("categoria", "lesao").order("data").order("criado_em")),
    q(sb.from("lesoes").select("*").eq("paciente_id", p.id).order("criado_em")),
    q(sb.from("evolucoes").select("data, lesao_id, avaliacao").eq("paciente_id", p.id).order("data")),
  ]);
  if (!fotos.length) {
    corpo.append(h("div", { class: "cartao vazio" }, "Nenhuma foto ainda. As fotos tiradas nas evoluções aparecem aqui, em ordem, separadas por lesão."));
    return;
  }
  const grupos = lesoes.map((l) => ({ titulo: l.nome, sub: [l.etiologia, l.situacao].filter(Boolean).join(" · "), id: l.id }));
  grupos.push({ titulo: "Sem lesão definida", id: null });
  for (const g of grupos) {
    const doGrupo = fotos.filter((f) => (f.lesao_id || null) === g.id);
    if (!doGrupo.length) continue;
    const medidas = evolucoes.filter((e) => (e.lesao_id || null) === g.id && areaLesao(e.avaliacao) != null);
    corpo.append(
      h("section", { class: "cartao" },
        h("div", { class: "subcabecalho" },
          h("div", null, h("h3", null, g.titulo), g.sub ? h("small", { class: "texto-suave" }, g.sub) : null),
          h("small", { class: "texto-suave" }, doGrupo.length + " foto" + (doGrupo.length > 1 ? "s" : "")),
        ),
        await gradeFotos(doGrupo, { aoApagar: () => window.dispatchEvent(new HashChangeEvent("hashchange")) }),
        medidas.length ? tabelaMedidas(medidas) : null,
      ),
    );
  }
}

function tabelaMedidas(evs) {
  const primeira = areaLesao(evs[0].avaliacao);
  return h("details", { class: "medidas" },
    h("summary", null, "Medidas ao longo do tempo"),
    h("table", { class: "tabela" },
      h("thead", null, h("tr", null, h("th", null, "Data"), h("th", null, "C × L (cm)"), h("th", null, "Área (cm²)"), h("th", null, "Variação"))),
      h("tbody", null, evs.map((e) => {
        const a = areaLesao(e.avaliacao);
        const varia = primeira ? ((a - primeira) / primeira) * 100 : null;
        return h("tr", null,
          h("td", null, dataBR(e.data)),
          h("td", null, numeroBR(e.avaliacao.lesao_comprimento, 2) + " × " + numeroBR(e.avaliacao.lesao_largura, 2)),
          h("td", null, numeroBR(a, 2)),
          h("td", null, varia == null ? "" : (varia > 0 ? "+" : "") + numeroBR(varia, 0) + "%"),
        );
      })),
    ),
  );
}

// ---------- Exames e documentos ----------
async function abaArquivos(corpo, p) {
  const arquivos = await q(sb.from("arquivos").select("*").eq("paciente_id", p.id).neq("categoria", "lesao").order("data", { ascending: false }));
  const escolha = escolherFotos({ texto: "Escolher arquivos (foto ou PDF)", aceitar: "image/*,application/pdf" });
  const form = h("form", { class: "cartao" },
    h("h3", null, "Enviar exame ou documento"),
    h("div", { class: "grade-campos" },
      campoSel("categoria", "Tipo", [["exame", "Exame"], ["documento", "Documento (TCLE, receita, laudo…)"]], "exame", "meia"),
      campoData("data", "Data do documento", hojeISO(), "meia"),
      campoTxt("legenda", "Descrição", "", "", null, "Ex.: hemograma, TCLE assinado"),
    ),
    escolha.el,
    h("div", { class: "acoes-form" }, h("button", { type: "submit", class: "botao botao-primario" }, "Enviar")),
  );
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const lista = escolha.arquivos();
    if (!lista.length) { avisar("Escolha pelo menos um arquivo.", "erro"); return; }
    const botao = form.querySelector("[type=submit]");
    botao.disabled = true;
    try {
      for (let i = 0; i < lista.length; i++) {
        botao.textContent = `Enviando ${i + 1} de ${lista.length}…`;
        await enviarArquivo(lista[i], {
          paciente_id: p.id, categoria: form.elements.categoria.value,
          data: form.elements.data.value || hojeISO(), legenda: form.elements.legenda.value.trim() || null,
        });
      }
      avisar("Arquivos enviados.");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } catch (e) {
      avisar(mensagemErro(e), "erro");
      botao.disabled = false;
      botao.textContent = "Enviar";
    }
  });
  corpo.append(form);
  if (arquivos.length) {
    corpo.append(h("div", { class: "cartao" },
      h("h3", null, "Arquivos do paciente"),
      await gradeFotos(arquivos, {
        rotulo: (a) => dataBR(a.data) + (a.legenda ? " · " + a.legenda : ""),
        aoApagar: () => window.dispatchEvent(new HashChangeEvent("hashchange")),
      }),
    ));
  }
}
