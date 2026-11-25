// Gera o prontuário do paciente em PDF (páginas A4, com fotos), no visual da ficha:
// cabeçalho com logo, painel bege de identificação, folhas de cada episódio
// (Anamnese, Avaliação da lesão, Pé diabético, Plano de cuidados, Controle de sessões),
// Cicatrização (PUSH) e lista de exames/documentos.
import { dataBR, dataHoraBR, idade, numeroBR, reduzirImagem, nomeArquivoSeguro } from "./util.js";
import { ANAMNESE, AVALIACAO, PLANO_CUIDADOS, FIGURAS_CORPO, OMITIR_NA_EVOLUCAO } from "./campos.js";
import { valorTexto, areaLesao, calcularPush } from "./formulario.js";
import { PE_DIABETICO, temPeDiabetico, calcularPeDiabetico, textoResumoPeDiabetico } from "./pediabetico.js";

let carregando = null;
export function carregarJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  carregando ||= new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = "vendor/jspdf.umd.min.js";
    s.onload = () => ok(window.jspdf);
    s.onerror = () => { carregando = null; falha(new Error("Não consegui carregar o gerador de PDF. Confira a internet.")); };
    document.head.appendChild(s);
  });
  return carregando;
}

export const nomePdf = (p) => `Prontuario - ${nomeArquivoSeguro(p.nome)}.pdf`;

