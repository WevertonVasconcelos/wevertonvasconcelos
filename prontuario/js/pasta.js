// Pasta do prontuário no Mac (e, se ela estiver dentro do Google Drive, na nuvem também).
// Usa o recurso do Google Chrome/Edge que deixa o site gravar numa pasta escolhida por você.
// Cada paciente ganha a pasta  Pacientes/<Nome> - <código>/  com:
//   prontuario.pdf (para imprimir/enviar), prontuario.html (abre sem internet),
//   arquivos/ (fotos e exames) e dados.json
import { sb, q, sessao, baixarArquivo } from "./banco.js";
import { nomeArquivoSeguro, avisar } from "./util.js";
import { FIGURAS_CORPO } from "./campos.js";
import { htmlProntuario, buscarDadosProntuario, separarPorPaciente } from "./relatorio.js";
import { gerarPdfProntuario } from "./pdf.js";

export const suportado = typeof window !== "undefined" && "showDirectoryPicker" in window;

// ---------- Guarda a pasta escolhida (só neste navegador) ----------
function bancoLocal() {
  return new Promise((ok, falha) => {
    const r = indexedDB.open("prontuario-local", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("coisas");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
}
async function guardar(chave, valor) {
  const db = await bancoLocal();
  await new Promise((ok, falha) => { const t = db.transaction("coisas", "readwrite"); t.objectStore("coisas").put(valor, chave); t.oncomplete = ok; t.onerror = () => falha(t.error); });
}
async function ler(chave) {
  try {
    const db = await bancoLocal();
    return await new Promise((ok) => { const r = db.transaction("coisas").objectStore("coisas").get(chave); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); });
  } catch (e) { return null; }
}

export async function pastaEscolhida() {
  return suportado ? await ler("pasta") : null;
}
export async function escolherPasta() {
  const pasta = await window.showDirectoryPicker({ id: "prontuario", mode: "readwrite" });
  await guardar("pasta", pasta);
  return pasta;
}
// "granted" = pode gravar; "prompt" = precisa de um clique para liberar
export async function permissao(pasta, pedir = false) {
  if (!pasta) return "sem-pasta";
  const opc = { mode: "readwrite" };
  let st = await pasta.queryPermission(opc);
  if (st !== "granted" && pedir) st = await pasta.requestPermission(opc);
  return st;
}
export async function ultimaSincronizacao() { return await ler("ultima-sinc"); }

// ---------- Gravação ----------
async function subpasta(raiz, caminho) {
  let p = raiz;
  for (const parte of caminho.split("/").filter(Boolean)) p = await p.getDirectoryHandle(parte, { create: true });
  return p;
}
async function existe(dir, nome) {
  try { await dir.getFileHandle(nome); return true; } catch (e) { return false; }
}
async function gravar(raiz, caminho, conteudo) {
  const partes = caminho.split("/");
  const nome = partes.pop();
  const dir = await subpasta(raiz, partes.join("/"));
  const arq = await dir.getFileHandle(nome, { create: true });
  const w = await arq.createWritable();
  await w.write(conteudo);
  await w.close();
}

export const pastaDoPaciente = (p) => "Pacientes/" + nomeArquivoSeguro(p.nome) + " - " + p.id.slice(0, 8);
export function nomeDoArquivo(a) {
  const ext = (a.caminho.split(".").pop() || "bin").toLowerCase();
  const tipo = a.categoria === "lesao" ? "foto" : a.categoria;
  return `arquivos/${a.data}_${tipo}_${a.id.slice(0, 8)}.${ext}`;
}

// Atualiza a pasta de um paciente (pacienteId) ou de todos (null)
export async function sincronizar(pasta, pacienteId = null, informar = () => {}) {
  informar("Buscando os registros…");
  const tudo = await buscarDadosProntuario(sb, q, pacienteId);
  const equipe = sessao.equipe;

  // Logo, figuras e fonte (para o prontuario.html abrir certinho)
  for (const rec of ["icones/logo.png", "fontes/Montserrat.woff2", ...FIGURAS_CORPO.map((f) => f.arquivo)]) {
    const partes = rec.split("/");
    const dir = await subpasta(pasta, partes.slice(0, -1).join("/"));
    if (await existe(dir, partes[partes.length - 1])) continue;
    try { const r = await fetch(rec); if (r.ok) await gravar(pasta, rec, await r.blob()); } catch (e) { /* segue */ }
  }

  let novos = 0;
  for (let i = 0; i < tudo.pacientes.length; i++) {
    const p = tudo.pacientes[i];
    informar(`Paciente ${i + 1} de ${tudo.pacientes.length}: ${p.nome}`);
    const base = pastaDoPaciente(p);
    const dados = separarPorPaciente(tudo, p, equipe);
    // "Impressão digital" do paciente: se nada mudou desde a última vez, não refaz o PDF
    const marca = JSON.stringify([p.atualizado_em, ...["admissoes", "lesoes", "evolucoes", "arquivos"].map((k) =>
      dados[k].length + ":" + dados[k].reduce((m, x) => (x.atualizado_em > m ? x.atualizado_em : m), ""))]);
    const dirPac = await subpasta(pasta, base);
    const igual = (await ler("marca-" + p.id)) === marca && (await existe(dirPac, "prontuario.pdf"));
    const html = htmlProntuario(dados, { srcArquivo: nomeDoArquivo, base: "../../", geradoPor: sessao.membro && sessao.membro.nome });
    await gravar(pasta, base + "/prontuario.html", html);
    await gravar(pasta, base + "/dados.json", JSON.stringify(dados, null, 2));
    if (p.pasta_link) await gravar(pasta, base + "/link-da-pasta.txt", p.pasta_link);
    const dirArq = await subpasta(pasta, base + "/arquivos");
    for (const a of dados.arquivos) {
      const nome = nomeDoArquivo(a).split("/").pop();
      if (await existe(dirArq, nome)) continue; // fotos não mudam: só baixa as novas
      try {
        const blob = await baixarArquivo(a.caminho);
        await gravar(pasta, base + "/arquivos/" + nome, blob);
        novos++;
      } catch (e) { console.error("arquivo não baixado", a.caminho, e); }
    }
    // PDF do prontuário, com as fotos que já estão na pasta
    if (!igual) try {
      informar(`Gerando PDF: ${p.nome}`);
      const pdf = await gerarPdfProntuario(dados, {
        imagem: async (a) => { try { return await (await dirArq.getFileHandle(nomeDoArquivo(a).split("/").pop())).getFile(); } catch (e) { return null; } },
        geradoPor: sessao.membro && sessao.membro.nome,
      });
      await gravar(pasta, base + "/prontuario.pdf", pdf);
      await guardar("marca-" + p.id, marca);
    } catch (e) { console.error("PDF não gerado", p.nome, e); }
  }
  await guardar("ultima-sinc", new Date().toISOString());
  return { pacientes: tudo.pacientes.length, novos };
}

// Chamado depois de salvar paciente/admissão/sessão: atualiza a pasta daquele
// paciente em segundo plano, se a pasta já estiver liberada neste navegador.
export async function sincronizarPacienteSePuder(pacienteId) {
  try {
    const pasta = await pastaEscolhida();
    if (!pasta || (await permissao(pasta)) !== "granted") return;
    await sincronizar(pasta, pacienteId);
  } catch (e) {
    console.error(e);
  }
}

// Ao entrar: se a pasta está liberada, atualiza tudo em segundo plano
export async function sincronizarAoEntrar() {
  try {
    const pasta = await pastaEscolhida();
    if (!pasta) return;
    if ((await permissao(pasta)) !== "granted") {
      setTimeout(() => avisar("Para atualizar a pasta do Mac, abra “Backup” e toque em “Atualizar pasta agora”.", "info"), 2500);
      return;
    }
    const r = await sincronizar(pasta, null);
    if (r.novos) avisar(`Pasta do Mac atualizada (${r.novos} arquivo(s) novo(s)).`);
  } catch (e) { console.error(e); }
}
