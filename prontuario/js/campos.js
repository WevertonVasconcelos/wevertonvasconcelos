// ============================================================
// CAMPOS DAS FICHAS — seguem as folhas de atendimento da Mariana
// (Ficha de Anamnese, Avaliação da Lesão, Plano de Cuidados).
//
// Para acrescentar, tirar ou renomear uma pergunta, mexa só aqui.
// Não troque o "id" de um campo que já tem dados salvos: é por ele
// que o valor fica guardado. Tirar um campo não apaga dados antigos.
//
// Tipos de campo:
//   texto, area (texto grande), numero, data, opcao (lista)
//   simnao  -> pergunta com "Sim / Não" (sub: campos que aparecem embaixo)
//   marcar  -> várias caixinhas | radio -> só uma caixinha
//   caixa   -> quadro com título na borda, como na ficha de papel
//   grade   -> quadradinhos lado a lado (Peso, Altura, IMC…)
//   lado    -> quadros lado a lado
//   tabela  -> tabela de duas colunas (Plano de cuidados)
//   mapa    -> figuras do corpo para marcar o local da lesão
// ============================================================

export const ANAMNESE = {
  titulo: ["FICHA DE", "ANAMNESE"],
  colunas: [
    [
      { id: "queixas", rotulo: "Queixas:", tipo: "area" },
      {
        id: "doencas", rotulo: "Doenças crônicas, autoimunes, vascular ou câncer?", tipo: "simnao",
        sub: [
          {
            id: "doencas_quais", tipo: "marcar",
            opcoes: ["Diabetes tipo 1", "Diabetes tipo 2", "Hipertensão", "Insuficiência venosa", "Doença arterial periférica",
              "Neuropatia", "Insuficiência cardíaca", "Doença renal crônica", "Doença autoimune", "Câncer"],
          },
          { id: "doencas_outras", rotulo: "Outras / detalhes", tipo: "texto" },
        ],
      },
      {
        id: "medicamentos", rotulo: "Uso de medicamentos?", tipo: "simnao",
        sub: [
          { id: "medicamentos_quais", rotulo: "Quais?", tipo: "area" },
          { id: "medicamentos_atencao", rotulo: "Atenção", tipo: "marcar", opcoes: ["Anticoagulante", "Antiagregante", "Corticoide", "Imunossupressor", "Insulina", "Antibiótico"] },
        ],
      },
      { id: "cirurgia", rotulo: "Fez cirurgia recentemente ou internamento?", tipo: "simnao", sub: [{ id: "cirurgia_qual", rotulo: "Qual / quando?", tipo: "texto" }] },
      { id: "alergias", rotulo: "Possui alergias?", tipo: "simnao", sub: [{ id: "alergias_quais", rotulo: "Quais?", tipo: "texto" }] },
      { id: "sono", rotulo: "Boa qualidade do sono?", tipo: "simnao", compacto: true },
      { id: "tabagismo", rotulo: "Tabagismo?", tipo: "simnao", compacto: true },
      { id: "etilismo", rotulo: "Etilismo?", tipo: "simnao", compacto: true },
    ],
    [
      { id: "dispositivos", rotulo: "Uso de dispositivos:", tipo: "marcar", opcoes: ["SVD", "SNG/SNE", "CVC", "Ostomias"] },
      { id: "incontinencia", rotulo: "Incontinência urinária ou fecal?", tipo: "simnao" },
      { id: "proteses", rotulo: "Possui próteses?", tipo: "simnao", sub: [{ id: "proteses_qual", rotulo: "Qual?", tipo: "texto" }] },
      { id: "mobilidade", rotulo: "Mobilidade", tipo: "marcar", opcoes: ["Acamado", "Com auxílio", "Sedentário", "Pratica atividade física"] },
      {
        tipo: "grade",
        campos: [
          { id: "peso", rotulo: "Peso:", tipo: "numero", unidade: "kg" },
          { id: "altura", rotulo: "Altura:", tipo: "numero", unidade: "cm" },
          { id: "imc", rotulo: "IMC:", tipo: "numero", calculado: "imc" },
          { id: "pa", rotulo: "PA:", tipo: "texto", dica: "120x80" },
          { id: "glicemia", rotulo: "Glicemia:", tipo: "numero", unidade: "mg/dL" },
          { id: "spo2", rotulo: "SPO2:", tipo: "numero", unidade: "%" },
          { id: "fc", rotulo: "FC:", tipo: "numero", unidade: "bpm" },
          { id: "fr", rotulo: "FR:", tipo: "numero", unidade: "irpm" },
          { id: "temperatura", rotulo: "Temperatura:", tipo: "numero", unidade: "°C" },
        ],
      },
      { id: "fatores", rotulo: "Fatores que podem afetar a cicatrização:", tipo: "marcar", opcoes: ["Moradia", "Higiene", "Social", "Familiar", "Psicológico", "Cuidador"] },
    ],
  ],
  rodape: [
    {
      tipo: "caixa", rotulo: "Exames laboratoriais",
      campos: [
        {
          tipo: "grade",
          campos: [
            { id: "exames_data", rotulo: "Data:", tipo: "data" },
            { id: "hba1c", rotulo: "HbA1c:", tipo: "numero", unidade: "%" },
            { id: "glicemia_jejum", rotulo: "Glicemia jejum:", tipo: "numero", unidade: "mg/dL" },
            { id: "hemoglobina", rotulo: "Hemoglobina:", tipo: "numero", unidade: "g/dL" },
            { id: "leucocitos", rotulo: "Leucócitos:", tipo: "numero", unidade: "/mm³" },
            { id: "albumina", rotulo: "Albumina:", tipo: "numero", unidade: "g/dL" },
            { id: "creatinina", rotulo: "Creatinina:", tipo: "numero", unidade: "mg/dL" },
            { id: "pcr", rotulo: "PCR:", tipo: "numero", unidade: "mg/L" },
            { id: "itb", rotulo: "ITB (D / E):", tipo: "texto", dica: "0,9 / 1,0" },
          ],
        },
        { id: "exames_outros", rotulo: "Outros exames", tipo: "area", dica: "Os arquivos dos exames podem ser anexados na aba Documentos" },
      ],
    },
  ],
};

