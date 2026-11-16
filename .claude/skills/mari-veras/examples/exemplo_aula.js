/**
 * Exemplo completo: abertura de uma aula do curso de bordas com todos os tipos de slide.
 * Rodar numa pasta com pptxgenjs instalado:  node exemplo_aula.js [foto_da_mari.jpg] [saida.pptx]
 * O conteúdo clínico é ILUSTRATIVO: em aula real, vem das fontes do curso e passa pela Mari.
 */
const path = require("path");
const mv = require(path.join(__dirname, "..", "assets", "mvslides.js"));

(async () => {
  const foto = process.argv[2] || null;
  const saida = process.argv[3] || "exemplo_aula.pptx";
  const d = mv.novo({ curso: "Bordas da Ferida" });

  mv.capaCurso(d, { titulo: "Bordas da ferida: o que a borda comunica", sub: "Curso para técnicos e enfermeiros que cuidam de feridas em membros inferiores", foto });
  mv.capaModulo(d, { numero: 1, titulo: "Como a cicatrização acontece", sub: "Antes da cobertura, entenda o caminho" });
  mv.objetivos(d, { itens: ["Reconhecer as fases da **cicatrização**", "Saber por que a borda para de avançar", "Olhar ao redor antes de escolher a cobertura"] });
  mv.conteudo(d, { rotulo: "Conceito", titulo: "A borda comunica o erro", itens: ["A borda mostra se a ferida está avançando ou estacionada", "Pele ao redor também faz parte da avaliação", "Mudou a borda? **Reavalie** a conduta"] });
  mv.duasColunas(d, { titulo: "O que você vê × o que pode significar", esquerda: { titulo: "Na borda", itens: ["Pele grossa e endurecida", "Borda enrolada", "Pele branca e amolecida"] }, direita: { titulo: "Pode indicar [CONFERIR]", itens: ["Pressão ou atrito", "Epitelização parada", "Excesso de umidade"] } });
  mv.tabela(d, { titulo: "Sinais da borda", cabecalho: ["Sinal", "Como aparece", "Primeira pergunta"], linhas: [["Hiperqueratose", "Pele grossa", "Onde está a pressão?"], ["Epíbole", "Borda enrolada", "Por que parou de avançar?"], ["Maceração", "Pele branca, mole", "De onde vem a umidade?"]], larguras: [3.2, 4.2, 4.5] });
  mv.fluxo(d, { titulo: "Avaliação da borda em 4 passos", etapas: [{ titulo: "Olhar", texto: "Cor, espessura e contorno" }, { titulo: "Tocar", texto: "Aderida ou descolada?" }, { titulo: "Ao redor", texto: "Umidade, calor, pressão" }, { titulo: "Registrar", texto: "Foto padronizada e medida" }] });
  mv.alerta(d, { itens: ["Trocar a cobertura sem olhar a borda", "Ignorar a pele ao redor", "Não registrar a evolução"] });
  mv.caso(d, { titulo: "Ferida que não avançava", situacao: "Lesão em membro inferior, sem evolução há semanas, curativo diário em casa. [ILUSTRATIVO]", raciocinio: "Borda espessada indicava atrito contínuo no mesmo ponto.", conduta: "Ajuste do ponto de pressão e reavaliação da borda a cada troca." });
  mv.frase(d, { frase: "Olhar ao redor, perceber os detalhes: isso vale para a ferida e vale para a vida.", autor: "Mari Véras" });
  mv.resumo(d, { pontos: ["A borda mostra se a ferida avança", "Avaliação inclui a pele ao redor", "Registrar é parte do cuidado"], tarefa: "Escolha um paciente e descreva a borda da ferida dele em 3 linhas antes da próxima aula." });
  mv.final(d, { chamada: "Nos vemos na próxima aula." });

  await mv.salvar(d, saida);
  console.log("OK", saida);
})();