// Cores da ficha
const COR = {
  bege: [214, 203, 178], begeClaro: [239, 233, 221], dourado: [174, 152, 105], douradoCab: [187, 169, 130],
  ameixa: [63, 33, 64], grafite: [55, 54, 53], texto: [74, 72, 69], suave: [119, 115, 109], borda: [152, 145, 135], linha: [218, 216, 212],
};
// Fonte padrão do PDF só tem caracteres latinos: troca os poucos símbolos que faltam
const TROCAS = { "≥": ">=", "≤": "<=", "→": "->", "←": "<-", "✓": "v", "✕": "x", " ": " " };
const limpo = (t) => String(t == null ? "" : t).replace(/[≥≤→←✓✕ ]/g, (c) => TROCAS[c]).replace(/[^\x00-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, "");

async function blobParaImagem(blob, ladoMax) {
  const reduzido = ladoMax ? await reduzirImagem(blob, ladoMax, 0.72) : blob;
  const bmp = await createImageBitmap(reduzido);
  const dados = new Uint8Array(await reduzido.arrayBuffer());
  const r = { dados, w: bmp.width, h: bmp.height, formato: reduzido.type === "image/png" ? "PNG" : "JPEG" };
  if (bmp.close) bmp.close();
  return r;
}
async function recurso(caminho) {
  try {
    const r = await fetch(caminho);
    if (!r.ok) return null;
    return await blobParaImagem(await r.blob(), null);
  } catch (e) { return null; }
}

// Campos preenchidos de uma folha, como pares rótulo/valor (o mapa é desenhado à parte)
function respostas(folha, d, omitir = []) {
  const out = [];
  const rot = (t) => (t || "").replace(/:\s*$/, "").trim();
  const visitar = (c, grupo, sub = false) => {
    if (c.id && omitir.includes(c.id)) return;
    if (c.tipo === "caixa") { c.campos.forEach((x) => visitar(x, rot(c.rotulo) || grupo)); return; }
    if (c.tipo === "lado" || c.tipo === "grade" || c.tipo === "tabela") { c.campos.forEach((x) => visitar(x, grupo)); return; }
    if (c.tipo === "mapa") return;
    const v = valorTexto(c, d[c.id]);
    const r = rot(c.rotulo);
    // Só junta o nome do quadro quando ele diferencia (ex.: "Pé direito – Pulso pedioso")
    const prefixa = r && grupo && /^Pé (direito|esquerdo)/.test(grupo);
    const rotulo = prefixa ? `${grupo} – ${r}` : r || (sub ? "Quais" : grupo) || c.id;
    if (v) out.push([rotulo, v]);
    (c.sub || []).forEach((x) => visitar(x, null, true));
  };
  [...(folha.colunas || []).flat(), ...(folha.rodape || [])].forEach((c) => visitar(c, null));
  return out;
}

// dados: { paciente, admissoes, lesoes, evolucoes, arquivos, equipe }
// imagem(arquivo): Promise<Blob|null> da foto (null = sem fotos)
export async function gerarPdfProntuario(dados, { imagem, geradoPor, informar = () => {} } = {}) {
  const { jsPDF } = await carregarJsPDF();
  const { paciente: p, admissoes, lesoes, evolucoes, arquivos, equipe } = dados;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: "Prontuário - " + p.nome, author: "Véras Vasconcelos Medicina e Saúde" });
  const membro = (id) => equipe.find((m) => m.user_id === id) || {};
  const carimbo = (id) => [membro(id).nome, membro(id).registro].filter(Boolean).join(" · ");
  const nomeLesao = Object.fromEntries(lesoes.map((l) => [l.id, l.nome]));
  const logo = await recurso("icones/logo.png");
  const figuras = {};
  for (const f of FIGURAS_CORPO) figuras[f.id] = await recurso(f.arquivo);

  const M = 15, L = 180, TOPO = 34, BASE = 280;
  let y = TOPO;
  const cor = (c) => doc.setTextColor(...c);
  const fonte = (estilo, tam, c = COR.grafite) => { doc.setFont("helvetica", estilo); doc.setFontSize(tam); cor(c); };
  const alturaLinha = (tam) => tam * 0.42;

  function cabecalho() {
    if (logo) { const w = 42, h = (w * logo.h) / logo.w; doc.addImage(logo.dados, logo.formato, M, 8, w, h); }
    fonte("normal", 8, COR.suave);
    doc.text("PRONTUÁRIO DO PACIENTE", M + L, 13, { align: "right" });
    fonte("bold", 11, COR.grafite);
    doc.text(limpo(p.nome), M + L, 19, { align: "right" });
    doc.setDrawColor(...COR.bege); doc.setLineWidth(0.6); doc.line(M, 29, M + L, 29);
  }
  function novaPagina() { doc.addPage(); cabecalho(); y = TOPO; }
  function espaco(h) { if (y + h > BASE) novaPagina(); }

  // reserva: espaço mínimo para o conteúdo logo abaixo (evita título sozinho no pé da página)
  function titulo(fino, forte, roxo = false, reserva = 30) {
    espaco(16 + reserva);
    y += 2;
    fonte("normal", 15, roxo ? COR.ameixa : COR.grafite);
    const t1 = limpo(fino ? fino + " " : "");
    const w1 = doc.getTextWidth(t1);
    doc.text(t1, M, y + 5);
    fonte("bold", 15, roxo ? COR.ameixa : COR.grafite);
    doc.text(limpo(forte), M + w1, y + 5);
    y += 11;
  }
  function pilula(texto) {
    espaco(12);
    fonte("bold", 9.5, [255, 255, 255]);
    const w = doc.getTextWidth(limpo(texto)) + 6;
    doc.setFillColor(...COR.dourado); doc.roundedRect(M, y, w, 6.5, 1.5, 1.5, "F");
    doc.text(limpo(texto), M + 3, y + 4.6);
    y += 10;
  }
  // Tabela rótulo | valor (com quebra de página)
  function pares(lista, larguraRotulo = 58) {
    for (const [r, v] of lista) {
      fonte("bold", 9); const lr = doc.splitTextToSize(limpo(r), larguraRotulo - 3);
      fonte("normal", 9.5); const lv = doc.splitTextToSize(limpo(v), L - larguraRotulo);
      const h = Math.max(lr.length * alturaLinha(9), lv.length * alturaLinha(9.5)) + 2.2;
      espaco(h);
      fonte("bold", 9, COR.grafite); doc.text(lr, M, y + 3.4);
      fonte("normal", 9.5, COR.texto); doc.text(lv, M + larguraRotulo, y + 3.4);
      doc.setDrawColor(...COR.linha); doc.setLineWidth(0.2); doc.line(M, y + h, M + L, y + h);
      y += h;
    }
  }
  function paragrafo(texto, tam = 10, c = COR.grafite, estilo = "normal") {
    fonte(estilo, tam, c);
    const linhas = doc.splitTextToSize(limpo(texto), L);
    for (const ln of linhas) { espaco(alturaLinha(tam) + 0.6); doc.text(ln, M, y + alturaLinha(tam)); y += alturaLinha(tam) + 0.6; }
    y += 1.5;
  }
  function painelIdentificacao() {
    const anos = idade(p.data_nascimento);
    const linhas = [
      ["Nome", p.nome],
      ["Idade", p.data_nascimento ? `${anos} anos (${dataBR(p.data_nascimento)})` : ""],
      ["Sexo", p.sexo || ""],
      ["Endereço", p.endereco || ""],
      ["Telefone", p.telefone || ""],
      ["Responsável/Cuidador", [p.responsavel, p.responsavel_telefone].filter(Boolean).join(" · ")],
      ["CPF", p.cpf || ""],
    ];
    const h = linhas.length * 7.2 + 6;
    espaco(h + 4);
    doc.setFillColor(...COR.bege); doc.roundedRect(M, y, L, h, 4, 4, "F");
    let yy = y + 4;
    for (const [r, v] of linhas) {
      fonte("normal", 10, COR.grafite); doc.text(r, M + 6, yy + 4.5);
      const w = doc.getTextWidth(r + "  ");
      fonte("bold", 10, COR.grafite); doc.text(doc.splitTextToSize(limpo(v), L - 14 - w)[0] || "", M + 6 + w, yy + 4.5);
      doc.setDrawColor(...COR.borda); doc.setLineWidth(0.3); doc.line(M + 6, yy + 6.2, M + L - 6, yy + 6.2);
      yy += 7.2;
    }
    y += h + 5;
  }
  function mapa(marcas) {
    if (!marcas || !marcas.length) return;
    const larguras = { corpo: L * 0.5, perna: L * 0.16, "pe-lateral": L * 0.13, "pe-plantar": L * 0.16 };
    const alturas = FIGURAS_CORPO.map((f) => (figuras[f.id] ? (larguras[f.id] * figuras[f.id].h) / figuras[f.id].w : 0));
    const h = Math.max(...alturas) + 4;
    espaco(h);
    let x = M;
    FIGURAS_CORPO.forEach((f, i) => {
      const img = figuras[f.id];
      if (!img) return;
      const w = larguras[f.id], hh = alturas[i], top = y + (h - 4 - hh);
      doc.addImage(img.dados, img.formato, x, top, w, hh);
      marcas.forEach((m, n) => {
        if (m.f !== f.id) return;
        const cx = x + m.x * w, cy = top + m.y * hh;
        doc.setFillColor(...COR.ameixa); doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.4); doc.circle(cx, cy, 2.2, "FD");
        fonte("bold", 7, [255, 255, 255]); doc.text(String(n + 1), cx, cy + 0.9, { align: "center" });
      });
      x += w + 3;
    });
    y += h + 2;
  }
  function tabelaPlano(d) {
    const linhas = PLANO_CUIDADOS.colunas[0][0].campos.filter((c) => d[c.id]);
    if (!linhas.length) { paragrafo("Plano de cuidados não preenchido.", 9.5, COR.suave, "italic"); return; }
    const wr = 55;
    for (const c of linhas) {
      fonte("normal", 9.5); const lv = doc.splitTextToSize(limpo(d[c.id]), L - wr - 6);
      fonte("bold", 8); const lr = doc.splitTextToSize(limpo(c.rotulo.toUpperCase()), wr - 6);
      const h = Math.max(lv.length * alturaLinha(9.5), lr.length * alturaLinha(8)) + 5;
      espaco(h);
      doc.setDrawColor(...COR.dourado); doc.setLineWidth(0.4); doc.rect(M, y, wr, h); doc.rect(M + wr, y, L - wr, h);
      fonte("bold", 8, COR.ameixa); doc.text(lr, M + wr / 2, y + h / 2 - ((lr.length - 1) * alturaLinha(8)) / 2 + 1, { align: "center" });
      fonte("normal", 9.5, COR.grafite); doc.text(lv, M + wr + 3, y + 4.2);
      y += h;
    }
    y += 3;
  }
  function assinatura(data, quem) {
    espaco(10);
    fonte("normal", 8.5, COR.grafite);
    doc.text(limpo(`DATA: ${dataBR(data)}     ASSINATURA / CARIMBO: ${carimbo(quem)}`), M + L / 2, y + 5, { align: "center" });
    y += 10;
  }
  async function fotos(lista) {
    if (!lista.length || !imagem) return;
    const col = 3, gap = 4, w = (L - gap * (col - 1)) / col, hMax = 48;
    let i = 0;
    while (i < lista.length) {
      const linha = [];
      for (let k = 0; k < col && i < lista.length; k++, i++) {
        try {
          const b = await imagem(lista[i]);
          if (b) linha.push({ a: lista[i], img: await blobParaImagem(b, 1000) });
        } catch (e) { /* foto que não abriu fica de fora */ }
      }
      if (!linha.length) continue;
      const hs = linha.map(({ img }) => Math.min(hMax, (w * img.h) / img.w));
      const h = Math.max(...hs) + 6;
      espaco(h);
      linha.forEach(({ a, img }, k) => {
        const hh = hs[k], ww = (hh * img.w) / img.h, x = M + k * (w + gap) + (w - ww) / 2;
        doc.addImage(img.dados, img.formato, x, y, ww, hh);
        fonte("normal", 7.5, COR.suave); doc.text(dataBR(a.data), M + k * (w + gap) + w / 2, y + hh + 3.5, { align: "center" });
      });
      y += h;
    }
    y += 2;
  }

  // ---------- Montagem ----------
  cabecalho();
  painelIdentificacao();
  const pdAlerta = [];
  const ultimaAdm = admissoes[admissoes.length - 1];
  if (ultimaAdm) {
    const d = ultimaAdm.dados;
    if (d.alergias === "Sim") pdAlerta.push("Alergia: " + (d.alergias_quais || "sim"));
    (d.medicamentos_atencao || []).forEach((m) => pdAlerta.push(m));
    (d.doencas_quais || []).forEach((m) => pdAlerta.push(m));
  }
  if (pdAlerta.length) paragrafo("Atenção: " + pdAlerta.join(" · "), 9.5, COR.ameixa, "bold");
  if (lesoes.length) {
    pilula("Lesões");
    pares(lesoes.map((l) => [l.nome, [l.etiologia, l.inicio ? "desde " + dataBR(l.inicio) : null, l.situacao].filter(Boolean).join(" · ")]));
    y += 3;
  }

  const episodios = admissoes.length ? admissoes : [null];
  // Sessão sem ligação gravada: vai para o último episódio que começou antes dela
  const episodioDe = (ev) => {
    if (ev.admissao_id && admissoes.some((a) => a.id === ev.admissao_id)) return ev.admissao_id;
    const dia = String(ev.data).slice(0, 10);
    const antes = admissoes.filter((a) => a.data <= dia);
    return (antes.length ? antes[antes.length - 1] : admissoes[0]).id;
  };
  for (let e = 0; e < episodios.length; e++) {
    const adm = episodios[e];
    informar(`PDF: episódio ${e + 1} de ${episodios.length}`);
    if (adm) {
      if (e > 0 || y > 200) novaPagina();
      pilula((adm.tipo === "readmissão" ? "Readmissão de " : "Admissão de ") + dataBR(adm.data) + (adm.alta_em ? " · alta em " + dataBR(adm.alta_em) + (adm.alta_motivo ? " (" + adm.alta_motivo + ")" : "") : " · em tratamento"));
      titulo(...ANAMNESE.titulo);
      const r1 = respostas(ANAMNESE, adm.dados);
      r1.length ? pares(r1) : paragrafo("Anamnese não preenchida.", 9.5, COR.suave, "italic");
      assinatura(adm.data, adm.criado_por);

      titulo(...AVALIACAO.titulo, false, adm.dados.lesao_mapa ? 80 : 30);
      mapa(adm.dados.lesao_mapa);
      pares(respostas(AVALIACAO, adm.dados));
      const pu = calcularPush(adm.dados);
      if (pu && pu.total != null) paragrafo(`PUSH ${pu.total} (área ${numeroBR(pu.area, 2)} cm²)`, 10, COR.ameixa, "bold");

      if (temPeDiabetico(adm.dados)) {
        titulo(...PE_DIABETICO.titulo, true);
        pares(respostas(PE_DIABETICO, adm.dados));
        resumoPe(adm.dados);
      }
      titulo(...PLANO_CUIDADOS.titulo, true);
      tabelaPlano(adm.dados);
      assinatura(adm.data, adm.criado_por);
    }

    // Sessões deste episódio (ou todas, se não houver admissão)
    const doEpisodio = evolucoes.filter((ev) => !adm || episodioDe(ev) === adm.id);
    if (!doEpisodio.length) continue;
    novaPagina();
    titulo("CONTROLE DE", "SESSÕES");
    for (const ev of doEpisodio) {
      const puS = calcularPush(ev.avaliacao);
      espaco(16);
      doc.setFillColor(...COR.begeClaro); doc.rect(M, y, L, 7, "F");
      fonte("bold", 9.5, COR.grafite);
      doc.text(limpo(dataHoraBR(ev.data)), M + 2, y + 4.8);
      fonte("normal", 9, COR.texto);
      doc.text(limpo([ev.tipo, nomeLesao[ev.lesao_id], ev.local_atendimento].filter(Boolean).join(" · ")), M + 36, y + 4.8);
      if (puS && puS.total != null) { fonte("bold", 9, COR.ameixa); doc.text("PUSH " + puS.total, M + L - 2, y + 4.8, { align: "right" }); }
      y += 9.5;
      paragrafo(ev.descricao, 10);
      const extra = [];
      if (ev.conduta) extra.push(["Conduta", ev.conduta]);
      const area = areaLesao(ev.avaliacao);
      if (area != null) extra.push(["Medidas", `${numeroBR(ev.avaliacao.lesao_comprimento, 2)} × ${numeroBR(ev.avaliacao.lesao_largura, 2)} cm (${numeroBR(area, 2)} cm²)`]);
      const av = respostas(AVALIACAO, ev.avaliacao, [...OMITIR_NA_EVOLUCAO, "lesao_comprimento", "lesao_largura", "lesao_local"]);
      if (av.length) extra.push(["Avaliação", av.map(([r, v]) => `${r}: ${v}`).join("; ")]);
      if (temPeDiabetico(ev.avaliacao)) extra.push(["Pé diabético", textoResumoPeDiabetico(calcularPeDiabetico(ev.avaliacao))]);
      const mats = (ev.evolucao_materiais || []).map((m) => `${numeroBR(m.quantidade, 2)} ${m.materiais ? m.materiais.unidade + " " + m.materiais.nome : ""}`).join(", ");
      if (mats) extra.push(["Materiais", mats]);
      if (ev.proximo_atendimento) extra.push(["Próximo atendimento", dataBR(ev.proximo_atendimento)]);
      if (extra.length) pares(extra, 40);
      await fotos(arquivos.filter((a) => a.evolucao_id === ev.id && (a.tipo_mime || "").startsWith("image/")));
      fonte("italic", 8, COR.suave);
      espaco(6); doc.text(limpo(carimbo(ev.criado_por)), M + L, y + 2, { align: "right" }); y += 7;
    }
  }

  // Cicatrização
  const comMedida = evolucoes.filter((ev) => calcularPush(ev.avaliacao));
  if (comMedida.length) {
    novaPagina();
    titulo("", "CICATRIZAÇÃO");
    const grupos = [...lesoes.map((l) => ({ id: l.id, nome: l.nome })), { id: null, nome: "Sem lesão definida" }];
    for (const g of grupos) {
      const lista = comMedida.filter((ev) => (ev.lesao_id || null) === g.id);
      if (!lista.length) continue;
      pilula(g.nome);
      const cols = [["Data", 30], ["C × L (cm)", 34], ["Área (cm²)", 28], ["Exsudato", 26], ["Tecido", 26], ["PUSH", 36]];
      espaco(8);
      doc.setFillColor(...COR.douradoCab); doc.rect(M, y, L, 7, "F");
      let x = M; fonte("bold", 8.5, [255, 255, 255]);
      cols.forEach(([t, w]) => { doc.text(t.toUpperCase(), x + 2, y + 4.8); x += w; });
      y += 7;
      for (const ev of lista) {
        const pu = calcularPush(ev.avaliacao);
        espaco(7);
        const vals = [dataBR(ev.data), `${numeroBR(ev.avaliacao.lesao_comprimento, 1)} × ${numeroBR(ev.avaliacao.lesao_largura, 1)}`, numeroBR(pu.area, 2),
          pu.pEx == null ? "—" : String(pu.pEx), pu.pTec == null ? "—" : String(pu.pTec), pu.total == null ? "—" : String(pu.total)];
        x = M; fonte("normal", 9.5, COR.grafite);
        cols.forEach(([, w], k) => { if (k === 5) fonte("bold", 9.5, COR.ameixa); doc.text(limpo(vals[k]), x + 2, y + 4.8); x += w; });
        doc.setDrawColor(...COR.linha); doc.setLineWidth(0.2); doc.line(M, y + 7, M + L, y + 7);
        y += 7;
      }
      y += 5;
    }
    paragrafo("Escala PUSH 3.0: área (0 a 10) + exsudato (0 a 3) + tecido (0 a 4) = 0 a 17. Quanto menor, mais perto da cicatrização.", 8, COR.suave);
  }

  const outros = arquivos.filter((a) => a.categoria !== "lesao");
  if (outros.length) {
    espaco(30);
    y += 3;
    pilula("Exames e documentos anexados");
    pares(outros.map((a) => [dataBR(a.data), a.legenda || a.nome_original || "arquivo"]), 30);
  }
  if (!imagem) paragrafo("Este PDF foi gerado sem as fotos. As fotos estão no backup completo e no sistema.", 8.5, COR.suave, "italic");

  // Rodapé de todas as páginas
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COR.bege); doc.setLineWidth(0.4); doc.line(M, 286, M + L, 286);
    fonte("normal", 7.5, COR.suave);
    doc.text(limpo(`Véras Vasconcelos Medicina e Saúde · CNPJ 62.304.982/0001-62 · gerado em ${dataHoraBR(new Date().toISOString())}${geradoPor ? " por " + geradoPor : ""}`), M, 290);
    doc.text(`página ${i} de ${total}`, M + L, 290, { align: "right" });
  }
  return doc.output("blob");

  function resumoPe(d) {
    const r = calcularPeDiabetico(d);
    const itens = [
      ["Perda da sensibilidade protetora", r.psp == null ? "—" : r.psp ? "sim" : "não"],
      ["Doença arterial periférica", r.dap == null ? "—" : r.dap ? "sim" : "não"],
      ["Categoria de risco IWGDF", r.risco ? `${r.risco.cat} (${r.risco.nome}) · rastreio ${r.risco.intervalo}` : "—"],
      ["Infecção IWGDF/IDSA", r.infeccao ? `grau ${r.infeccao.rotulo} (${r.infeccao.nome})` : "—"],
      ["SINBAD", `${r.sinbad.total}/6 · ` + r.sinbad.itens.map((i) => `${i[0]} ${i[2] == null ? "?" : i[2]}`).join(" · ")],
    ];
    if (r.wifi) itens.push(["WIfI", r.wifi]);
    pilula("Resultado (IWGDF 2023)");
    pares(itens);
  }
}