export const ETIOLOGIAS = ["Pé diabético", "Úlcera venosa", "Úlcera arterial", "Úlcera mista", "Lesão por pressão",
  "Traumática", "Ferida cirúrgica", "Queimadura", "Outra"];

export const AVALIACAO = {
  titulo: ["AVALIAÇÃO DA", "LESÃO"],
  topo: [
    { tipo: "caixa", rotulo: "Local da lesão (membros inferiores):", campos: [{ id: "lesao_mapa", tipo: "mapa" }] },
  ],
  colunas: [
    [
      {
        tipo: "caixa", rotulo: "Local da lesão + Medidas:",
        campos: [
          { id: "lesao_local", rotulo: "Local", tipo: "texto", dica: "Ex.: pé D, região plantar do hálux" },
          { id: "lesao_etiologia", rotulo: "Etiologia", tipo: "opcao", opcoes: ETIOLOGIAS },
          {
            tipo: "grade",
            campos: [
              { id: "lesao_comprimento", rotulo: "Comp.:", tipo: "numero", unidade: "cm" },
              { id: "lesao_largura", rotulo: "Larg.:", tipo: "numero", unidade: "cm" },
              { id: "lesao_profundidade", rotulo: "Prof.:", tipo: "numero", unidade: "cm" },
            ],
          },
        ],
      },
      {
        tipo: "lado",
        campos: [
          { tipo: "caixa", rotulo: "Tipo:", campos: [{ id: "lesao_tipo", tipo: "radio", colunas: 1, opcoes: ["Limpa", "Contaminada", "Potencialmente contaminada", "Infectada"] }] },
          {
            tipo: "caixa", rotulo: "Dor:",
            campos: [
              { id: "lesao_dor", tipo: "marcar", colunas: 1, opcoes: ["Local", "Ocasional", "Produzida", "Contínua"] },
              { id: "lesao_dor_eva", rotulo: "Intensidade (0 a 10)", tipo: "numero" },
            ],
          },
        ],
      },
      { tipo: "caixa", rotulo: "Tecido:", campos: [{ id: "lesao_tecido", tipo: "marcar", opcoes: ["Epitelial", "Necrose úmida", "Granulação", "Osso", "Esfacelo", "Tendão", "Necrose seca", "Músculo"] }] },
      { tipo: "caixa", rotulo: "Observações", grande: true, campos: [{ id: "lesao_observacoes", tipo: "area", linhas: 5 }] },
    ],
    [
      { tipo: "caixa", rotulo: "Bordas:", campos: [{ id: "lesao_bordas", tipo: "marcar", opcoes: ["Íntegra", "Plana", "Irregular", "Edema", "Maceradas", "Hiperqueratose", "Epíbole", "Descolada"] }] },
      {
        tipo: "caixa", rotulo: "Tempo:",
        campos: [
          { id: "lesao_tempo", tipo: "radio", colunas: 1, opcoes: ["Aguda", "Crônica"] },
          { id: "lesao_tempo_detalhe", tipo: "texto", dica: "Há quanto tempo?" },
        ],
      },
      { tipo: "caixa", rotulo: "Perilesão", campos: [{ id: "lesao_perilesao", tipo: "marcar", opcoes: ["Edema", "Ressecamento", "Eritema", "Escoriação", "Calor", "Maceração"] }] },
      { tipo: "caixa", rotulo: "Exsudato:", campos: [{ id: "lesao_exsudato", tipo: "marcar", opcoes: ["Ausente", "Abundante", "Pouco", "Purulento", "Moderado", "Odor fétido"] }] },
      { tipo: "caixa", rotulo: "Pele", campos: [{ id: "lesao_pele", tipo: "marcar", opcoes: ["Saudável", "Úmida e pegajosa", "Muito fina", "Edema", "Seca", "Descorada"] }] },
    ],
  ],
};

