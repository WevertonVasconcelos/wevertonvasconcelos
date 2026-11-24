// Prontuário completo do paciente, pronto para imprimir ou salvar em PDF.
import { sb, q, sessao, urlsAssinadas } from "../banco.js";
import { h } from "../util.js";
import { htmlProntuario, buscarDadosProntuario, separarPorPaciente } from "../relatorio.js";

export async function telaImprimir(tela, pacienteId) {
  const tudo = await buscarDadosProntuario(sb, q, pacienteId);
  const paciente = tudo.pacientes[0];
  const dados = separarPorPaciente(tudo, paciente, sessao.equipe);
  const urls = await urlsAssinadas(dados.arquivos.map((a) => a.caminho));
  const html = htmlProntuario(dados, {
    srcArquivo: (a) => urls[a.caminho] || "",
    logo: new URL("icones/logo.jpg", location.href).href,
    geradoPor: sessao.membro && sessao.membro.nome,
  });
  const quadro = h("iframe", { class: "quadro-impressao", title: "Prontuário para impressão", srcdoc: html });
  tela.append(
    h("div", { class: "cabecalho-tela" },
      h("div", null,
        h("a", { href: "#/paciente/" + pacienteId, class: "voltar" }, "‹ " + paciente.nome),
        h("h1", null, "Prontuário para impressão"),
        h("p", { class: "texto-suave" }, "Para PDF: toque em Imprimir e escolha “Salvar como PDF” (no iPhone, abra com dois dedos a prévia e compartilhe)."),
      ),
      h("button", { type: "button", class: "botao botao-primario", onclick: () => quadro.contentWindow.print() }, "🖨 Imprimir"),
    ),
    quadro,
  );
}
