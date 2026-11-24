// Gera o prontuário completo em HTML (para imprimir/salvar PDF e para o backup).
import { escaparHTML as e, dataBR, dataHoraBR, idade, numeroBR } from "./util.js";
import { ADMISSAO, AVALIACAO_LESAO } from "./campos.js";
import { valorTexto, areaLesao } from "./formulario.js";

// dados: { paciente, admissoes, lesoes, evolucoes, arquivos, equipe }
// srcArquivo(arquivo) -> endereço da imagem/arquivo ; logo -> endereço do logo
export function htmlProntuario(dados, { srcArquivo, logo, geradoPor }) {
  const { paciente: p, admissoes, lesoes, evolucoes, arquivos, equipe } = dados;
  const nomeDe = (id) => (equipe.find((m) => m.user_id === id) || {}).nome || "";
  const registroDe = (id) => (equipe.find((m) => m.user_id === id) || {}).registro || "";
  const nomeLesao = Object.fromEntries(lesoes.map((l) => [l.id, l.nome]));
  const anos = idade(p.data_nascimento);

  const linhaDado = (r, v) => (v ? `<tr><th>${e(r)}</th><td>${e(v)}</td></tr>` : "");
  const imagem = (a) => (a.tipo_mime || "").startsWith("image/");

  const blocoAdmissao = (adm) => {
    const secoes = ADMISSAO.map((s) => {
      const linhas = s.campos.map((c) => linhaDado(c.rotulo, valorTexto(c, adm.dados[c.id]))).join("");
      return linhas ? `<h4>${e(s.titulo)}</h4><table class="dados">${linhas}</table>` : "";
    }).join("");
    return `<section class="bloco">
      <h3>Admissão de ${e(dataBR(adm.data))}</h3>
      ${secoes || "<p><i>Ficha sem campos preenchidos.</i></p>"}
      <p class="assina">Registrado por ${e(nomeDe(adm.criado_por))} ${e(registroDe(adm.criado_por))} em ${e(dataHoraBR(adm.criado_em))}</p>
    </section>`;
  };

  const blocoEvolucao = (ev) => {
    const fotos = arquivos.filter((a) => a.evolucao_id === ev.id);
    const av = AVALIACAO_LESAO.map((c) => linhaDado(c.rotulo, valorTexto(c, ev.avaliacao[c.id]))).join("");
    const area = areaLesao(ev.avaliacao);
    const mats = (ev.evolucao_materiais || []).map((m) => `${numeroBR(m.quantidade, 2)} ${e(m.materiais ? m.materiais.unidade + " " + m.materiais.nome : "")}`).join(", ");
    return `<section class="evolucao">
      <h4>${e(dataHoraBR(ev.data))} ${ev.tipo ? "· " + e(ev.tipo) : ""} ${ev.lesao_id ? "· " + e(nomeLesao[ev.lesao_id] || "") : ""} ${ev.local_atendimento ? "· " + e(ev.local_atendimento) : ""}</h4>
      <p class="texto">${e(ev.descricao)}</p>
      ${ev.conduta ? `<p><b>Conduta:</b> ${e(ev.conduta)}</p>` : ""}
      ${area != null ? `<p><b>Área estimada:</b> ${numeroBR(area, 2)} cm²</p>` : ""}
      ${av ? `<table class="dados">${av}</table>` : ""}
      ${mats ? `<p><b>Materiais:</b> ${mats}</p>` : ""}
      ${ev.proximo_atendimento ? `<p><b>Próximo atendimento:</b> ${e(dataBR(ev.proximo_atendimento))}</p>` : ""}
      ${fotos.length ? `<div class="fotos">${fotos.map((a) => (imagem(a) ? `<figure><img src="${e(srcArquivo(a))}" alt=""><figcaption>${e(dataBR(a.data))}</figcaption></figure>` : "")).join("")}</div>` : ""}
      <p class="assina">${e(nomeDe(ev.criado_por))} ${e(registroDe(ev.criado_por))}${ev.atualizado_por && Math.abs(new Date(ev.atualizado_em) - new Date(ev.criado_em)) > 60000 ? ` · editado em ${e(dataHoraBR(ev.atualizado_em))} por ${e(nomeDe(ev.atualizado_por))}` : ""}</p>
    </section>`;
  };

  const outros = arquivos.filter((a) => a.categoria !== "lesao");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prontuário - ${e(p.nome)}</title>
<style>
  body{font-family:Montserrat,Helvetica,Arial,sans-serif;color:#2D2D2D;max-width:820px;margin:0 auto;padding:24px;font-size:13px;line-height:1.5;background:#fff}
  header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #B89A6A;padding-bottom:12px;margin-bottom:16px;gap:16px}
  header img{height:70px}
  h1,h2,h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;margin:.6em 0 .3em}
  h1{font-size:26px;margin:0}
  h2{font-size:21px;border-bottom:1px solid #C8B49A;padding-bottom:4px;margin-top:28px;color:#8C7044}
  h3{font-size:18px}
  h4{font-size:13px;margin:14px 0 4px;text-transform:uppercase;letter-spacing:.05em;color:#8C7044}
  table.dados{width:100%;border-collapse:collapse;margin:4px 0 8px}
  table.dados th{text-align:left;width:38%;font-weight:600;padding:3px 8px 3px 0;vertical-align:top;color:#555}
  table.dados td{padding:3px 0;vertical-align:top}
  table.dados tr{border-bottom:1px solid #F0EBE4}
  .evolucao{border-left:3px solid #B89A6A;padding:2px 0 6px 12px;margin:14px 0;break-inside:avoid}
  .evolucao h4{color:#2D2D2D}
  .texto{white-space:pre-wrap}
  .fotos{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
  .fotos figure{margin:0;width:240px}
  .fotos img{width:240px;height:240px;object-fit:cover;border-radius:6px;border:1px solid #ddd}
  .fotos figcaption{font-size:11px;color:#6B6B6B}
  .assina{font-size:11px;color:#6B6B6B;font-style:italic}
  .rodape{margin-top:32px;border-top:1px solid #C8B49A;padding-top:8px;font-size:11px;color:#6B6B6B}
  ul{padding-left:18px}
  @media print{body{padding:0}.nao-imprimir{display:none}a{color:inherit;text-decoration:none}}
</style></head><body>
<header>
  <div><h1>Prontuário</h1><div>${e(p.nome)}</div></div>
  ${logo ? `<img src="${e(logo)}" alt="Véras Vasconcelos Medicina e Saúde">` : ""}
</header>

<h2>Identificação</h2>
<table class="dados">
  ${linhaDado("Nome", p.nome)}
  ${linhaDado("Nascimento", p.data_nascimento ? dataBR(p.data_nascimento) + (anos != null ? ` (${anos} anos)` : "") : "")}
  ${linhaDado("Sexo", p.sexo)}
  ${linhaDado("CPF", p.cpf)}
  ${linhaDado("Telefone", p.telefone)}
  ${linhaDado("Endereço", p.endereco)}
  ${linhaDado("Responsável", [p.responsavel, p.responsavel_telefone].filter(Boolean).join(" · "))}
  ${linhaDado("Situação", p.situacao)}
  ${linhaDado("Observações", p.observacoes)}
</table>

${lesoes.length ? `<h2>Lesões</h2><ul>${lesoes.map((l) => `<li><b>${e(l.nome)}</b>${l.etiologia ? " · " + e(l.etiologia) : ""}${l.inicio ? " · desde " + e(dataBR(l.inicio)) : ""} · ${e(l.situacao)}</li>`).join("")}</ul>` : ""}

<h2>Admissão</h2>
${admissoes.length ? admissoes.map(blocoAdmissao).join("") : "<p><i>Sem ficha de admissão.</i></p>"}

<h2>Evoluções (${evolucoes.length})</h2>
${evolucoes.length ? evolucoes.map(blocoEvolucao).join("") : "<p><i>Sem evoluções.</i></p>"}

${outros.length ? `<h2>Exames e documentos</h2><ul>${outros.map((a) => `<li>${e(dataBR(a.data))} · ${e(a.legenda || a.nome_original || "arquivo")} — <a href="${e(srcArquivo(a))}">abrir</a></li>`).join("")}</ul>` : ""}

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
