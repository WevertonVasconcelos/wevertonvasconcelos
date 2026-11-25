// Backup: baixa tudo (dados + fotos + prontuário legível de cada paciente) num arquivo .zip.
import { sb, q, sessao, baixarArquivo } from "../banco.js";
import { h, criarZip, baixar, avisar, mensagemErro, nomeArquivoSeguro, hojeISO, dataHoraBR } from "../util.js";
import { htmlProntuario, buscarDadosProntuario, separarPorPaciente } from "../relatorio.js";
import { cabecalho, quadro } from "./componentes.js";
import * as pastaMac from "../pasta.js";
import { FIGURAS_CORPO } from "../campos.js";
import { gerarPdfProntuario } from "../pdf.js";

const CHAVE = "prontuario.ultimoBackup";
const DIAS_LEMBRETE = 7;

function ultimoBackup() {
  try { return localStorage.getItem(CHAVE); } catch (e) { return null; }
}

export function lembreteBackup() {
  const u = ultimoBackup();
  const dias = u ? (Date.now() - new Date(u).getTime()) / 86400000 : Infinity;
  if (dias > DIAS_LEMBRETE) {
    setTimeout(() => avisar(u ? `Último backup neste aparelho há ${Math.floor(dias)} dias. Faça um em “Backup”.` : "Nenhum backup feito neste aparelho ainda. Veja o menu “Backup”.", "info"), 1500);
  }
}

export async function telaBackup(tela) {
  const progresso = h("p", { class: "progresso", role: "status" });
  const barra = h("progress", { max: 100, value: 0, hidden: true });
  const u = ultimoBackup();

  async function fazer(comArquivos) {
    botoes.forEach((b) => (b.disabled = true));
    barra.hidden = false;
    barra.value = 0;
    try {
      const blob = await gerarBackup(comArquivos, (texto, pct) => { progresso.textContent = texto; if (pct != null) barra.value = pct; });
      const nome = `prontuario-backup-${hojeISO()}${comArquivos ? "" : "-so-dados"}.zip`;
      baixar(blob, nome);
      try { localStorage.setItem(CHAVE, new Date().toISOString()); } catch (e) { /* ok */ }
      progresso.textContent = `Pronto: ${nome} (${(blob.size / 1048576).toFixed(1).replace(".", ",")} MB). Confira na pasta Downloads e mova para a pasta de backup.`;
      barra.value = 100;
    } catch (e) {
      progresso.textContent = "Não foi possível terminar o backup: " + mensagemErro(e);
    } finally {
      botoes.forEach((b) => (b.disabled = false));
    }
  }

  const botoes = [
    h("button", { type: "button", class: "botao botao-primario", onclick: () => fazer(true) }, "Baixar backup completo (com fotos)"),
    h("button", { type: "button", class: "botao botao-secundario", onclick: () => fazer(false) }, "Baixar só os dados (rápido)"),
  ];

  tela.append(
    cabecalho({ titulo: ["CÓPIA DE", "SEGURANÇA"] }),
    await quadroPastaMac(),
    quadro("Fazer backup",
      h("p", null, u ? "Último backup neste aparelho: " + dataHoraBR(u) : "Nenhum backup feito neste aparelho ainda."),
      h("div", { class: "pilha-botoes" }, botoes),
      barra,
      progresso,
    ),
    quadro("O que vem no arquivo",
      h("ul", null,
        h("li", null, "Uma pasta por paciente com o ", h("b", null, "prontuario.pdf"), " (prontuário completo em páginas, com as fotos), o ", h("b", null, "prontuario.html"), " (abre em qualquer navegador, mesmo sem internet) e todas as fotos e exames."),
        h("li", null, "A pasta ", h("b", null, "dados"), " com tudo em formato JSON (para restaurar ou migrar) e planilhas CSV do financeiro."),
      ),
    ),
    quadro("Rotina sugerida",
      h("ol", null,
        h("li", null, "Uma vez por semana, no Mac, faça o backup completo."),
        h("li", null, "Mova o .zip para uma pasta do ", h("b", null, "Google Drive para computador"), " (ou iCloud Drive). Assim fica no Mac ", h("i", null, "e"), " na nuvem."),
        h("li", null, "Guarde os backups antigos por pelo menos alguns meses. Prontuário precisa ser guardado por muitos anos."),
      ),
      h("p", { class: "texto-suave pequeno" }, "O arquivo tem dados de saúde dos pacientes. Não envie por WhatsApp nem e-mail, e use senha no computador."),
    ),
  );
}

