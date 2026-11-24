// ============================================================
// CAMPOS DAS FICHAS
// Para acrescentar, tirar ou renomear uma pergunta, mexa só aqui.
// Não troque o "id" de um campo que já tem dados salvos: é por ele
// que o valor fica guardado. Para tirar um campo, apague a linha;
// os dados antigos continuam guardados no banco e no backup.
//
// Tipos: texto, area (texto grande), numero, data, opcao (lista),
//        radio (escolha única em botões), marcar (várias escolhas)
// largura: "meia" ou "terco" para ficar lado a lado; padrão é linha inteira
// ============================================================

export const AVALIACAO_LESAO = [
  { id: "lesao_local", rotulo: "Local da lesão", tipo: "texto", dica: "Ex.: pé direito, região plantar do hálux" },
  {
    id: "lesao_etiologia", rotulo: "Etiologia", tipo: "opcao", largura: "meia",
    opcoes: ["Pé diabético", "Úlcera venosa", "Úlcera arterial", "Úlcera mista", "Lesão por pressão",
      "Traumática", "Ferida cirúrgica", "Queimadura", "Outra"],
  },
  { id: "lesao_tempo", rotulo: "Tempo da lesão", tipo: "opcao", largura: "meia", opcoes: ["Aguda", "Crônica"] },
  { id: "lesao_comprimento", rotulo: "Comprimento", tipo: "numero", unidade: "cm", largura: "terco" },
  { id: "lesao_largura", rotulo: "Largura", tipo: "numero", unidade: "cm", largura: "terco" },
  { id: "lesao_profundidade", rotulo: "Profundidade", tipo: "numero", unidade: "cm", largura: "terco" },
  {
    id: "lesao_classificacao", rotulo: "Classificação", tipo: "opcao", largura: "meia",
    opcoes: ["Limpa", "Potencialmente contaminada", "Contaminada", "Infectada"],
  },
  { id: "lesao_dor", rotulo: "Dor (0 a 10)", tipo: "numero", min: 0, max: 10, largura: "meia" },
  {
    id: "lesao_dor_tipo", rotulo: "Característica da dor", tipo: "marcar",
    opcoes: ["Local", "Ocasional", "Produzida (na troca)", "Contínua"],
  },
  { id: "lesao_tecido_granulacao", rotulo: "Granulação", tipo: "numero", unidade: "%", largura: "terco" },
  { id: "lesao_tecido_esfacelo", rotulo: "Esfacelo", tipo: "numero", unidade: "%", largura: "terco" },
  { id: "lesao_tecido_necrose", rotulo: "Necrose", tipo: "numero", unidade: "%", largura: "terco" },
  {
    id: "lesao_tecido", rotulo: "Tecidos presentes", tipo: "marcar",
    opcoes: ["Epitelização", "Granulação", "Esfacelo", "Necrose seca", "Necrose úmida", "Osso", "Tendão", "Músculo"],
  },
  {
    id: "lesao_exsudato", rotulo: "Exsudato (quantidade)", tipo: "opcao", largura: "meia",
    opcoes: ["Ausente", "Pouco", "Moderado", "Abundante"],
  },
  {
    id: "lesao_exsudato_tipo", rotulo: "Exsudato (aspecto)", tipo: "opcao", largura: "meia",
    opcoes: ["Seroso", "Sanguinolento", "Serossanguinolento", "Seropurulento", "Purulento"],
  },
  { id: "lesao_odor", rotulo: "Odor", tipo: "opcao", largura: "meia", opcoes: ["Ausente", "Leve", "Fétido"] },
  {
    id: "lesao_bordas", rotulo: "Bordas", tipo: "marcar",
    opcoes: ["Íntegra", "Plana", "Irregular", "Macerada", "Epíbole", "Hiperqueratose", "Descolada", "Edema"],
  },
  {
    id: "lesao_perilesao", rotulo: "Perilesão", tipo: "marcar",
    opcoes: ["Íntegra", "Edema", "Eritema", "Calor", "Maceração", "Ressecamento", "Escoriação", "Hiperpigmentação"],
  },
  {
    id: "lesao_infeccao", rotulo: "Sinais de infecção", tipo: "marcar",
    opcoes: ["Nenhum", "Dor aumentada", "Eritema que se espalha", "Calor local", "Edema", "Odor novo",
      "Aumento do exsudato", "Febre"],
  },
];

