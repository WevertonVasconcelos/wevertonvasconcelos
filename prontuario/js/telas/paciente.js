// Prontuário do paciente: resumo, controle de sessões, cicatrização (PUSH), fotos, documentos e financeiro.
import { sb, q, nomeDe, enviarArquivo } from "../banco.js";
import { h, dataBR, dataHoraBR, moeda, numeroBR, avisar, mensagemErro, janela, hojeISO } from "../util.js";
import { ETIOLOGIAS, SITUACOES_LESAO } from "../campos.js";
import { calcularPush, areaLesao, mapaEl } from "../formulario.js";
import { gradeFotos, painelFinanceiro, escolherFotos, campoTxt, campoSel, campoData, cabecalho, painelPaciente, abas, quadro, pilula } from "./componentes.js";

const ABAS = [
  ["resumo", "Resumo"],
  ["sessoes", "Controle de sessões"],
  ["cicatrizacao", "Cicatrização"],
  ["fotos", "Fotos"],
  ["documentos", "Documentos"],
  ["financeiro", "Financeiro"],
];
const recarregar = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

export async function telaPaciente(tela, id, aba = "resumo") {
  if (aba === "evolucoes") aba = "sessoes";
  if (aba === "arquivos") aba = "documentos";
  const [p, admissoes] = await Promise.all([
    q(sb.from("pacientes").select("*").eq("id", id).single()),
    q(sb.from("admissoes").select("id, data, dados, criado_por").eq("paciente_id", id).order("data", { ascending: false })),
  ]);
  const d = (admissoes[0] && admissoes[0].dados) || {};
  const alertas = [];
  if (d.alergias === "Sim") alertas.push("Alergia: " + (d.alergias_quais || "sim"));
  (d.medicamentos_atencao || []).forEach((m) => alertas.push(m));
  (d.doencas_quais || []).forEach((c) => alertas.push(c));
  (d.dispositivos || []).forEach((c) => alertas.push(c));

  tela.append(
    cabecalho({
      voltar: ["#/pacientes", "Pacientes"],
      subtitulo: p.situacao !== "em tratamento" ? "Situação: " + p.situacao : null,
      titulo: ["PRONTUÁRIO DO", "PACIENTE"],
      acoes: h("a", { href: `#/paciente/${id}/evolucao/nova`, class: "botao botao-primario" }, "+ Nova sessão"),
    }),
    painelPaciente(p, alertas.length ? h("div", { class: "alertas" }, alertas.map((a) => h("span", { class: "alerta" }, a))) : null),
    abas(ABAS.map(([k, t]) => [k, t, `#/paciente/${id}/${k}`]), aba),
  );
  const corpo = h("div", { class: "aba-corpo" });
  tela.append(corpo);
  if (aba === "sessoes") await abaSessoes(corpo, p);
  else if (aba === "cicatrizacao") await abaCicatrizacao(corpo, p, admissoes);
  else if (aba === "fotos") await abaFotos(corpo, p);
  else if (aba === "documentos") await abaDocumentos(corpo, p);
  else if (aba === "financeiro") corpo.append(await painelFinanceiro(id));
  else await abaResumo(corpo, p, admissoes);
}

