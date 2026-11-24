// Prontuário completo do paciente, pronto para imprimir ou salvar em PDF.
import { sb, q, sessao, urlsAssinadas } from "../banco.js";
import { h } from "../util.js";
import { htmlProntuario, buscarDadosProntuario, separarPorPaciente } from "../relatorio.js";
import { cabecalho } from "./componentes.js";

export async function telaImprimir(tela, pacienteId) {
  const tudo = await buscarDadosProntuario(sb, q, pacienteId);
  const paciente = tudo.pacientes[0];
  const dados = separarPorPaciente(tudo, paciente, sessao.equipe);
  const urls = await urlsAssinadas(dados.arquivos.map((a) => a.caminho));
  const html = htmlProntuario(dados, {
    srcArquivo: (a) => urls[a.caminho] || "",
    base: new URL("./", location.href).href,
    geradoPor: sessao.membro && sessao.membro.nome,
  });
  const quadro = h("iframe", { class: "quadro-impressao", title: "Prontuário para impressão", srcdoc: html });
  tela.append(
    cabecalho({
      voltar: ["#/paciente/" + pacienteId, paciente.nome],
      subtitulo: "Para PDF: toque em Imprimir e escolha “Salvar como PDF”.",
      titulo: ["IMPRIMIR", "PRONTUÁRIO"],
      acoes: h("button", { type: "button", class: "botao botao-primario", onclick: () => quadro.contentWindow.print() }, "Imprimir"),
    }),
    quadro,
  );
}
