// Ficha de admissão (anamnese, exames, avaliação inicial, plano de cuidados e valores).
import { sb, q, nomeDe } from "../banco.js";
import { h, hojeISO, dataHoraBR, avisar, mensagemErro, edicao } from "../util.js";
import { ADMISSAO, todosCamposAdmissao } from "../campos.js";
import { secoesEl, lerCampos, atualizarContagem } from "../formulario.js";
import { painelFinanceiro } from "./componentes.js";

export async function telaAdmissao(tela, pacienteId, admissaoId) {
  const [p, lesoes] = await Promise.all([
    q(sb.from("pacientes").select("id, nome").eq("id", pacienteId).single()),
    q(sb.from("lesoes").select("id").eq("paciente_id", pacienteId)),
  ]);
  let adm = { data: hojeISO(), dados: {} };
  if (admissaoId) adm = await q(sb.from("admissoes").select("*").eq("id", admissaoId).single());

  const secoes = secoesEl(ADMISSAO, adm.dados);
  const criarLesao = !admissaoId && !lesoes.length
    ? h("label", { class: "chip chip-largo" }, h("input", { type: "checkbox", name: "criar_lesao", checked: true }),
        h("span", null, "Cadastrar a lesão avaliada na lista de lesões do paciente (para a linha do tempo das fotos)"))
    : null;

  const form = h("form", { class: "ficha", oninput: () => { edicao.suja = true; atualizarContagem(form, ADMISSAO); } },
    h("div", { class: "cartao" },
      h("div", { class: "grade-campos" },
        h("div", { class: "campo campo-meia" }, h("label", { for: "adm-data" }, "Data da admissão"),
          h("input", { id: "adm-data", name: "data_admissao", type: "date", value: adm.data, required: true })),
      ),
      h("div", { class: "botoes-secoes" },
        h("button", { type: "button", class: "botao-link", onclick: () => form.querySelectorAll("details.secao").forEach((d) => (d.open = true)) }, "Abrir todas as seções"),
        h("button", { type: "button", class: "botao-link", onclick: () => form.querySelectorAll("details.secao").forEach((d) => (d.open = false)) }, "Fechar todas"),
      ),
    ),
    secoes,
    criarLesao,
    h("div", { class: "barra-salvar" },
      h("a", { href: "#/paciente/" + pacienteId, class: "botao botao-secundario" }, "Cancelar"),
      h("button", { type: "submit", class: "botao botao-primario" }, "Salvar admissão"),
    ),
  );
  atualizarContagem(form, ADMISSAO);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const dados = lerCampos(form, todosCamposAdmissao());
    // guarda também valores de campos que foram tirados da lista (não perde nada)
    for (const [k, v] of Object.entries(adm.dados || {})) if (!(k in dados) && !todosCamposAdmissao().some((c) => c.id === k)) dados[k] = v;
    const registro = { paciente_id: pacienteId, data: form.elements.data_admissao.value || hojeISO(), dados };
    const botao = form.querySelector("[type=submit]");
    botao.disabled = true;
    botao.textContent = "Salvando…";
    try {
      let salvo;
      if (adm.id) salvo = await q(sb.from("admissoes").update(registro).eq("id", adm.id).select().single());
      else salvo = await q(sb.from("admissoes").insert(registro).select().single());
      if (form.elements.criar_lesao && form.elements.criar_lesao.checked && (dados.lesao_local || dados.lesao_etiologia)) {
        await q(sb.from("lesoes").insert({
          paciente_id: pacienteId,
          nome: dados.lesao_local || dados.lesao_etiologia,
          etiologia: dados.lesao_etiologia || null,
        }));
      }
      edicao.suja = false;
      avisar("Admissão salva.");
      if (!adm.id) location.hash = `#/paciente/${pacienteId}/admissao/${salvo.id}`;
      else { adm = salvo; botao.disabled = false; botao.textContent = "Salvar admissão"; }
    } catch (e) {
      avisar(mensagemErro(e), "erro");
      botao.disabled = false;
      botao.textContent = "Salvar admissão";
    }
  });

  tela.append(
    h("div", { class: "cabecalho-tela" },
      h("div", null,
        h("a", { href: "#/paciente/" + pacienteId, class: "voltar" }, "‹ " + p.nome),
        h("h1", null, adm.id ? "Ficha de admissão" : "Nova admissão"),
        adm.id ? h("p", { class: "texto-suave" }, "Criada por " + (nomeDe(adm.criado_por) || "—") + " em " + dataHoraBR(adm.criado_em)) : null,
      ),
    ),
    form,
  );

  if (adm.id) {
    tela.append(h("div", { class: "cartao" }, await painelFinanceiro(pacienteId, { compacto: true })));
  } else {
    tela.append(h("p", { class: "texto-suave centro" }, "Depois de salvar, aparece aqui embaixo o espaço do plano contratado e dos valores."));
  }
}
