// Admissão: Ficha de Anamnese + Avaliação da Lesão + Plano de Cuidados (as folhas da Mariana).
import { sb, q, sessao, nomeDe } from "../banco.js";
import { h, hojeISO, dataBR, avisar, mensagemErro, edicao } from "../util.js";
import { FOLHAS_ADMISSAO, ANAMNESE, AVALIACAO, PLANO_CUIDADOS, camposDe } from "../campos.js";
import { folhaEl, lerCampos, calcularPush, textoPush, tituloFicha } from "../formulario.js";
import { painelFinanceiro, painelPaciente, abas } from "./componentes.js";

const TODOS = () => camposDe(ANAMNESE, AVALIACAO, PLANO_CUIDADOS);
let abaAtual = "anamnese";
let continuarNaAba = null; // depois de salvar uma admissão nova, volta na mesma aba

export async function telaAdmissao(tela, pacienteId, admissaoId) {
  const [p, lesoes] = await Promise.all([
    q(sb.from("pacientes").select("*").eq("id", pacienteId).single()),
    q(sb.from("lesoes").select("id").eq("paciente_id", pacienteId)),
  ]);
  let adm = { data: hojeISO(), dados: {} };
  if (admissaoId) adm = await q(sb.from("admissoes").select("*").eq("id", admissaoId).single());
  abaAtual = continuarNaAba || "anamnese";
  continuarNaAba = null;

  const autor = adm.id ? nomeDe(adm.criado_por) : sessao.membro && sessao.membro.nome;
  const registro = adm.id ? (sessao.equipe.find((m) => m.user_id === adm.criado_por) || {}).registro : sessao.membro && sessao.membro.registro;
  const assinatura = () => h("p", { class: "assinatura-ficha" },
    h("span", null, "Data: ", h("b", null, dataBR(form.elements.data_admissao.value || adm.data))),
    h("span", null, "Assinatura: ", h("b", null, [autor, registro].filter(Boolean).join(" · "))));

  const pushEl = h("p", { class: "resumo-push" });
  const criarLesao = !admissaoId && !lesoes.length
    ? h("label", { class: "caixinha" }, h("input", { type: "checkbox", name: "criar_lesao", checked: true }), h("span", { class: "quadrado" }),
        h("span", { class: "texto" }, "Cadastrar esta lesão na lista de lesões do paciente (para a linha do tempo das fotos e da cicatrização)"))
    : null;

  const folhas = {};
  const tituloTopo = h("div");
  const areaFinanceiro = h("div");
  const form = h("form", { oninput: () => { edicao.suja = true; atualizarPush(); } });

  FOLHAS_ADMISSAO.forEach(({ chave, folha }) => {
    folhas[chave] = h("div", { class: "folha-aba", hidden: chave !== abaAtual },
      folhaEl(folha, adm.dados, { semTitulo: true }),
      chave === "avaliacao" ? [pushEl, criarLesao] : null,
      chave === "plano" ? areaFinanceiro : null,
    );
  });

  const barraAbas = h("div");
  function mostrarAba(k) {
    abaAtual = k;
    Object.entries(folhas).forEach(([c, el]) => (el.hidden = c !== k));
    const f = FOLHAS_ADMISSAO.find((x) => x.chave === k).folha;
    tituloTopo.replaceChildren(tituloFicha(f.titulo, f.roxo));
    barraAbas.replaceChildren(abas(FOLHAS_ADMISSAO.map((x) => [x.chave, x.aba]), k, mostrarAba));
    assinaturaEl.replaceChildren(assinatura());
  }
  const assinaturaEl = h("div");

  form.append(
    painelPaciente(p, h("div", { class: "painel-grade" },
      h("label", { class: "painel-campo meia" }, h("span", { class: "rotulo" }, "Data da admissão"),
        h("input", { name: "data_admissao", type: "date", value: adm.data, required: true })),
      h("div", { class: "painel-campo meia sem-linha" }, h("a", { href: `#/paciente/${pacienteId}/editar`, class: "botao-link" }, "Editar dados do paciente")),
    )),
    barraAbas,
    ...Object.values(folhas),
    assinaturaEl,
    h("div", { class: "barra-salvar" },
      h("a", { href: "#/paciente/" + pacienteId, class: "botao botao-secundario" }, "Voltar"),
      h("button", { type: "submit", class: "botao botao-primario" }, "Salvar admissão"),
    ),
  );

  function atualizarPush() {
    const pu = calcularPush(lerCampos(folhas.avaliacao, camposDe(AVALIACAO)));
    pushEl.textContent = pu ? textoPush(pu) : "";
  }
  atualizarPush();

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const dados = lerCampos(form, TODOS());
    // guarda também valores de campos que saíram da ficha (não perde nada)
    const ids = new Set(TODOS().map((c) => c.id));
    for (const [k, v] of Object.entries(adm.dados || {})) if (!(k in dados) && !ids.has(k)) dados[k] = v;
    const registroAdm = { paciente_id: pacienteId, data: form.elements.data_admissao.value || hojeISO(), dados };
    const botao = form.querySelector("[type=submit]");
    botao.disabled = true;
    botao.textContent = "Salvando…";
    try {
      let salvo;
      if (adm.id) salvo = await q(sb.from("admissoes").update(registroAdm).eq("id", adm.id).select().single());
      else salvo = await q(sb.from("admissoes").insert(registroAdm).select().single());
      if (form.elements.criar_lesao && form.elements.criar_lesao.checked && (dados.lesao_local || dados.lesao_etiologia)) {
        const lesao = await q(sb.from("lesoes").insert({
          paciente_id: pacienteId, nome: dados.lesao_local || dados.lesao_etiologia, etiologia: dados.lesao_etiologia || null,
        }).select().single());
        salvo = await q(sb.from("admissoes").update({ dados: { ...dados, lesao_id: lesao.id } }).eq("id", salvo.id).select().single());
      }
      edicao.suja = false;
      avisar("Admissão salva.");
      if (!adm.id) { continuarNaAba = abaAtual; location.hash = `#/paciente/${pacienteId}/admissao/${salvo.id}`; }
      else { adm = salvo; botao.disabled = false; botao.textContent = "Salvar admissão"; }
    } catch (e) {
      avisar(mensagemErro(e), "erro");
      botao.disabled = false;
      botao.textContent = "Salvar admissão";
    }
  });

  tela.append(
    h("div", { class: "cabecalho-ficha" },
      h("div", { class: "esquerda" },
        h("a", { href: "#/paciente/" + pacienteId, class: "voltar" }, "‹ " + p.nome),
        h("p", { class: "subtitulo" }, adm.id ? "Admissão de " + dataBR(adm.data) : "Nova admissão")),
      h("div", { class: "direita" }, tituloTopo)),
    form,
  );
  mostrarAba(abaAtual);

  if (adm.id) areaFinanceiro.append(h("div", { style: { marginTop: "22px" } }, await painelFinanceiro(pacienteId, { compacto: true })));
  else areaFinanceiro.append(h("p", { class: "texto-suave pequeno", style: { marginTop: "14px" } }, "Depois de salvar, aparece aqui o plano contratado e os valores das sessões."));
}