// ---------- Resumo ----------
async function abaResumo(corpo, p, admissoes) {
  const [lesoes, ultima] = await Promise.all([
    q(sb.from("lesoes").select("*").eq("paciente_id", p.id).order("criado_em")),
    q(sb.from("evolucoes").select("id, data, tipo, descricao, avaliacao").eq("paciente_id", p.id).order("data", { ascending: false }).limit(1)),
  ]);
  const adm = admissoes[0];
  const d = (adm && adm.dados) || {};
  const pushUlt = ultima[0] ? calcularPush(ultima[0].avaliacao) : null;

  corpo.append(
    h("div", { class: "dois-quadros" },
      quadro("Admissão",
        adm
          ? h("div", null,
              h("p", null, "Admitido em ", h("b", null, dataBR(adm.data)), " por " + (nomeDe(adm.criado_por) || "—")),
              [d.lesao_etiologia, d.lesao_local].filter(Boolean).length ? h("p", null, [d.lesao_etiologia, d.lesao_local].filter(Boolean).join(" · ")) : null,
              d.queixas ? h("p", { class: "texto-suave texto-corrido" }, d.queixas) : null,
              d.lesao_mapa ? mapaEl("", d.lesao_mapa, false) : null,
              h("div", { class: "acoes-form" },
                h("a", { href: `#/paciente/${p.id}/admissao`, class: "botao botao-secundario botao-pequeno" }, "Nova admissão"),
                h("a", { href: `#/paciente/${p.id}/admissao/${adm.id}`, class: "botao botao-primario botao-pequeno" }, "Abrir ficha")),
              admissoes.length > 1 ? h("p", { class: "pequeno texto-suave" }, "Admissões anteriores: ",
                admissoes.slice(1).map((a, i) => [i ? ", " : "", h("a", { href: `#/paciente/${p.id}/admissao/${a.id}` }, dataBR(a.data))])) : null)
          : h("div", null, h("p", { class: "texto-suave" }, "Ainda não há ficha de anamnese."),
              h("div", { class: "acoes-form" }, h("a", { class: "botao botao-primario botao-pequeno", href: `#/paciente/${p.id}/admissao` }, "Preencher anamnese")))),
      h("div", { class: "folha-coluna" },
        quadro("Lesões",
          lesoes.length
            ? h("ul", { class: "lista-simples" }, lesoes.map((l) => h("li", null,
                h("div", null, h("strong", null, l.nome), h("small", null, [l.etiologia, l.inicio ? "desde " + dataBR(l.inicio) : null, l.situacao].filter(Boolean).join(" · "))),
                h("button", { type: "button", class: "botao-link", onclick: () => editarLesao(p.id, l) }, "Editar"))))
            : h("p", { class: "texto-suave pequeno" }, "Cadastre cada ferida (ex.: “Pé D – plantar”) para ter fotos e cicatrização separadas."),
          h("div", { class: "acoes-form" }, h("button", { type: "button", class: "botao botao-secundario botao-pequeno", onclick: () => editarLesao(p.id) }, "+ Lesão"))),
        quadro("Última sessão",
          ultima.length
            ? h("div", null,
                h("p", null, h("b", null, dataHoraBR(ultima[0].data)), ultima[0].tipo ? " · " + ultima[0].tipo : "", pushUlt && pushUlt.total != null ? [" ", h("span", { class: "push-selo" }, "PUSH " + pushUlt.total)] : null),
                h("p", { class: "texto-corrido" }, ultima[0].descricao.length > 280 ? ultima[0].descricao.slice(0, 280) + "…" : ultima[0].descricao),
                h("a", { href: `#/paciente/${p.id}/sessoes`, class: "botao-link" }, "Ver controle de sessões"))
            : h("p", { class: "texto-suave" }, "Nenhuma sessão registrada.")),
      ),
    ),
    h("div", { class: "acoes-form", style: { justifyContent: "center" } },
      h("a", { class: "botao botao-secundario", href: `#/paciente/${p.id}/editar` }, "Editar dados do paciente"),
      h("a", { class: "botao botao-secundario", href: `#/paciente/${p.id}/imprimir` }, "Imprimir / PDF do prontuário")),
  );
}

function editarLesao(pacienteId, l = { situacao: "em tratamento" }) {
  const f = h("form", null,
    campoTxt("nome", "Nome / local *", l.nome, null, "Ex.: Pé D – região plantar"),
    campoSel("etiologia", "Etiologia", [["", "—"], ...ETIOLOGIAS.map((e) => [e, e])], l.etiologia || ""),
    campoData("inicio", "Desde quando", l.inicio),
    campoSel("situacao", "Situação", SITUACOES_LESAO.map((s) => [s, s]), l.situacao),
    campoTxt("observacoes", "Observações", l.observacoes),
    h("div", { class: "acoes-form" }, h("button", { type: "submit", class: "botao botao-primario" }, "Salvar")),
  );
  const { fechar } = janela(l.id ? "Editar lesão" : "Nova lesão", f);
  f.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const d = {
      paciente_id: pacienteId, nome: f.elements.nome.value.trim(), etiologia: f.elements.etiologia.value || null,
      inicio: f.elements.inicio.value || null, situacao: f.elements.situacao.value, observacoes: f.elements.observacoes.value.trim() || null,
    };
    if (!d.nome) { avisar("Dê um nome para a lesão.", "erro"); return; }
    try {
      if (l.id) await q(sb.from("lesoes").update(d).eq("id", l.id));
      else await q(sb.from("lesoes").insert(d));
      fechar(); avisar("Lesão salva."); recarregar();
    } catch (e) { avisar(mensagemErro(e), "erro"); }
  });
}

