// Permite instalar o prontuário como aplicativo e abrir a tela mais rápido.
// Os DADOS dos pacientes nunca ficam guardados aqui: sempre vêm do Supabase.
// Ao mudar qualquer arquivo do site, aumente o número da VERSAO.
const VERSAO = "prontuario-v2";
const ARQUIVOS = [
  "./", "index.html", "style.css", "config.js", "manifest.webmanifest",
  "vendor/supabase.js",
  "js/app.js", "js/banco.js", "js/util.js", "js/campos.js", "js/formulario.js", "js/relatorio.js",
  "js/telas/pacientes.js", "js/telas/paciente.js", "js/telas/admissao.js", "js/telas/evolucao.js",
  "js/telas/materiais.js", "js/telas/financeiro.js", "js/telas/backup.js", "js/telas/imprimir.js",
  "js/telas/componentes.js",
  "fontes/Montserrat.woff2",
  "icones/logo.png", "icones/icone-192.png",
  "icones/corpo/corpo.png", "icones/corpo/perna.png", "icones/corpo/pe-lateral.png", "icones/corpo/pe-plantar.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Arquivos do próprio site: tenta a internet primeiro (sempre a versão nova)
// e usa a cópia guardada só se estiver sem conexão.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(VERSAO).then((c) => c.put(e.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))),
  );
});