export const PLANO_CUIDADOS = {
  titulo: ["PLANO DE", "CUIDADOS"],
  roxo: true,
  colunas: [[
    {
      tipo: "tabela",
      campos: [
        { id: "plano_limpeza", rotulo: "Limpeza", tipo: "area" },
        { id: "plano_cobertura", rotulo: "Cobertura indicada", tipo: "area" },
        { id: "plano_desbridamento", rotulo: "Desbridamento", tipo: "area" },
        { id: "plano_frequencia", rotulo: "Frequência de troca", tipo: "area" },
        { id: "plano_medicacoes", rotulo: "Medicações", tipo: "area" },
        { id: "plano_dieta", rotulo: "Dieta", tipo: "area" },
        { id: "plano_hidratacao", rotulo: "Hidratação", tipo: "area" },
        { id: "plano_pa", rotulo: "Controle de PA", tipo: "area" },
        { id: "plano_glicemia", rotulo: "Controle de glicemia", tipo: "area" },
        { id: "plano_decubito", rotulo: "Mudança de decúbito", tipo: "area" },
        { id: "plano_mobilidade", rotulo: "Mobilidade", tipo: "area" },
        { id: "plano_adjuvantes", rotulo: "Laser / adjuvantes", tipo: "area" },
        { id: "plano_exames", rotulo: "Exames solicitados", tipo: "area" },
      ],
    },
  ]],
};