// ---------- Controle de sessões ----------
async function abaSessoes(corpo, p) {
  const [evolucoes, lesoes, fotos] = await Promise.all([
    q(sb.from("evolucoes").select("*, evolucao_materiais(quantidade, custo_unitario, materiais(nome, unidade))").eq("paciente_id", p.id).order("data", { ascending: false })),
    q(sb.from("lesoes").select("id, nome").eq("paciente_id", p.id)),
    q(sb.from("arquivos").select("*").eq("paciente_id", p.id).not("evolucao_id", "is", null).order("criado_em")),
  ]);
  const nomeLesao = Object.fromEntries(lesoes.map((l) => [l.id, l.nome]));
  const linhas = [];
  for (const e of evolucoes) {
    const minhas = fotos.filter((f) => f.evolucao_id === e.id);
    const custo = e.evolucao_materiais.reduce((s, m) => s + m.quantidade * m.custo_unitario, 0);
    const pu = calcularPush(e.avaliacao);
    const editado = Math.abs(new Date(e.atualizado_em) - new Date(e.criado_em)) > 60000;
    linhas.push(h("tr", null,
      h("td", { class: "col-data" }, h("b", null, dataBR(e.data)), h("div", { class: "pequeno texto-suave" }, new Date(e.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))),
      h("td", null,
        h("div", { class: "sessao-meta" }, [e.tipo, nomeLesao[e.lesao_id], e.local_atendimento].filter(Boolean).join(" · "),
          pu && pu.total != null ? h("span", { class: "push-selo" }, "PUSH " + pu.total) : null),
        h("div", { class: "sessao-texto" }, e.descricao),
        e.conduta || e.evolucao_materiais.length || areaLesao(e.avaliacao) != null || e.proximo_atendimento
          ? h("div", { class: "sessao-detalhes" },
              e.conduta ? h("div", null, h("b", null, "Conduta: "), e.conduta) : null,
              areaLesao(e.avaliacao) != null ? h("div", null, h("b", null, "Medidas: "),
                `${numeroBR(e.avaliacao.lesao_comprimento, 2)} × ${numeroBR(e.avaliacao.lesao_largura, 2)} cm (${numeroBR(areaLesao(e.avaliacao), 2)} cm²)`) : null,
              e.evolucao_materiais.length ? h("div", null, h("b", null, "Materiais: "),
                e.evolucao_materiais.map((m) => `${numeroBR(m.quantidade, 2)} ${m.materiais ? m.materiais.unidade + " " + m.materiais.nome : ""}`).join(", ") + " · " + moeda(custo)) : null,
              e.proximo_atendimento ? h("div", null, h("b", null, "Próximo atendimento: "), dataBR(e.proximo_atendimento)) : null)
          : null,
        minhas.length ? h("div", { class: "sessao-fotos" }, await gradeFotos(minhas)) : null,
        h("div", { class: "sessao-rodape" },
          h("span", null, (nomeDe(e.criado_por) || "") + (editado ? " · editado em " + dataHoraBR(e.atualizado_em) : "")),
          h("a", { href: "#/evolucao/" + e.id, class: "botao-link" }, "Abrir / editar")),
      ),
    ));
  }
  corpo.append(
    h("div", { class: "linha-pilula" }, pilula("Controle de sessões"),
      h("span", { class: "texto-suave pequeno" }, evolucoes.length + (evolucoes.length === 1 ? " sessão" : " sessões"))),
    h("div", { class: "rolagem" }, h("table", { class: "tabela-ficha" },
      h("thead", null, h("tr", null, h("th", { class: "col-data" }, "Data"), h("th", null, "Procedimento"))),
      h("tbody", null, linhas.length ? linhas : h("tr", null, h("td", { colspan: 2, class: "vazio" }, "Nenhuma sessão ainda. ",
        h("a", { href: `#/paciente/${p.id}/evolucao/nova` }, "Registrar a primeira")))))),
  );
}

