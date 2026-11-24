// Início do app: login, menu e troca de telas.
import { sb, configurado, cfg, sessao, paraEmail, definirLembrar, lembrar, carregarEquipe } from "./banco.js";
import { $, h, avisar, mensagemErro, confirmar, edicao } from "./util.js";
import { telaPacientes, telaPacienteEditar } from "./telas/pacientes.js";
import { telaPaciente } from "./telas/paciente.js";
import { telaAdmissao } from "./telas/admissao.js";
import { telaEvolucao } from "./telas/evolucao.js";
import { telaMateriais } from "./telas/materiais.js";
import { telaFinanceiro } from "./telas/financeiro.js";
import { telaBackup, lembreteBackup } from "./telas/backup.js";
import { telaImprimir } from "./telas/imprimir.js";

const telas = {
  config: $("#tela-config"),
  login: $("#tela-login"),
  app: $("#tela-app"),
  semEquipe: $("#tela-sem-equipe"),
};
function mostrar(nome) {
  Object.entries(telas).forEach(([k, el]) => (el.hidden = k !== nome));
}

// ---------- Rotas ----------
const rotas = [
  [/^#\/pacientes$/, telaPacientes, "pacientes"],
  [/^#\/paciente\/novo$/, telaPacienteEditar, "pacientes"],
  [/^#\/paciente\/([\w-]+)\/editar$/, telaPacienteEditar, "pacientes"],
  [/^#\/paciente\/([\w-]+)\/admissao(?:\/([\w-]+))?$/, telaAdmissao, "pacientes"],
  [/^#\/paciente\/([\w-]+)\/evolucao\/nova$/, telaEvolucao, "pacientes"],
  [/^#\/paciente\/([\w-]+)\/imprimir$/, telaImprimir, "pacientes"],
  [/^#\/paciente\/([\w-]+)(?:\/(\w+))?$/, telaPaciente, "pacientes"],
  [/^#\/evolucao\/([\w-]+)$/, (m, id) => telaEvolucao(m, null, id), "pacientes"],
  [/^#\/materiais$/, telaMateriais, "materiais"],
  [/^#\/financeiro$/, telaFinanceiro, "financeiro"],
  [/^#\/backup$/, telaBackup, "backup"],
];

// Formulário com alterações não salvas: pergunta antes de sair
let hashAtual = location.hash;
let renderizando = 0;

async function rotear() {
  if (edicao.suja && location.hash !== hashAtual) {
    if (!window.confirm("Há alterações não salvas. Sair mesmo assim?")) {
      history.replaceState(null, "", hashAtual);
      return;
    }
  }
  edicao.suja = false;
  hashAtual = location.hash;
  if (!location.hash || location.hash === "#" || location.hash === "#/") {
    location.replace("#/pacientes");
    return;
  }
  const main = $("#conteudo");
  const minha = ++renderizando;
  for (const [re, fn, menu] of rotas) {
    const m = re.exec(location.hash);
    if (!m) continue;
    document.querySelectorAll("[data-menu]").forEach((a) => a.classList.toggle("ativo", a.dataset.menu === menu));
    main.replaceChildren(h("div", { class: "carregando" }, "Carregando…"));
    window.scrollTo(0, 0);
    try {
      const corpo = h("div", { class: "tela" });
      await fn(corpo, ...m.slice(1));
      if (minha === renderizando) main.replaceChildren(corpo);
    } catch (erro) {
      console.error(erro);
      if (minha === renderizando)
        main.replaceChildren(h("div", { class: "cartao erro-tela" },
          h("h2", null, "Não deu para abrir esta tela"),
          h("p", null, mensagemErro(erro)),
          h("button", { class: "botao botao-secundario", onclick: rotear }, "Tentar de novo"),
        ));
    }
    return;
  }
  main.replaceChildren(h("div", { class: "cartao" }, h("p", null, "Página não encontrada. "), h("a", { href: "#/pacientes" }, "Ir para pacientes")));
}

window.addEventListener("hashchange", rotear);
window.addEventListener("beforeunload", (e) => {
  if (edicao.suja) { e.preventDefault(); e.returnValue = ""; }
});

// ---------- Login ----------
async function entrar(session) {
  sessao.usuario = session.user;
  try {
    const membro = await carregarEquipe();
    if (!membro) {
      $("#sem-equipe-email").textContent = session.user.email;
      mostrar("semEquipe");
      return;
    }
  } catch (erro) {
    avisar(mensagemErro(erro), "erro");
    mostrar("login");
    return;
  }
  $("#topo-usuario").textContent = sessao.membro.nome;
  mostrar("app");
  iniciarInatividade();
  rotear();
  lembreteBackup();
}

$("#form-login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const u = $("#login-usuario").value, s = $("#login-senha").value;
  const erroEl = $("#login-erro"), botao = $("#login-botao");
  erroEl.hidden = true;
  if (!u.trim() || !s) { erroEl.textContent = "Preencha usuário e senha."; erroEl.hidden = false; return; }
  botao.disabled = true;
  botao.textContent = "Entrando…";
  definirLembrar($("#login-lembrar").checked);
  try {
    const r = await sb.auth.signInWithPassword({ email: paraEmail(u), password: s });
    if (r.error) throw r.error;
    $("#login-senha").value = "";
    await entrar(r.data.session);
  } catch (erro) {
    definirLembrar(false);
    let msg = mensagemErro(erro);
    if (/Invalid login credentials/i.test(msg)) msg = "Usuário ou senha incorretos.";
    erroEl.textContent = msg;
    erroEl.hidden = false;
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});

export async function sair(todos = false) {
  if (edicao.suja && !(await confirmar("Há alterações não salvas. Sair mesmo assim?", { sim: "Sair" }))) return;
  edicao.suja = false;
  try { await sb.auth.signOut({ scope: todos ? "global" : "local" }); } catch (e) { /* ok */ }
  definirLembrar(false);
  sessao.usuario = null;
  sessao.membro = null;
  $("#conteudo").replaceChildren();
  history.replaceState(null, "", "#/pacientes");
  hashAtual = location.hash;
  mostrar("login");
}

$("#botao-sair").addEventListener("click", () => sair(false));
$("#botao-sair-2").addEventListener("click", () => sair(false));
$("#botao-sair-todos").addEventListener("click", async () => {
  if (await confirmar("Encerrar a sessão em todos os aparelhos (celular, computadores)?", { sim: "Sair de todos" })) sair(true);
});
$("#botao-trocar-senha").addEventListener("click", async () => {
  const nova = window.prompt("Nova senha (mínimo 8 caracteres):");
  if (nova == null) return;
  if (nova.length < 8) { avisar("A senha precisa ter pelo menos 8 caracteres.", "erro"); return; }
  const r = await sb.auth.updateUser({ password: nova });
  avisar(r.error ? mensagemErro(r.error) : "Senha trocada.", r.error ? "erro" : "ok");
});

// ---------- Sai sozinho depois de um tempo parado ----------
let ultimaAtividade = Date.now();
let timerInatividade = null;
function iniciarInatividade() {
  clearInterval(timerInatividade);
  if (lembrar()) return;
  const limite = (cfg.MINUTOS_INATIVIDADE || 30) * 60000;
  timerInatividade = setInterval(() => {
    if (sessao.usuario && Date.now() - ultimaAtividade > limite) {
      edicao.suja = false;
      sair(false);
      avisar("Você saiu por inatividade.");
    }
  }, 30000);
}
["click", "keydown", "touchstart", "scroll"].forEach((ev) =>
  window.addEventListener(ev, () => (ultimaAtividade = Date.now()), { passive: true }),
);

// ---------- Começo ----------
async function iniciar() {
  if (!configurado) { mostrar("config"); return; }
  const r = await sb.auth.getSession();
  if (r.data && r.data.session) await entrar(r.data.session);
  else mostrar("login");
  sb.auth.onAuthStateChange((evento) => {
    if (evento === "SIGNED_OUT" && sessao.usuario) {
      sessao.usuario = null;
      mostrar("login");
    }
  });
}
iniciar();

// App instalável (funciona como aplicativo no celular)
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