// As três folhas da admissão, na ordem em que aparecem
export const FOLHAS_ADMISSAO = [
  { chave: "anamnese", aba: "Anamnese", folha: ANAMNESE },
  { chave: "avaliacao", aba: "Avaliação da lesão", folha: AVALIACAO },
  { chave: "plano", aba: "Plano de cuidados", folha: PLANO_CUIDADOS },
];

// Na evolução, a avaliação não repete etiologia nem observações (a evolução já tem texto)
export const OMITIR_NA_EVOLUCAO = ["lesao_etiologia", "lesao_observacoes"];

export const TIPOS_ATENDIMENTO = ["Curativo", "Avaliação", "Retorno", "Desbridamento", "Laserterapia", "Orientação", "Alta"];
export const LOCAIS_ATENDIMENTO = ["Clinical Center", "Domicílio", "Outro"];
export const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência", "Outro"];
export const TIPOS_PLANO = { mensal: "Plano mensal", pacote: "Pacote de sessões", avulso: "Sessão avulsa" };
export const SITUACOES_PACIENTE = ["em tratamento", "alta", "inativo"];
export const SITUACOES_LESAO = ["em tratamento", "cicatrizada", "encerrada"];

// Figuras dos membros inferiores (foco do atendimento). "altura" é a altura de exibição relativa.
export const FIGURAS_CORPO = [
  { id: "membros-anterior", arquivo: "icones/membros/membros-anterior.svg", png: "icones/membros/membros-anterior.png", nome: "Vista anterior", largura: 260, altura: 570, grupo: "perna" },
  { id: "membros-posterior", arquivo: "icones/membros/membros-posterior.svg", png: "icones/membros/membros-posterior.png", nome: "Vista posterior", largura: 260, altura: 570, grupo: "perna" },
  { id: "pernas-lateral", arquivo: "icones/membros/pernas-lateral.svg", png: "icones/membros/pernas-lateral.png", nome: "Faces laterais", largura: 430, altura: 576, grupo: "perna" },
  { id: "pernas-medial", arquivo: "icones/membros/pernas-medial.svg", png: "icones/membros/pernas-medial.png", nome: "Faces mediais", largura: 430, altura: 576, grupo: "perna" },
  { id: "pes-planta", arquivo: "icones/membros/pes-planta.svg", png: "icones/membros/pes-planta.png", nome: "Plantas dos pés", largura: 260, altura: 294, grupo: "pe" },
  { id: "pes-dorso", arquivo: "icones/membros/pes-dorso.svg", png: "icones/membros/pes-dorso.png", nome: "Dorsos dos pés", largura: 260, altura: 294, grupo: "pe" },
  { id: "pes-lateral", arquivo: "icones/membros/pes-lateral.svg", png: "icones/membros/pes-lateral.png", nome: "Pés: faces laterais", largura: 640, altura: 195, grupo: "pe-perfil" },
  { id: "pes-medial", arquivo: "icones/membros/pes-medial.svg", png: "icones/membros/pes-medial.png", nome: "Pés: faces mediais", largura: 640, altura: 195, grupo: "pe-perfil" },
];

// Quem assina o prontuário (fichas, sessões, impressão e PDF)
export const RESPONSAVEL = { nome: "Enf. Mariana Véras", titulo: "Enfermeira Dermatológica", registro: "COREN-PE 528.268" };
export const ASSINATURA = `${RESPONSAVEL.nome} · ${RESPONSAVEL.titulo} · ${RESPONSAVEL.registro}`;

// Lista "plana" de todos os campos que guardam valor (entra em caixas, grades etc.)
export function camposDe(...folhas) {
  const lista = [];
  const visitar = (c) => {
    if (c.id) lista.push(c);
    (c.sub || []).forEach(visitar);
    (c.campos || []).forEach(visitar);
  };
  folhas.forEach((f) => {
    (f.topo || []).forEach(visitar);
    (f.colunas || []).forEach((col) => col.forEach(visitar));
    (f.rodape || []).forEach(visitar);
  });
  return lista;
}