// ---------- Cicatrização (PUSH), como a folha "Cicatrização" ----------
async function abaCicatrizacao(corpo, p, admissoes) {
  const [lesoes, evolucoes] = await Promise.all([
    q(sb.from("lesoes").select("*").eq("paciente_id", p.id).order("criado_em")),
    q(sb.from("evolucoes").select("id, data, lesao_id, avaliacao").eq("paciente_id", p.id).order("data")),
  ]);
  const grupos = lesoes.map((l) => ({ id: l.id, titulo: l.nome, sub: [l.etiologia, l.situacao].filter(Boolean).join(" · ") }));
  grupos.push({ id: null, titulo: "Sem lesão definida" });
  let algum = false;
  for (const g of grupos) {
    const pontos = [];
    admissoes.filter((a) => (a.dados.lesao_id || null) === g.id && (g.id || lesoes.length === 0)).forEach((a) => {
      const pu = calcularPush(a.dados);
      if (pu) pontos.push({ data: a.data, av: a.dados, pu, admissao: true });
    });
    evolucoes.filter((e) => (e.lesao_id || null) === g.id).forEach((e) => {
      const pu = calcularPush(e.avaliacao);
      if (pu) pontos.push({ data: e.data, av: e.avaliacao, pu });
    });
    if (!pontos.length) continue;
    algum = true;
    pontos.sort((a, b) => String(a.data).localeCompare(String(b.data)));
    const cel = (v) => h("td", null, v == null ? "—" : String(v));
    corpo.append(quadro(g.titulo,
      g.sub ? h("p", { class: "texto-suave pequeno" }, g.sub) : null,
      h("div", { class: "rolagem" }, h("table", { class: "tabela-ficha tabela-push" },
        h("thead", null, h("tr", null, h("th", null, "Data"), pontos.map((pt) => h("th", null, dataBR(pt.data).slice(0, 5), pt.admissao ? h("div", { class: "pequeno" }, "admissão") : null)))),
        h("tbody", null,
          h("tr", null, h("td", null, "Comp × Larg"), pontos.map((pt) => h("td", null,
            `${numeroBR(pt.av.lesao_comprimento, 1)}×${numeroBR(pt.av.lesao_largura, 1)}`, h("div", { class: "pequeno texto-suave" }, "pts " + pt.pu.pArea)))),
          h("tr", null, h("td", null, "Exsudato"), pontos.map((pt) => cel(pt.pu.pEx))),
          h("tr", null, h("td", null, "Tipo de tecido"), pontos.map((pt) => cel(pt.pu.pTec))),
          h("tr", { class: "total" }, h("td", null, "Total"), pontos.map((pt) => cel(pt.pu.total))),
        ))),
      h("div", { class: "linha-pilula", style: { marginTop: "16px" } }, pilula("TOTAL PUSH")),
      graficoPush(pontos),
    ));
  }
  if (!algum) corpo.append(h("p", { class: "vazio" }, "Ainda sem medidas. Preencha comprimento, largura, exsudato e tecido na avaliação da lesão (admissão ou sessão)."));
  corpo.append(h("p", { class: "texto-suave pequeno" },
    "Escala PUSH 3.0: área (0 a 10) + exsudato (0 a 3) + tecido (0 a 4) = 0 a 17. Quanto menor, mais perto da cicatrização. O exsudato usa a maior quantidade marcada; o tecido usa o pior tecido marcado."));
}

