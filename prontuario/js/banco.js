// Conexão com o Supabase: login, leitura/gravação e arquivos.
import { reduzirImagem, ehImagem } from "./util.js";

export const cfg = window.PRONTUARIO_CONFIG || {};
export const BUCKET = "prontuario";
const CHAVE_LEMBRAR = "prontuario.lembrar";

export const configurado = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);

// ---------- Onde a sessão fica guardada ----------
// Sem "manter conectado": some ao fechar o navegador.
export function lembrar() {
  try { return localStorage.getItem(CHAVE_LEMBRAR) === "1"; } catch (e) { return false; }
}
export function definirLembrar(v) {
  try { v ? localStorage.setItem(CHAVE_LEMBRAR, "1") : localStorage.removeItem(CHAVE_LEMBRAR); } catch (e) { /* ok */ }
}
const memoria = {};
const armazenamento = {
  getItem(k) {
    try {
      let v = sessionStorage.getItem(k);
      if (v === null && lembrar()) v = localStorage.getItem(k);
      return v !== null ? v : k in memoria ? memoria[k] : null;
    } catch (e) { return k in memoria ? memoria[k] : null; }
  },
  setItem(k, v) {
    memoria[k] = v;
    try { (lembrar() ? localStorage : sessionStorage).setItem(k, v); } catch (e) { /* ok */ }
  },
  removeItem(k) {
    delete memoria[k];
    try { sessionStorage.removeItem(k); } catch (e) { /* ok */ }
    try { localStorage.removeItem(k); } catch (e) { /* ok */ }
  },
};

export const sb = configurado
  ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { storage: armazenamento, storageKey: "prontuario-sessao", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

export function paraEmail(texto) {
  const t = texto.trim().toLowerCase();
  return t.includes("@") ? t : t + "@" + (cfg.DOMINIO_USUARIO || "prontuario.app");
}

// Executa uma consulta e lança erro se der problema
export async function q(consulta) {
  const r = await consulta;
  if (r.error) throw r.error;
  return r.data;
}

// ---------- Equipe ----------
export const sessao = { usuario: null, membro: null, equipe: [] };

export async function carregarEquipe() {
  const lista = await q(sb.from("equipe").select("user_id, nome, registro"));
  sessao.equipe = lista;
  sessao.membro = lista.find((m) => m.user_id === sessao.usuario.id) || null;
  return sessao.membro;
}
export function nomeDe(userId) {
  const m = sessao.equipe.find((x) => x.user_id === userId);
  return m ? m.nome : "";
}

// ---------- Arquivos ----------
const cacheUrls = new Map(); // caminho -> { url, expira }

export async function urlsAssinadas(caminhos) {
  const agora = Date.now();
  const faltando = [...new Set(caminhos.filter((c) => c && !(cacheUrls.has(c) && cacheUrls.get(c).expira > agora)))];
  for (let i = 0; i < faltando.length; i += 100) {
    const lote = faltando.slice(i, i + 100);
    const r = await sb.storage.from(BUCKET).createSignedUrls(lote, 3600);
    if (r.error) throw r.error;
    r.data.forEach((d) => { if (d.signedUrl) cacheUrls.set(d.path, { url: d.signedUrl, expira: agora + 50 * 60000 }); });
  }
  const out = {};
  caminhos.forEach((c) => { if (c && cacheUrls.has(c)) out[c] = cacheUrls.get(c).url; });
  return out;
}

export async function baixarArquivo(caminho) {
  const r = await sb.storage.from(BUCKET).download(caminho);
  if (r.error) throw r.error;
  return r.data;
}

function extensao(nome, mime) {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(nome || "");
  if (m) return m[1].toLowerCase();
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

// Envia um arquivo (foto é reduzida e ganha miniatura) e registra na tabela "arquivos".
// info: { paciente_id, evolucao_id?, lesao_id?, categoria, legenda?, data? }
export async function enviarArquivo(arquivo, info) {
  const id = crypto.randomUUID();
  const base = `${info.paciente_id}/${id}`;
  let caminho, caminhoMini = null, tipo = arquivo.type || "application/octet-stream", corpo = arquivo;

  if (ehImagem(arquivo)) {
    corpo = await reduzirImagem(arquivo, 1600, 0.82);
    const mini = await reduzirImagem(arquivo, 420, 0.72);
    tipo = "image/jpeg";
    caminho = base + ".jpg";
    caminhoMini = base + "_mini.jpg";
    const rm = await sb.storage.from(BUCKET).upload(caminhoMini, mini, { contentType: "image/jpeg", upsert: false });
    if (rm.error) throw rm.error;
  } else {
    caminho = base + "." + extensao(arquivo.name, arquivo.type);
  }
  const r = await sb.storage.from(BUCKET).upload(caminho, corpo, { contentType: tipo, upsert: false });
  if (r.error) throw r.error;

  return await q(sb.from("arquivos").insert({
    id,
    paciente_id: info.paciente_id,
    evolucao_id: info.evolucao_id || null,
    lesao_id: info.lesao_id || null,
    categoria: info.categoria || "lesao",
    caminho,
    caminho_mini: caminhoMini,
    nome_original: arquivo.name || null,
    tipo_mime: tipo,
    tamanho: corpo.size,
    legenda: info.legenda || null,
    data: info.data || undefined,
  }).select().single());
}

export async function apagarArquivo(arq) {
  await q(sb.from("arquivos").delete().eq("id", arq.id));
  const caminhos = [arq.caminho, arq.caminho_mini].filter(Boolean);
  await sb.storage.from(BUCKET).remove(caminhos); // se falhar, o registro já saiu; o arquivo fica órfão (sem risco)
}