async function gerarBackup(comArquivos, informar) {
  informar("Buscando os registros…", 2);
  const tudo = await buscarDadosProntuario(sb, q, null);
  const extra = async (tabela) => tudo.todasAsLinhas(() => sb.from(tabela).select("*").order("criado_em").order("id"));
  const [materiais, planos, pagamentos, equipe, historico] = await Promise.all([
    extra("materiais"), extra("planos"), extra("pagamentos"),
    q(sb.from("equipe").select("*")),
    tudo.todasAsLinhas(() => sb.from("historico").select("*").order("id")),
  ]);

  const arquivosZip = [];
  const json = (nome, dados) => arquivosZip.push({ nome: "dados/" + nome + ".json", dados: JSON.stringify(dados, null, 2) });
  const evolucoesSemMat = tudo.evolucoes.map(({ evolucao_materiais, ...resto }) => resto);
  const evolucaoMateriais = tudo.evolucoes.flatMap((e) => e.evolucao_materiais.map((m) => ({ evolucao_id: e.id, ...m, materiais: undefined })));
  json("pacientes", tudo.pacientes);
  json("admissoes", tudo.admissoes);
  json("lesoes", tudo.lesoes);
  json("evolucoes", evolucoesSemMat);
  json("evolucao_materiais", evolucaoMateriais);
  json("arquivos", tudo.arquivos);
  json("materiais", materiais);
  json("planos", planos);
  json("pagamentos", pagamentos);
  json("equipe", equipe);
  json("historico", historico);

  // Planilhas para abrir no Excel/Numbers/Google Planilhas
  const nomeP = Object.fromEntries(tudo.pacientes.map((p) => [p.id, p.nome]));
  const csv = (linhas) => "﻿" + linhas.map((l) => l.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  arquivosZip.push({ nome: "dados/pagamentos.csv", dados: csv([["Data", "Paciente", "Valor", "Forma", "Descrição"],
    ...pagamentos.map((p) => [p.data, nomeP[p.paciente_id], String(p.valor).replace(".", ","), p.forma, p.descricao])]) });
  arquivosZip.push({ nome: "dados/atendimentos.csv", dados: csv([["Data", "Paciente", "Tipo", "Local", "Custo de material"],
    ...tudo.evolucoes.map((e) => [e.data.slice(0, 10), nomeP[e.paciente_id], e.tipo, e.local_atendimento,
      e.evolucao_materiais.reduce((s, m) => s + m.quantidade * m.custo_unitario, 0).toFixed(2).replace(".", ",")])]) });

  // Logo e figuras do corpo, para o prontuário legível abrir sem internet
  for (const img of ["icones/logo.png", "fontes/Montserrat.woff2", ...FIGURAS_CORPO.map((f) => f.arquivo)]) {
    try {
      const r = await fetch(img);
      if (r.ok) arquivosZip.push({ nome: img, dados: new Uint8Array(await r.arrayBuffer()) });
    } catch (e) { /* sem a imagem, segue */ }
  }

  // Pasta por paciente
  const pastaDe = {};
  tudo.pacientes.forEach((p) => (pastaDe[p.id] = "pacientes/" + nomeArquivoSeguro(p.nome) + " - " + p.id.slice(0, 8)));
  const nomeNoZip = (a) => {
    const ext = (a.caminho.split(".").pop() || "bin").toLowerCase();
    const tipo = a.categoria === "lesao" ? "foto" : a.categoria;
    return `arquivos/${a.data}_${tipo}_${a.id.slice(0, 8)}.${ext}`;
  };
  for (const p of tudo.pacientes) {
    const dados = separarPorPaciente(tudo, p, equipe);
    const html = htmlProntuario(dados, { srcArquivo: nomeNoZip, base: "../../", geradoPor: sessao.membro && sessao.membro.nome });
    arquivosZip.push({ nome: pastaDe[p.id] + "/prontuario.html", dados: html });
  }

  const baixados = {};
  if (comArquivos) {
    const lista = tudo.arquivos;
    let feitos = 0;
    const falhas = [];
    const fila = lista.slice();
    async function trabalhador() {
      while (fila.length) {
        const a = fila.shift();
        try {
          const blob = await baixarArquivo(a.caminho);
          const bytes = new Uint8Array(await blob.arrayBuffer());
          baixados[a.caminho] = { bytes, tipo: a.tipo_mime };
          arquivosZip.push({ nome: pastaDe[a.paciente_id] + "/" + nomeNoZip(a), dados: bytes });
        } catch (e) {
          falhas.push(a.caminho);
        }
        feitos++;
        informar(`Baixando arquivos: ${feitos} de ${lista.length}…`, 5 + Math.round((feitos / Math.max(1, lista.length)) * 90));
      }
    }
    await Promise.all([trabalhador(), trabalhador(), trabalhador(), trabalhador()]);
    if (falhas.length) {
      arquivosZip.push({ nome: "ARQUIVOS-QUE-FALHARAM.txt", dados: "Estes arquivos não puderam ser baixados. Faça o backup de novo:\n" + falhas.join("\n") });
      avisar(`${falhas.length} arquivo(s) não foram baixados. Veja ARQUIVOS-QUE-FALHARAM.txt no backup.`, "erro");
    }
  }


  // PDF do prontuário de cada paciente (com as fotos, no backup completo)
  for (let i = 0; i < tudo.pacientes.length; i++) {
    const p = tudo.pacientes[i];
    informar(`Gerando PDF ${i + 1} de ${tudo.pacientes.length}: ${p.nome}`, 96);
    try {
      const pdf = await gerarPdfProntuario(separarPorPaciente(tudo, p, equipe), {
        imagem: comArquivos ? async (a) => (baixados[a.caminho] ? new Blob([baixados[a.caminho].bytes], { type: baixados[a.caminho].tipo }) : null) : null,
        geradoPor: sessao.membro && sessao.membro.nome,
      });
      arquivosZip.push({ nome: pastaDe[p.id] + "/prontuario.pdf", dados: new Uint8Array(await pdf.arrayBuffer()) });
    } catch (e) {
      console.error("PDF não gerado", p.nome, e);
    }
  }

  arquivosZip.unshift({
    nome: "LEIA-ME.txt",
    dados: [
      "Backup do Prontuário Véras Vasconcelos",
      "Gerado em " + dataHoraBR(new Date().toISOString()) + (sessao.membro ? " por " + sessao.membro.nome : ""),
      "",
      "pacientes/  -> uma pasta por paciente: prontuario.pdf (para imprimir ou enviar),",
      "               prontuario.html (abre no navegador) e as fotos e exames.",
      "dados/      -> todos os registros em JSON (para restaurar) e planilhas CSV.",
      comArquivos ? "" : "ATENÇÃO: este backup é só dos dados, sem fotos e exames.",
      "",
      "Contém dados de saúde (LGPD). Guarde em local protegido por senha.",
    ].join("\r\n"),
  });
  informar("Montando o arquivo .zip…", 97);
  return criarZip(arquivosZip);
}

// ---------- Pasta do prontuário no Mac ----------
async function quadroPastaMac() {
  const estado = h("p");
  const progresso = h("p", { class: "progresso", role: "status" });
  const caixa = quadro("Pasta dos pacientes no Mac (e no Drive)");
  if (!pastaMac.suportado) {
    caixa.append(
      h("p", null, "Este navegador não consegue gravar numa pasta do computador. No Mac, abra o prontuário pelo ", h("b", null, "Google Chrome"), " (ou Edge) para usar esta função."),
      h("p", { class: "texto-suave pequeno" }, "No celular use normalmente: as fotos e dados ficam no banco e vão para a pasta na próxima vez que o prontuário for aberto no Chrome do Mac."));
    return caixa;
  }
  const botaoEscolher = h("button", { type: "button", class: "botao botao-secundario" }, "Escolher pasta");
  const botaoAtualizar = h("button", { type: "button", class: "botao botao-primario" }, "Atualizar pasta agora");
  async function mostrar() {
    const pasta = await pastaMac.pastaEscolhida();
    const ult = await pastaMac.ultimaSincronizacao();
    botaoAtualizar.hidden = !pasta;
    botaoEscolher.textContent = pasta ? "Trocar pasta" : "Escolher pasta";
    estado.replaceChildren(pasta
      ? h("span", null, "Pasta escolhida: ", h("b", null, pasta.name), ult ? " · última atualização " + dataHoraBR(ult) : " · ainda não atualizada")
      : h("span", null, "Nenhuma pasta escolhida neste computador."));
  }
  async function atualizar() {
    const pasta = await pastaMac.pastaEscolhida();
    if (!pasta) return;
    if ((await pastaMac.permissao(pasta, true)) !== "granted") { progresso.textContent = "Sem permissão para gravar na pasta. Toque de novo e escolha “Permitir”."; return; }
    botaoAtualizar.disabled = botaoEscolher.disabled = true;
    try {
      const r = await pastaMac.sincronizar(pasta, null, (t) => (progresso.textContent = t));
      progresso.textContent = `Pronto: ${r.pacientes} paciente(s) atualizados, ${r.novos} arquivo(s) novo(s).`;
    } catch (e) {
      progresso.textContent = "Não foi possível atualizar: " + mensagemErro(e);
    } finally {
      botaoAtualizar.disabled = botaoEscolher.disabled = false;
      mostrar();
    }
  }
  botaoEscolher.addEventListener("click", async () => {
    try { await pastaMac.escolherPasta(); await mostrar(); await atualizar(); }
    catch (e) { if (e.name !== "AbortError") progresso.textContent = mensagemErro(e); }
  });
  botaoAtualizar.addEventListener("click", atualizar);
  await mostrar();
  caixa.append(
    h("p", null, "Cada paciente ganha uma pasta própria (", h("b", null, "Pacientes / Nome - código"), ") com o prontuário completo em ", h("b", null, "prontuario.html"),
      ", as fotos e os exames. Ela é atualizada sozinha quando você salva um paciente, uma admissão ou uma sessão neste computador."),
    h("p", null, h("b", null, "Dica: "), "escolha uma pasta dentro do ", h("b", null, "Google Drive"), " no Mac (app Google Drive para computador). Assim tudo fica no Mac e no Drive ao mesmo tempo."),
    estado,
    h("div", { class: "pilha-botoes" }, botaoEscolher, botaoAtualizar),
    progresso,
  );
  return caixa;
}