function graficoPush(pontos) {
  const W = 640, H = 300, esq = 34, dir = 14, topo = 20, base = 30, folga = 26;
  const largura = W - esq - dir, altura = H - topo - base;
  const x = (i) => esq + folga + (pontos.length === 1 ? (largura - 2 * folga) / 2 : (i * (largura - 2 * folga)) / (pontos.length - 1));
  const y = (v) => topo + altura - (v / 17) * altura;
  const ns = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, texto) => {
    const n = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (texto != null) n.textContent = texto;
    return n;
  };
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "grafico-push", role: "img", "aria-label": "Gráfico do total PUSH por data" });
  for (let v = 0; v <= 17; v++) {
    svg.append(el("line", { x1: esq, x2: W - dir, y1: y(v), y2: y(v), stroke: v % 5 === 0 ? "#BBB7B0" : "#ECEAE6", "stroke-width": 1 }));
    if (v % 2 === 1 || v === 0) svg.append(el("text", { x: esq - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "#77736D" }, String(v)));
  }
  const validos = pontos.map((pt, i) => ({ i, v: pt.pu.total })).filter((p) => p.v != null);
  if (validos.length > 1) {
    svg.append(el("polyline", { points: validos.map((p) => `${x(p.i)},${y(p.v)}`).join(" "), fill: "none", stroke: "#3F2140", "stroke-width": 2.5, "stroke-linejoin": "round" }));
  }
  validos.forEach((p) => {
    svg.append(el("circle", { cx: x(p.i), cy: y(p.v), r: 5, fill: "#AE9869", stroke: "#fff", "stroke-width": 2 }));
    svg.append(el("text", { x: x(p.i), y: y(p.v) - 10, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "#3F2140" }, String(p.v)));
  });
  pontos.forEach((pt, i) => {
    if (pontos.length > 12 && i % Math.ceil(pontos.length / 12) !== 0) return;
    svg.append(el("text", { x: x(i), y: H - 8, "text-anchor": "middle", "font-size": 11, fill: "#373635" }, dataBR(pt.data).slice(0, 5)));
  });
  return svg;
}

// ---------- Fotos (linha do tempo por lesão) ----------
async function abaFotos(corpo, p) {
  const [fotos, lesoes] = await Promise.all([
    q(sb.from("arquivos").select("*").eq("paciente_id", p.id).eq("categoria", "lesao").order("data").order("criado_em")),
    q(sb.from("lesoes").select("*").eq("paciente_id", p.id).order("criado_em")),
  ]);
  if (!fotos.length) {
    corpo.append(h("p", { class: "vazio" }, "Nenhuma foto ainda. As fotos tiradas nas sessões aparecem aqui, em ordem de data, separadas por lesão."));
    return;
  }
  const grupos = lesoes.map((l) => ({ titulo: l.nome, id: l.id }));
  grupos.push({ titulo: "Sem lesão definida", id: null });
  for (const g of grupos) {
    const doGrupo = fotos.filter((f) => (f.lesao_id || null) === g.id);
    if (!doGrupo.length) continue;
    corpo.append(quadro(g.titulo + " · " + doGrupo.length + (doGrupo.length > 1 ? " fotos" : " foto"),
      await gradeFotos(doGrupo, { aoApagar: recarregar })));
  }
}

// ---------- Documentos e exames ----------
async function abaDocumentos(corpo, p) {
  const arquivos = await q(sb.from("arquivos").select("*").eq("paciente_id", p.id).neq("categoria", "lesao").order("data", { ascending: false }));
  const escolha = escolherFotos({ texto: "Escolher arquivos (foto ou PDF)", aceitar: "image/*,application/pdf" });
  const form = h("form", null,
    quadro("Enviar exame ou documento",
      h("div", { class: "dois-quadros" },
        campoSel("categoria", "Tipo", [["exame", "Exame"], ["documento", "Documento (termo assinado, receita, laudo…)"]], "exame"),
        campoData("data", "Data do documento", hojeISO())),
      campoTxt("legenda", "Descrição", "", null, "Ex.: hemograma, termo de contratação assinado"),
      escolha.el,
      h("div", { class: "acoes-form" }, h("button", { type: "submit", class: "botao botao-primario" }, "Enviar"))),
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
      recarregar();
    } catch (e) {
      avisar(mensagemErro(e), "erro");
      botao.disabled = false;
      botao.textContent = "Enviar";
    }
  });
  corpo.append(form);
  if (arquivos.length) {
    corpo.append(quadro("Arquivos do paciente",
      await gradeFotos(arquivos, { rotulo: (a) => dataBR(a.data) + (a.legenda ? " · " + a.legenda : ""), aoApagar: recarregar })));
  }
}