export const ADMISSAO = [
  {
    titulo: "Queixa e história",
    campos: [
      { id: "queixa_principal", rotulo: "Queixa principal", tipo: "area" },
      { id: "historia_lesao", rotulo: "História da lesão", tipo: "area", dica: "Como e quando começou, o que já foi feito, onde já tratou" },
    ],
  },
  {
    titulo: "Comorbidades",
    campos: [
      {
        id: "comorbidades", rotulo: "Doenças", tipo: "marcar",
        opcoes: ["Diabetes tipo 1", "Diabetes tipo 2", "Hipertensão", "Insuficiência venosa", "Doença arterial periférica",
          "Neuropatia", "Insuficiência cardíaca", "Doença renal crônica", "Doença autoimune", "Câncer",
          "Obesidade", "AVC prévio", "Amputação prévia"],
      },
      { id: "comorbidades_outras", rotulo: "Outras doenças / detalhes", tipo: "area" },
    ],
  },
  {
    titulo: "Medicações e alergias",
    campos: [
      { id: "medicacoes", rotulo: "Medicações em uso", tipo: "area", dica: "Uma por linha, com dose se souber" },
      {
        id: "medicacoes_atencao", rotulo: "Atenção", tipo: "marcar",
        opcoes: ["Anticoagulante", "Antiagregante", "Corticoide", "Imunossupressor", "Insulina", "Antibiótico atual"],
      },
      { id: "alergias", rotulo: "Alergias", tipo: "radio", opcoes: ["Não", "Sim", "Não sabe"], largura: "meia" },
      { id: "alergias_quais", rotulo: "Quais alergias", tipo: "texto", largura: "meia" },
      { id: "historico_cirurgico", rotulo: "Cirurgias / internamentos recentes", tipo: "area" },
    ],
  },
  {
    titulo: "Hábitos, mobilidade e dispositivos",
    campos: [
      { id: "habitos", rotulo: "Hábitos", tipo: "marcar", opcoes: ["Tabagismo", "Etilismo", "Sedentarismo", "Pratica atividade física"] },
      { id: "sono", rotulo: "Sono", tipo: "radio", opcoes: ["Bom", "Regular", "Ruim"], largura: "meia" },
      { id: "alimentacao", rotulo: "Alimentação / hidratação", tipo: "texto", largura: "meia" },
      {
        id: "mobilidade", rotulo: "Mobilidade", tipo: "radio",
        opcoes: ["Deambula sem auxílio", "Com auxílio", "Cadeira de rodas", "Acamado"],
      },
      { id: "dispositivos", rotulo: "Dispositivos", tipo: "marcar", opcoes: ["Marcapasso", "Prótese", "Órtese", "Sonda", "Estomia"] },
      { id: "dispositivos_detalhe", rotulo: "Detalhes dos dispositivos", tipo: "texto" },
    ],
  },
  {
    titulo: "Sinais vitais e medidas",
    campos: [
      { id: "peso", rotulo: "Peso", tipo: "numero", unidade: "kg", largura: "terco" },
      { id: "altura", rotulo: "Altura", tipo: "numero", unidade: "cm", largura: "terco" },
      { id: "pa", rotulo: "Pressão arterial", tipo: "texto", dica: "120x80", largura: "terco" },
      { id: "fc", rotulo: "Frequência cardíaca", tipo: "numero", unidade: "bpm", largura: "terco" },
      { id: "glicemia_capilar", rotulo: "Glicemia capilar", tipo: "numero", unidade: "mg/dL", largura: "terco" },
      { id: "temperatura", rotulo: "Temperatura", tipo: "numero", unidade: "°C", largura: "terco" },
    ],
  },
  {
    titulo: "Exames laboratoriais",
    campos: [
      { id: "exames_data", rotulo: "Data dos exames", tipo: "data", largura: "meia" },
      { id: "hba1c", rotulo: "Hemoglobina glicada (HbA1c)", tipo: "numero", unidade: "%", largura: "meia" },
      { id: "glicemia_jejum", rotulo: "Glicemia de jejum", tipo: "numero", unidade: "mg/dL", largura: "terco" },
      { id: "hemoglobina", rotulo: "Hemoglobina", tipo: "numero", unidade: "g/dL", largura: "terco" },
      { id: "leucocitos", rotulo: "Leucócitos", tipo: "numero", unidade: "/mm³", largura: "terco" },
      { id: "albumina", rotulo: "Albumina", tipo: "numero", unidade: "g/dL", largura: "terco" },
      { id: "creatinina", rotulo: "Creatinina", tipo: "numero", unidade: "mg/dL", largura: "terco" },
      { id: "pcr", rotulo: "PCR", tipo: "numero", unidade: "mg/L", largura: "terco" },
      { id: "itb_direito", rotulo: "ITB direito", tipo: "numero", largura: "meia" },
      { id: "itb_esquerdo", rotulo: "ITB esquerdo", tipo: "numero", largura: "meia" },
      { id: "exames_outros", rotulo: "Outros exames / imagem", tipo: "area", dica: "Os arquivos dos exames podem ser anexados na aba Arquivos" },
    ],
  },
  {
    titulo: "Fatores que podem afetar a cicatrização",
    campos: [
      {
        id: "fatores", rotulo: "Fatores", tipo: "marcar",
        opcoes: ["Moradia", "Higiene", "Social", "Familiar", "Psicológico", "Cuidador", "Nutricional", "Adesão ao tratamento", "Financeiro"],
      },
      { id: "fatores_detalhe", rotulo: "Detalhes", tipo: "area" },
    ],
  },
  {
    titulo: "Avaliação inicial da lesão",
    campos: AVALIACAO_LESAO.concat([
      { id: "lesao_observacoes", rotulo: "Observações da lesão", tipo: "area", dica: "Se houver mais de uma lesão, descreva as outras aqui e cadastre cada uma na aba Resumo" },
    ]),
  },
  {
    titulo: "Plano de cuidados",
    campos: [
      { id: "plano_limpeza", rotulo: "Limpeza", tipo: "texto" },
      { id: "plano_cobertura", rotulo: "Cobertura indicada", tipo: "texto" },
      {
        id: "plano_desbridamento", rotulo: "Desbridamento", tipo: "opcao", largura: "meia",
        opcoes: ["Não indicado", "Instrumental conservador", "Autolítico", "Enzimático", "Mecânico", "Encaminhado"],
      },
      { id: "plano_frequencia", rotulo: "Frequência de troca", tipo: "texto", largura: "meia", dica: "Ex.: 3x por semana" },
      { id: "plano_adjuvante", rotulo: "Terapias adjuvantes", tipo: "marcar", opcoes: ["Laserterapia", "Terapia compressiva", "Descarga / offloading", "Outra"] },
      {
        id: "plano_orientacoes", rotulo: "Orientações", tipo: "marcar",
        opcoes: ["Dieta", "Hidratação", "Controle de PA", "Controle de glicemia", "Mudança de decúbito", "Mobilidade", "Calçado adequado", "Cuidados com o curativo em casa"],
      },
      { id: "plano_medicacoes", rotulo: "Medicações (cuidados)", tipo: "area" },
      { id: "plano_exames", rotulo: "Exames solicitados", tipo: "area" },
      { id: "plano_encaminhamentos", rotulo: "Encaminhamentos", tipo: "area" },
    ],
  },
  {
    titulo: "Observações gerais",
    campos: [{ id: "observacoes", rotulo: "Observações", tipo: "area" }],
  },
];

export const TIPOS_ATENDIMENTO = ["Curativo", "Avaliação", "Retorno", "Desbridamento", "Laserterapia", "Orientação", "Alta"];
export const LOCAIS_ATENDIMENTO = ["Clinical Center", "Domicílio", "Outro"];
export const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência", "Outro"];
export const TIPOS_PLANO = { mensal: "Plano mensal", pacote: "Pacote de sessões", avulso: "Sessão avulsa" };
export const SITUACOES_PACIENTE = ["em tratamento", "alta", "inativo"];
export const SITUACOES_LESAO = ["em tratamento", "cicatrizada", "encerrada"];

// Todos os campos da admissão, para relatórios e backup
export function todosCamposAdmissao() {
  const lista = [];
  ADMISSAO.forEach((s) => s.campos.forEach((c) => lista.push(c)));
  return lista;
}
