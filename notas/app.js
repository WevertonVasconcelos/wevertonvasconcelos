(function () {
  "use strict";

  var cfg = window.NOTAS_CONFIG || {};
  var BUCKET = "anexos";
  var LIMITE_BYTES = 50 * 1024 * 1024;
  var CHAVE_LEMBRAR = "notas.lembrar";
  var ESPERA_SALVAR_MS = 700;

  function $(sel) { return document.querySelector(sel); }

  var el = {
    telaConfig: $("#tela-config"),
    telaLogin: $("#tela-login"),
    telaApp: $("#tela-app"),
    formLogin: $("#form-login"),
    loginUsuario: $("#login-usuario"),
    loginSenha: $("#login-senha"),
    loginLembrar: $("#login-lembrar"),
    loginErro: $("#login-erro"),
    loginBotao: $("#login-botao"),
    topoUsuario: $("#topo-usuario"),
    botaoSair: $("#botao-sair"),
    botaoSairTodos: $("#botao-sair-todos"),
    botaoTrocarSenha: $("#botao-trocar-senha"),
    menu: document.querySelector(".menu"),
    botaoNova: $("#botao-nova"),
    busca: $("#busca"),
    listaNotas: $("#lista-notas"),
    listaVazia: $("#lista-vazia"),
    editorVazio: $("#editor-vazio"),
    editorNota: $("#editor-nota"),
    botaoVoltar: $("#botao-voltar"),
    status: $("#status"),
    botaoCopiar: $("#botao-copiar"),
    botaoExcluir: $("#botao-excluir"),
    titulo: $("#nota-titulo"),
    conteudo: $("#nota-conteudo"),
    entradaArquivo: $("#entrada-arquivo"),
    listaAnexos: $("#lista-anexos"),
    aviso: $("#aviso"),
  };

  function mostrarTela(tela) {
    [el.telaConfig, el.telaLogin, el.telaApp].forEach(function (t) { t.hidden = t !== tela; });
  }

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
    mostrarTela(el.telaConfig);
    return;
  }

  // ---------- Onde a sessão fica guardada ----------
  // Sem "manter conectado": sessionStorage (some ao fechar o navegador).
  // Com "manter conectado": localStorage (continua depois de fechar).
  function lembrar() {
    try { return localStorage.getItem(CHAVE_LEMBRAR) === "1"; } catch (e) { return false; }
  }
  function definirLembrar(valor) {
    try {
      if (valor) localStorage.setItem(CHAVE_LEMBRAR, "1");
      else localStorage.removeItem(CHAVE_LEMBRAR);
    } catch (e) { /* sem armazenamento: segue só na memória */ }
  }
  var memoria = {};
  var armazenamentoSessao = {
    getItem: function (k) {
      try {
        var v = sessionStorage.getItem(k);
        if (v === null && lembrar()) v = localStorage.getItem(k);
        return v !== null ? v : (k in memoria ? memoria[k] : null);
      } catch (e) { return k in memoria ? memoria[k] : null; }
    },
    setItem: function (k, v) {
      memoria[k] = v;
      try { (lembrar() ? localStorage : sessionStorage).setItem(k, v); } catch (e) { /* ignora */ }
    },
    removeItem: function (k) {
      delete memoria[k];
      try { sessionStorage.removeItem(k); } catch (e) { /* ignora */ }
      try { localStorage.removeItem(k); } catch (e) { /* ignora */ }
    },
  };

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      storage: armazenamentoSessao,
      storageKey: "notas-sessao",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  // ---------- Estado ----------
  var usuario = null;      // { id, email }
  var notas = [];          // [{ id, titulo, conteudo, atualizado_em }]
  var atualId = null;
  var pendentes = {};      // id -> { titulo?, conteudo? } ainda não salvos
  var timerSalvar = null;
  var salvando = false;
  var salvarDeNovo = false;
  var ultimaAtividade = Date.now();

  // ---------- Utilidades ----------
  var timerAviso = null;
  function avisar(texto) {
    el.aviso.textContent = texto;
    el.aviso.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () { el.aviso.hidden = true; }, 3200);
  }

  function hora(d) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  function dataCurta(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    var hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return hora(d);
    var ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
    if (d.toDateString() === ontem.toDateString()) return "ontem";
    var opcoes = { day: "2-digit", month: "2-digit" };
    if (d.getFullYear() !== hoje.getFullYear()) opcoes.year = "2-digit";
    return d.toLocaleDateString("pt-BR", opcoes);
  }
  function tamanho(bytes) {
    if (bytes == null) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
  }
  function semAcentos(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  // O armazenamento do Supabase só aceita nomes simples
  function nomeSeguro(nome) {
    var limpo = semAcentos(nome || "arquivo").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+/, "");
    if (!limpo) limpo = "arquivo";
    if (limpo.length > 100) {
      var ponto = limpo.lastIndexOf(".");
      var ext = ponto > 0 && limpo.length - ponto <= 10 ? limpo.slice(ponto) : "";
      limpo = limpo.slice(0, 100 - ext.length) + ext;
    }
    return limpo;
  }
  function nomeExibido(nomeArmazenado) {
    return nomeArmazenado.replace(/^\d{10,}-/, "");
  }
  function mensagemErro(erro) {
    var msg = (erro && (erro.message || erro.error_description)) || String(erro || "");
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(msg)) {
      return "Sem conexão com o servidor. Verifique a internet (ou se a rede do hospital bloqueia o site).";
    }
    return msg || "Erro desconhecido.";
  }
  function notaAtual() {
    for (var i = 0; i < notas.length; i++) if (notas[i].id === atualId) return notas[i];
    return null;
  }
  function existePendente() {
    return Object.keys(pendentes).length > 0;
  }

  // ---------- Login ----------
  function paraEmail(texto) {
    var t = texto.trim().toLowerCase();
    if (t.indexOf("@") >= 0) return t;
    return t + "@" + (cfg.DOMINIO_USUARIO || "notas.app");
  }

  el.formLogin.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var u = el.loginUsuario.value;
    var s = el.loginSenha.value;
    el.loginErro.hidden = true;
    if (!u.trim() || !s) {
      el.loginErro.textContent = "Preencha usuário e senha.";
      el.loginErro.hidden = false;
      return;
    }
    el.loginBotao.disabled = true;
    el.loginBotao.textContent = "Entrando…";
    definirLembrar(el.loginLembrar.checked);
    try {
      var r = await sb.auth.signInWithPassword({ email: paraEmail(u), password: s });
      if (r.error) throw r.error;
      el.loginSenha.value = "";
      await entrar(r.data.session);
    } catch (erro) {
      definirLembrar(false);
      var msg = mensagemErro(erro);
      if (/Invalid login credentials/i.test(msg)) msg = "Usuário ou senha incorretos.";
      el.loginErro.textContent = msg;
      el.loginErro.hidden = false;
    } finally {
      el.loginBotao.disabled = false;
      el.loginBotao.textContent = "Entrar";
    }
  });

  async function entrar(sessao) {
    usuario = { id: sessao.user.id, email: sessao.user.email || "" };
    el.topoUsuario.textContent = usuario.email.split("@")[0];
    ultimaAtividade = Date.now();
    mostrarTela(el.telaApp);
    await carregarNotas();
    if (window.matchMedia("(min-width: 761px)").matches && notas.length) abrirNota(notas[0].id);
  }

  function limparTela() {
    usuario = null;
    notas = [];
    atualId = null;
    pendentes = {};
    clearTimeout(timerSalvar);
    el.titulo.value = "";
    el.conteudo.value = "";
    el.listaNotas.textContent = "";
    el.listaAnexos.textContent = "";
    el.busca.value = "";
    el.editorNota.hidden = true;
    el.editorVazio.hidden = false;
    el.telaApp.classList.remove("mostrando-nota");
  }

  async function sair(global, motivo) {
    if (el.menu) el.menu.open = false;
    if (existePendente()) await salvarAgora();
    try { await sb.auth.signOut({ scope: global ? "global" : "local" }); } catch (e) { /* segue */ }
    armazenamentoSessao.removeItem("notas-sessao");
    definirLembrar(false);
    limparTela();
    el.loginUsuario.value = "";
    el.loginSenha.value = "";
    el.loginLembrar.checked = false;
    mostrarTela(el.telaLogin);
    if (motivo) avisar(motivo);
  }

  el.botaoSair.addEventListener("click", function () { sair(false); });
  el.botaoSairTodos.addEventListener("click", function () {
    if (confirm("Desconectar este e todos os outros aparelhos (celular, computadores do hospital…)?")) {
      sair(true, "Desconectado de todos os aparelhos.");
    }
  });

  el.botaoTrocarSenha.addEventListener("click", async function () {
    if (el.menu) el.menu.open = false;
    var nova = prompt("Nova senha (mínimo 8 caracteres):");
    if (nova === null) return;
    if (nova.length < 8) { alert("A senha precisa ter pelo menos 8 caracteres."); return; }
    var repetir = prompt("Digite a nova senha de novo:");
    if (repetir === null) return;
    if (repetir !== nova) { alert("As senhas não são iguais. Nada foi alterado."); return; }
    var r = await sb.auth.updateUser({ password: nova });
    if (r.error) alert("Não consegui trocar a senha: " + mensagemErro(r.error));
    else avisar("Senha alterada.");
  });

  // Sai sozinho depois de um tempo parado (quando não marcou "manter conectado")
  ["pointerdown", "keydown", "touchstart", "scroll", "mousemove"].forEach(function (evt) {
    window.addEventListener(evt, function () { ultimaAtividade = Date.now(); }, { passive: true, capture: true });
  });
  setInterval(function () {
    var minutos = Number(cfg.MINUTOS_INATIVIDADE) || 0;
    if (!usuario || lembrar() || minutos <= 0) return;
    if (Date.now() - ultimaAtividade > minutos * 60 * 1000) {
      sair(false, "Você foi desconectado por inatividade.");
    }
  }, 20 * 1000);

  // ---------- Notas: lista ----------
  async function carregarNotas() {
    var r = await sb.from("notas")
      .select("id, titulo, conteudo, atualizado_em")
      .order("atualizado_em", { ascending: false });
    if (r.error) {
      avisar("Não consegui carregar as notas: " + mensagemErro(r.error));
      return false;
    }
    // Mantém o que ainda não foi salvo
    notas = r.data.map(function (n) {
      var p = pendentes[n.id];
      if (p) {
        if (p.titulo !== undefined) n.titulo = p.titulo;
        if (p.conteudo !== undefined) n.conteudo = p.conteudo;
      }
      return n;
    });
    renderLista();
    return true;
  }

  function renderLista() {
    var termo = semAcentos(el.busca.value.trim().toLowerCase());
    var ordenadas = notas.slice().sort(function (a, b) {
      return (b.atualizado_em || "").localeCompare(a.atualizado_em || "");
    });
    var visiveis = ordenadas.filter(function (n) {
      if (!termo) return true;
      return semAcentos(((n.titulo || "") + "\n" + (n.conteudo || "")).toLowerCase()).indexOf(termo) >= 0;
    });

    el.listaNotas.textContent = "";
    visiveis.forEach(function (n) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.id = n.id;
      if (n.id === atualId) b.setAttribute("aria-current", "true");

      var t = document.createElement("span");
      t.className = "item-titulo";
      t.textContent = n.titulo || "Sem título";

      var linha = document.createElement("span");
      linha.className = "item-linha";
      var d = document.createElement("span");
      d.className = "item-data";
      d.textContent = dataCurta(n.atualizado_em);
      var tr = document.createElement("span");
      tr.className = "item-trecho";
      tr.textContent = (n.conteudo || "").replace(/\s+/g, " ").trim().slice(0, 80);
      linha.appendChild(d);
      linha.appendChild(tr);

      b.appendChild(t);
      b.appendChild(linha);
      b.addEventListener("click", function () { abrirNota(n.id); });
      li.appendChild(b);
      el.listaNotas.appendChild(li);
    });

    el.listaVazia.hidden = visiveis.length > 0;
    el.listaVazia.textContent = notas.length ? "Nenhuma nota encontrada." : "Nenhuma nota ainda. Toque em “+ Nova nota”.";
  }

  el.busca.addEventListener("input", renderLista);

  el.botaoNova.addEventListener("click", async function () {
    el.botaoNova.disabled = true;
    try {
      var r = await sb.from("notas")
        .insert({ titulo: "Nova nota", conteudo: "" })
        .select("id, titulo, conteudo, atualizado_em")
        .single();
      if (r.error) throw r.error;
      notas.unshift(r.data);
      el.busca.value = "";
      abrirNota(r.data.id);
      el.titulo.focus();
      el.titulo.select();
    } catch (erro) {
      avisar("Não consegui criar a nota: " + mensagemErro(erro));
    } finally {
      el.botaoNova.disabled = false;
    }
  });

  // ---------- Notas: editor ----------
  function abrirNota(id) {
    if (existePendente()) salvarAgora();
    atualId = id;
    var n = notaAtual();
    if (!n) return;
    el.titulo.value = n.titulo || "";
    el.conteudo.value = n.conteudo || "";
    el.editorVazio.hidden = true;
    el.editorNota.hidden = false;
    el.telaApp.classList.add("mostrando-nota");
    mostrarStatus(pendentes[id] ? "salvando" : "", n.atualizado_em);
    renderLista();
    carregarAnexos();
    var editor = document.querySelector(".editor");
    if (editor) editor.scrollTop = 0;
  }

  function fecharNota() {
    if (existePendente()) salvarAgora();
    atualId = null;
    el.editorNota.hidden = true;
    el.editorVazio.hidden = false;
    el.telaApp.classList.remove("mostrando-nota");
    renderLista();
  }

  el.botaoVoltar.addEventListener("click", fecharNota);

  function mostrarStatus(estado, iso) {
    el.status.classList.toggle("erro", estado === "erro");
    if (estado === "salvando") el.status.textContent = "Salvando…";
    else if (estado === "erro") el.status.textContent = "Não salvou — tentando de novo…";
    else if (estado === "salvo") el.status.textContent = "Salvo às " + hora(new Date());
    else el.status.textContent = iso ? "Editado " + (dataCurta(iso).indexOf(":") > 0 ? "às " : "em ") + dataCurta(iso) : "";
  }

  function marcarAlteracao(campo, valor) {
    var n = notaAtual();
    if (!n) return;
    n[campo] = valor;
    n.atualizado_em = new Date().toISOString();
    pendentes[n.id] = pendentes[n.id] || {};
    pendentes[n.id][campo] = valor;
    mostrarStatus("salvando");
    clearTimeout(timerSalvar);
    timerSalvar = setTimeout(salvarAgora, ESPERA_SALVAR_MS);
  }

  el.titulo.addEventListener("input", function () {
    marcarAlteracao("titulo", el.titulo.value);
    renderLista();
  });
  el.titulo.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") { ev.preventDefault(); el.conteudo.focus(); }
  });
  el.titulo.addEventListener("blur", function () {
    if (!el.titulo.value.trim()) {
      el.titulo.value = "Sem título";
      marcarAlteracao("titulo", "Sem título");
      renderLista();
    }
  });
  el.conteudo.addEventListener("input", function () {
    marcarAlteracao("conteudo", el.conteudo.value);
  });

  async function salvarAgora() {
    clearTimeout(timerSalvar);
    if (salvando) { salvarDeNovo = true; return; }
    if (!existePendente()) return;

    salvando = true;
    var lote = pendentes;
    pendentes = {};
    var falhou = false;

    var ids = Object.keys(lote);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var campos = lote[id];
      var r = await sb.from("notas").update(campos).eq("id", id).select("atualizado_em");
      if (r.error) {
        falhou = true;
        // devolve para a fila sem apagar alterações mais novas
        var novo = pendentes[id] || {};
        pendentes[id] = Object.assign({}, campos, novo);
      } else if (r.data && r.data.length) {
        var n = notas.filter(function (x) { return x.id === id; })[0];
        if (n && !pendentes[id]) n.atualizado_em = r.data[0].atualizado_em;
      }
    }

    salvando = false;
    if (falhou) {
      mostrarStatus("erro");
      timerSalvar = setTimeout(salvarAgora, 4000);
    } else if (salvarDeNovo || existePendente()) {
      salvarDeNovo = false;
      mostrarStatus("salvando");
      timerSalvar = setTimeout(salvarAgora, ESPERA_SALVAR_MS);
    } else {
      mostrarStatus("salvo");
    }
  }

  window.addEventListener("beforeunload", function (ev) {
    if (existePendente() || salvando) {
      salvarAgora();
      ev.preventDefault();
      ev.returnValue = "";
    }
  });

  // Ao voltar para a aba: salva o que falta e busca novidades
  // (ex.: escreveu no celular e abriu a aba que já estava aberta no PC)
  document.addEventListener("visibilitychange", function () {
    if (!usuario) return;
    if (document.visibilityState === "hidden") {
      if (existePendente()) salvarAgora();
    } else {
      sincronizar();
    }
  });

  async function sincronizar() {
    if (!usuario || existePendente() || salvando) return;
    var antes = notaAtual();
    var conteudoAntes = antes ? antes.conteudo : null;
    var tituloAntes = antes ? antes.titulo : null;
    var ok = await carregarNotas();
    if (!ok) return;
    if (atualId) {
      var n = notaAtual();
      if (!n) { fecharNota(); avisar("Esta nota foi excluída em outro aparelho."); return; }
      if (!pendentes[atualId] && (n.conteudo !== conteudoAntes || n.titulo !== tituloAntes)) {
        el.titulo.value = n.titulo;
        el.conteudo.value = n.conteudo;
        mostrarStatus("", n.atualizado_em);
      }
      carregarAnexos();
    }
  }

  el.botaoCopiar.addEventListener("click", async function () {
    var texto = el.conteudo.value;
    try {
      await navigator.clipboard.writeText(texto);
    } catch (e) {
      el.conteudo.focus();
      el.conteudo.select();
      try { document.execCommand("copy"); } catch (e2) { /* ignora */ }
    }
    avisar("Texto copiado.");
  });

  el.botaoExcluir.addEventListener("click", async function () {
    var n = notaAtual();
    if (!n) return;
    if (!confirm("Excluir a nota “" + (n.titulo || "Sem título") + "” e todos os anexos dela? Não dá para desfazer.")) return;
    el.botaoExcluir.disabled = true;
    try {
      delete pendentes[n.id];
      var pasta = usuario.id + "/" + n.id;
      var lista = await sb.storage.from(BUCKET).list(pasta, { limit: 1000 });
      if (lista.data && lista.data.length) {
        var caminhos = lista.data.map(function (a) { return pasta + "/" + a.name; });
        var rem = await sb.storage.from(BUCKET).remove(caminhos);
        if (rem.error) throw rem.error;
      }
      var r = await sb.from("notas").delete().eq("id", n.id);
      if (r.error) throw r.error;
      notas = notas.filter(function (x) { return x.id !== n.id; });
      fecharNota();
      avisar("Nota excluída.");
    } catch (erro) {
      avisar("Não consegui excluir: " + mensagemErro(erro));
    } finally {
      el.botaoExcluir.disabled = false;
    }
  });

  // ---------- Anexos ----------
  var enviando = []; // [{ notaId, nome }]

  function pastaDaNota(id) { return usuario.id + "/" + id; }

  async function carregarAnexos() {
    var id = atualId;
    if (!id || !usuario) return;
    var r = await sb.storage.from(BUCKET).list(pastaDaNota(id), {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (id !== atualId) return; // trocou de nota enquanto carregava
    if (r.error) {
      renderAnexos([], "Não consegui carregar os anexos.");
      return;
    }
    var arquivos = (r.data || []).filter(function (a) { return a.name && a.name.charAt(0) !== "." && a.id !== null; });
    renderAnexos(arquivos);
  }

  function renderAnexos(arquivos, mensagem) {
    el.listaAnexos.textContent = "";

    enviando.filter(function (e) { return e.notaId === atualId; }).forEach(function (e) {
      var li = document.createElement("li");
      li.className = "anexo anexo-enviando";
      var info = document.createElement("div");
      info.className = "anexo-abrir";
      var nome = document.createElement("span");
      nome.className = "anexo-nome";
      nome.textContent = e.nome;
      var sub = document.createElement("span");
      sub.className = "anexo-info";
      sub.textContent = "Enviando…";
      info.appendChild(nome);
      info.appendChild(sub);
      li.appendChild(info);
      el.listaAnexos.appendChild(li);
    });

    arquivos.forEach(function (a) {
      var caminho = pastaDaNota(atualId) + "/" + a.name;
      var exibido = nomeExibido(a.name);

      var li = document.createElement("li");
      li.className = "anexo";

      var abrir = document.createElement("button");
      abrir.type = "button";
      abrir.className = "anexo-abrir";
      abrir.title = "Abrir " + exibido;
      var nome = document.createElement("span");
      nome.className = "anexo-nome";
      nome.textContent = exibido;
      var sub = document.createElement("span");
      sub.className = "anexo-info";
      var tam = a.metadata && a.metadata.size;
      sub.textContent = [tamanho(tam), dataCurta(a.created_at)].filter(Boolean).join(" · ");
      abrir.appendChild(nome);
      abrir.appendChild(sub);
      abrir.addEventListener("click", function () { abrirAnexo(caminho); });

      var baixar = document.createElement("button");
      baixar.type = "button";
      baixar.className = "botao botao-contorno";
      baixar.textContent = "Baixar";
      baixar.addEventListener("click", function () { baixarAnexo(caminho, exibido); });

      var apagar = document.createElement("button");
      apagar.type = "button";
      apagar.className = "botao botao-perigo-texto";
      apagar.textContent = "Apagar";
      apagar.setAttribute("aria-label", "Apagar " + exibido);
      apagar.addEventListener("click", function () { apagarAnexo(caminho, exibido); });

      li.appendChild(abrir);
      li.appendChild(baixar);
      li.appendChild(apagar);
      el.listaAnexos.appendChild(li);
    });

    if (!el.listaAnexos.children.length) {
      var vazio = document.createElement("li");
      vazio.className = "anexos-vazio";
      vazio.textContent = mensagem || "Nenhum anexo nesta nota.";
      el.listaAnexos.appendChild(vazio);
    }
  }

  async function abrirAnexo(caminho) {
    // Abre a aba antes de esperar o servidor, para o navegador não bloquear
    var aba = window.open("", "_blank");
    var r = await sb.storage.from(BUCKET).createSignedUrl(caminho, 300);
    if (r.error) {
      if (aba) aba.close();
      avisar("Não consegui abrir: " + mensagemErro(r.error));
      return;
    }
    if (aba) aba.location.href = r.data.signedUrl;
    else window.location.href = r.data.signedUrl;
  }

  async function baixarAnexo(caminho, nome) {
    var r = await sb.storage.from(BUCKET).createSignedUrl(caminho, 300, { download: nome });
    if (r.error) {
      avisar("Não consegui baixar: " + mensagemErro(r.error));
      return;
    }
    var a = document.createElement("a");
    a.href = r.data.signedUrl;
    a.download = nome;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function apagarAnexo(caminho, nome) {
    if (!confirm("Apagar o anexo “" + nome + "”?")) return;
    var r = await sb.storage.from(BUCKET).remove([caminho]);
    if (r.error) {
      avisar("Não consegui apagar: " + mensagemErro(r.error));
      return;
    }
    avisar("Anexo apagado.");
    carregarAnexos();
  }

  el.entradaArquivo.addEventListener("change", async function () {
    var arquivos = Array.prototype.slice.call(el.entradaArquivo.files || []);
    el.entradaArquivo.value = "";
    var notaId = atualId;
    if (!notaId || !arquivos.length) return;

    var grandes = arquivos.filter(function (f) { return f.size > LIMITE_BYTES; });
    if (grandes.length) {
      alert("Estes arquivos passam de 50 MB e não serão enviados:\n\n" +
        grandes.map(function (f) { return "• " + f.name + " (" + tamanho(f.size) + ")"; }).join("\n"));
    }
    var validos = arquivos.filter(function (f) { return f.size <= LIMITE_BYTES; });
    var itens = validos.map(function (f) { return { notaId: notaId, nome: f.name, arquivo: f }; });
    enviando = enviando.concat(itens);
    carregarAnexos();

    var falhas = [];
    for (var i = 0; i < itens.length; i++) {
      var item = itens[i];
      var nome = Date.now() + "-" + nomeSeguro(item.arquivo.name);
      var r = await sb.storage.from(BUCKET).upload(pastaDaNota(notaId) + "/" + nome, item.arquivo, {
        contentType: item.arquivo.type || "application/octet-stream",
        upsert: false,
      });
      if (r.error) falhas.push(item.nome + ": " + mensagemErro(r.error));
      enviando = enviando.filter(function (e) { return e !== item; });
      if (notaId === atualId) carregarAnexos();
    }

    if (falhas.length) alert("Alguns arquivos não foram enviados:\n\n" + falhas.join("\n"));
    else if (itens.length) avisar(itens.length === 1 ? "Arquivo anexado." : itens.length + " arquivos anexados.");
  });

  // ---------- Início ----------
  sb.auth.onAuthStateChange(function (evento) {
    if (evento === "SIGNED_OUT" && usuario) {
      limparTela();
      mostrarTela(el.telaLogin);
    }
  });

  (async function iniciar() {
    var r = await sb.auth.getSession();
    var sessao = r.data && r.data.session;
    if (sessao) {
      await entrar(sessao);
    } else {
      mostrarTela(el.telaLogin);
      el.loginUsuario.focus();
    }
  })();
})();
