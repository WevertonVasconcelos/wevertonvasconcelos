// Gera o prontuário completo em HTML, no formato das folhas de atendimento
// (para imprimir/salvar PDF e para o backup).
import { escaparHTML as e, dataBR, dataHoraBR, idade, numeroBR, moeda } from "./util.js";
import { ANAMNESE, AVALIACAO, PLANO_CUIDADOS, FIGURAS_CORPO, OMITIR_NA_EVOLUCAO } from "./campos.js";
import { valorTexto, areaLesao, calcularPush } from "./formulario.js";

// dados: { paciente, admissoes, lesoes, evolucoes, arquivos, equipe }
// srcArquivo(arquivo) -> endereço da foto ; base -> pasta do site (para logo e figuras)
export function htmlProntuario(dados, { srcArquivo, base = "", geradoPor }) {
  const { paciente: p, admissoes, lesoes, evolucoes, arquivos, equipe } = dados;
  const membro = (id) => equipe.find((m) => m.user_id === id) || {};
  const carimbo = (id) => [membro(id).nome, membro(id).registro].filter(Boolean).join(" · ");
  const nomeLesao = Object.fromEntries(lesoes.map((l) => [l.id, l.nome]));
  const anos = idade(p.data_nascimento);
  const imagem = (a) => (a.tipo_mime || "").startsWith("image/");
  const titulo = ([fino, forte], roxo) => `<h2 class="titulo${roxo ? " roxo" : ""}">${e(fino)} <b>${e(forte)}</b></h2>`;

  // Desenha uma folha (colunas de quadros) só com o que foi preenchido
  const respostas = (lista, v, omitir = []) => lista.map((c) => campo(c, v, omitir)).join("");
  function campo(c, v, omitir) {
    if (c.id && omitir.includes(c.id)) return "";
    if (c.tipo === "caixa") {
      const dentro = respostas(c.campos, v, omitir);
      return dentro ? `<fieldset><legend>${e(c.rotulo || "")}</legend>${dentro}</fieldset>` : "";
    }
    if (c.tipo === "lado" || c.tipo === "grade") {
      const dentro = respostas(c.campos, v, omitir);
      return dentro ? `<div class="${c.tipo}">${dentro}</div>` : "";
    }
    if (c.tipo === "tabela") {
      return `<table class="plano">${c.campos.map((x) => `<tr><th>${e(x.rotulo)}</th><td>${e(v[x.id] || "")}</td></tr>`).join("")}</table>`;
    }
    if (c.tipo === "mapa") return v[c.id] ? mapa(v[c.id]) : "";
    const t = valorTexto(c, v[c.id]);
    const sub = c.sub ? respostas(c.sub, v, omitir) : "";
    if (!t && !sub) return "";
    return `<p class="resp">${c.rotulo ? `<b>${e(c.rotulo)}</b> ` : ""}${e(t)}</p>${sub ? `<div class="sub">${sub}</div>` : ""}`;
  }
  function folha(f, v, omitir) {
    const cols = f.colunas.map((col) => `<div class="col">${respostas(col, v, omitir)}</div>`).join("");
    const rod = f.rodape ? respostas(f.rodape, v, omitir) : "";
    return `<div class="colunas${f.colunas.length > 1 ? " duas" : ""}">${cols}</div>${rod}`;
  }
  function mapa(marcas) {
    return `<div class="mapa">${FIGURAS_CORPO.map((fig) => {
      const pts = marcas.map((m, i) => ({ ...m, n: i + 1 })).filter((m) => m.f === fig.id);
      return `<div class="fig fig-${fig.id}"><img src="${e(base + fig.arquivo)}" alt="">${pts.map((m) =>
        `<span style="left:${m.x * 100}%;top:${m.y * 100}%">${m.n}</span>`).join("")}</div>`;
    }).join("")}</div>`;
  }
  const painel = `<div class="painel">
    <div class="linha"><span>Nome</span><b>${e(p.nome)}</b></div>
    <div class="dupla"><div class="linha"><span>Idade</span><b>${anos != null ? anos + " anos (" + e(dataBR(p.data_nascimento)) + ")" : ""}</b></div>
      <div class="linha"><span>Sexo</span><b>${e(p.sexo || "")}</b></div></div>
    <div class="linha"><span>Endereço</span><b>${e(p.endereco || "")}</b></div>
    <div class="dupla"><div class="linha"><span>Telefone</span><b>${e(p.telefone || "")}</b></div>
      <div class="linha"><span>Responsável/Cuidador</span><b>${e([p.responsavel, p.responsavel_telefone].filter(Boolean).join(" · "))}</b></div></div>
    ${p.cpf ? `<div class="linha"><span>CPF</span><b>${e(p.cpf)}</b></div>` : ""}
  </div>`;
  const assinatura = (data, id) => `<p class="assina">DATA: <b>${e(dataBR(data))}</b> &nbsp; · &nbsp; ASSINATURA / CARIMBO: <b>${e(carimbo(id))}</b></p>`;
  const topo = (t, roxo) => `<header><img src="${e(base + "icones/logo.png")}" alt="Véras Vasconcelos Medicina e Saúde">${titulo(t, roxo)}</header>`;

  const paginasAdmissao = admissoes.map((adm) => `
    <section class="pagina">${topo(ANAMNESE.titulo)}${painel}
      <p class="data-adm">Admissão de ${e(dataBR(adm.data))}</p>${folha(ANAMNESE, adm.dados)}${assinatura(adm.data, adm.criado_por)}</section>
    <section class="pagina">${topo(AVALIACAO.titulo)}${folha(AVALIACAO, adm.dados)}${(() => { const pu = calcularPush(adm.dados); return pu && pu.total != null ? `<p class="push">PUSH ${pu.total}</p>` : ""; })()}${assinatura(adm.data, adm.criado_por)}</section>
    <section class="pagina">${topo(PLANO_CUIDADOS.titulo, true)}${folha(PLANO_CUIDADOS, adm.dados)}${assinatura(adm.data, adm.criado_por)}</section>`).join("");

  const linhasSessoes = evolucoes.map((ev) => {
    const fotos = arquivos.filter((a) => a.evolucao_id === ev.id && imagem(a));
    const pu = calcularPush(ev.avaliacao);
    const area = areaLesao(ev.avaliacao);
    const mats = (ev.evolucao_materiais || []).map((m) => `${numeroBR(m.quantidade, 2)} ${e(m.materiais ? m.materiais.unidade + " " + m.materiais.nome : "")}`).join(", ");
    const av = AVALIACAO.colunas.flat().map((c) => campo(c, ev.avaliacao, [...OMITIR_NA_EVOLUCAO, "lesao_mapa"])).join("");
    return `<tr><td class="data">${e(dataBR(ev.data))}<br><small>${e(new Date(ev.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))}</small></td>
      <td><div class="meta">${e([ev.tipo, nomeLesao[ev.lesao_id], ev.local_atendimento].filter(Boolean).join(" · "))}${pu && pu.total != null ? ` · <b>PUSH ${pu.total}</b>` : ""}</div>
      <div class="texto">${e(ev.descricao)}</div>
      ${ev.conduta ? `<p class="resp"><b>Conduta:</b> ${e(ev.conduta)}</p>` : ""}
      ${area != null ? `<p class="resp"><b>Medidas:</b> ${numeroBR(ev.avaliacao.lesao_comprimento, 2)} × ${numeroBR(ev.avaliacao.lesao_largura, 2)} cm (${numeroBR(area, 2)} cm²)</p>` : ""}
      ${av ? `<details open><summary>Avaliação da lesão</summary><div class="av">${av}</div></details>` : ""}
      ${mats ? `<p class="resp"><b>Materiais:</b> ${mats}</p>` : ""}
      ${fotos.length ? `<div class="fotos">${fotos.map((a) => `<img src="${e(srcArquivo(a))}" alt="">`).join("")}</div>` : ""}
      <p class="carimbo">${e(carimbo(ev.criado_por))}</p></td></tr>`;
  }).join("");

  const outros = arquivos.filter((a) => a.categoria !== "lesao");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prontuário - ${e(p.nome)}</title>
<style>
  @font-face{font-family:Montserrat;src:url("${e(base)}fontes/Montserrat.woff2") format("woff2");font-weight:100 900}
  body{font-family:Montserrat,Helvetica,Arial,sans-serif;color:#373635;max-width:820px;margin:0 auto;padding:24px;font-size:12.5px;line-height:1.45;background:#fff}
  .pagina{position:relative;padding-bottom:12px;margin-bottom:28px}
  .pagina + .pagina{break-before:page}
  header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
  header img{height:88px}
  .titulo{font-size:22px;font-weight:400;letter-spacing:-.02em;margin:0 0 6px;text-transform:uppercase}
  .titulo b{font-weight:700}.titulo.roxo{color:#3F2140;font-weight:700}
  .painel{background:#D6CBB2;border-radius:14px;padding:8px 18px 12px;margin-bottom:14px}
  .painel .linha{display:flex;gap:8px;align-items:flex-end;border-bottom:1.4px solid #8F8678;padding:7px 0 3px;min-height:30px}
  .painel .linha span{flex:none}.painel .linha b{font-weight:600}
  .painel .dupla{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}
  .data-adm{font-weight:700;margin:0 0 8px}
  .colunas.duas{display:grid;grid-template-columns:1fr 1fr;gap:0 26px}
  fieldset{border:1.4px solid #989187;border-radius:12px;margin:0 0 10px;padding:6px 12px 8px;break-inside:avoid}
  legend{font-weight:700;padding:0 6px}
  .resp{margin:3px 0}.resp b{font-weight:700}
  .sub{margin-left:12px}
  .grade,.lado{display:grid;grid-template-columns:repeat(3,1fr);gap:0 12px}.lado{grid-template-columns:1fr 1fr}
  table.plano{width:100%;border-collapse:collapse}
  table.plano th,table.plano td{border:1.4px solid #AE9869;padding:9px 10px;vertical-align:top}
  table.plano th{width:34%;text-transform:uppercase;font-size:10.5px;color:#3F2140;font-weight:700;text-align:center;vertical-align:middle}
  table.plano td{white-space:pre-wrap}
  .mapa{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end;margin:4px 0}
  .fig{position:relative}.fig img{display:block;width:100%}
  .fig-corpo{width:100%}.fig-perna,.fig-pe-plantar{width:30%}.fig-pe-lateral{width:24%}
  .fig span{position:absolute;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#3F2140;color:#fff;font-size:10px;font-weight:700;text-align:center;line-height:18px;border:1.5px solid #fff}
  .assina{text-align:center;margin-top:14px;font-size:11.5px}
  .push{font-weight:700;color:#3F2140}
  .pilula{display:inline-block;background:#AE9869;color:#fff;font-weight:700;padding:3px 10px;border-radius:6px;margin:4px 0 8px}
  table.sessoes{width:100%;border-collapse:collapse}
  table.sessoes th{background:#BBA982;color:#fff;text-transform:uppercase;font-size:11px;padding:8px;text-align:left}
  table.sessoes td{border:1.4px solid #DAD8D4;padding:8px;vertical-align:top}
  table.sessoes tr{break-inside:avoid}
  td.data{width:74px;font-weight:700;white-space:nowrap}td.data small{font-weight:400;color:#77736D}
  .meta{font-size:11px;color:#77736D;margin-bottom:3px}
  .texto{white-space:pre-wrap}
  details summary{font-weight:700;font-size:11px;color:#3F2140;margin-top:4px}
  .av{font-size:11.5px}.av fieldset{display:inline-block;vertical-align:top;margin:4px 6px 4px 0;padding:2px 10px 4px}
  .fotos{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .fotos img{width:170px;height:170px;object-fit:cover;border-radius:8px;border:1px solid #DAD8D4}
  .carimbo{font-size:10.5px;color:#77736D;font-style:italic;margin:6px 0 0}
  ul{padding-left:18px}
  .rodape{margin-top:20px;border-top:1.4px solid #D6CBB2;padding-top:6px;font-size:10.5px;color:#77736D}
  @media (max-width:600px){.colunas.duas,.painel .dupla{grid-template-columns:1fr}header img{height:60px}}
  @media print{body{padding:0}details summary{list-style:none}a{color:inherit;text-decoration:none}}
</style></head><body>

${paginasAdmissao || `<section class="pagina">${topo(["FICHA DE", "ANAMNESE"])}${painel}<p><i>Sem ficha de admissão.</i></p></section>`}


<section class="pagina">${topo(["CONTROLE DE", "SESSÕES"])}
  <span class="pilula">Paciente: ${e(p.nome)}</span>
  ${lesoes.length ? `<p class="resp"><b>Lesões:</b> ${lesoes.map((l) => `${e(l.nome)}${l.etiologia ? " (" + e(l.etiologia) + ")" : ""} · ${e(l.situacao)}`).join("; ")}</p>` : ""}
  ${evolucoes.length ? `<table class="sessoes"><thead><tr><th>Data</th><th>Procedimento</th></tr></thead><tbody>${linhasSessoes}</tbody></table>` : "<p><i>Sem sessões registradas.</i></p>"}
</section>

${outros.length ? `<section><span class="pilula">Exames e documentos</span><ul>${outros.map((a) => `<li>${e(dataBR(a.data))} · ${e(a.legenda || a.nome_original || "arquivo")} — <a href="${e(srcArquivo(a))}">abrir</a></li>`).join("")}</ul></section>` : ""}

<p class="rodape">Véras Vasconcelos Medicina e Saúde · CNPJ 62.304.982/0001-62 · Documento gerado em ${e(dataHoraBR(new Date().toISOString()))}${geradoPor ? " por " + e(geradoPor) : ""}.</p>
</body></html>`;
}

// Busca tudo de um paciente (ou de todos, se pacienteId for nulo).
// O Supabase devolve no máximo 1000 linhas por vez, então busca em páginas.
async function todasAsLinhas(q, fabrica) {
  const tudo = [];
  for (let i = 0; ; i += 1000) {
    const lote = await q(fabrica().range(i, i + 999));
    tudo.push(...lote);
    if (lote.length < 1000) return tudo;
  }
}

export async function buscarDadosProntuario(sb, q, pacienteId) {
  const de = (tabela, campos) => () => {
    let c = sb.from(tabela).select(campos);
    if (pacienteId) c = tabela === "pacientes" ? c.eq("id", pacienteId) : c.eq("paciente_id", pacienteId);
    return c.order(tabela === "evolucoes" ? "data" : "criado_em").order("id");
  };
  const [pacientes, admissoes, lesoes, evolucoes, arquivos] = await Promise.all([
    todasAsLinhas(q, de("pacientes", "*")),
    todasAsLinhas(q, de("admissoes", "*")),
    todasAsLinhas(q, de("lesoes", "*")),
    todasAsLinhas(q, de("evolucoes", "*, evolucao_materiais(quantidade, custo_unitario, material_id, materiais(nome, unidade))")),
    todasAsLinhas(q, de("arquivos", "*")),
  ]);
  pacientes.sort((a, b) => a.nome.localeCompare(b.nome));
  admissoes.sort((a, b) => a.data.localeCompare(b.data));
  arquivos.sort((a, b) => a.data.localeCompare(b.data));
  return { pacientes, admissoes, lesoes, evolucoes, arquivos, todasAsLinhas: (f) => todasAsLinhas(q, f) };
}

export function separarPorPaciente(tudo, paciente, equipe) {
  const doP = (lista) => lista.filter((x) => x.paciente_id === paciente.id);
  return {
    paciente,
    admissoes: doP(tudo.admissoes),
    lesoes: doP(tudo.lesoes),
    evolucoes: doP(tudo.evolucoes),
    arquivos: doP(tudo.arquivos),
    equipe,
  };
}
