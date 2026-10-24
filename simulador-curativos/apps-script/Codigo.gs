/**
 * SIMULADOR DE PRECIFICAÇÃO DE CURATIVOS — MVP 1.1
 * Véras Vasconcelos Medicina e Saúde
 *
 * Automação da planilha: menu "Simulador", botão "Salvar simulação" e
 * gravação do histórico com valores estáticos.
 *
 * Os cálculos exibidos no Simulador continuam sendo feitos pelas fórmulas
 * da planilha. Ao salvar, este script refaz o cálculo de forma independente
 * e só grava se os dois resultados coincidirem (verificação de integridade).
 *
 * Se mudar a posição de alguma célula na planilha, ajuste apenas o objeto CFG.
 */

const CFG = {
  ABA_SIMULADOR: 'Simulador',
  ABA_CONFIG: 'Configurações',
  ABA_HISTORICO: 'Histórico de simulações',
  ABA_HISTORICO_ANTIGA: 'Planos confirmados', // nome usado na v1.0

  // Simulador: entradas B5:B13 e resultados B16:B28 (lidos em bloco)
  FAIXA_ENTRADAS: 'B5:B13',
  FAIXA_RESULTADOS: 'B16:B28',

  // Configurações
  TAB_LOCAIS: 'A7:B8',
  TAB_PAGAMENTOS: 'A13:B17',
  CEL_SIMPLES: 'B24',

  // Histórico
  HIST_LINHA_CABECALHO: 4,
  HIST_PRIMEIRA_LINHA: 5,

  // Botão
  BOTAO_CELULA: 'D26',
  BOTAO_FUNCAO: 'salvarSimulacao',

  // Anti clique duplo: mesma simulação salva de novo dentro desta janela é ignorada
  JANELA_DUPLICIDADE_MS: 10000,
  TOLERANCIA: 0.005 // meio centavo, para comparar fórmulas x script
};

// Colunas do histórico: [cabeçalho, formato]. A ordem define a ordem gravada.
const MOEDA = '"R$ "#,##0.00;[Red]"-R$ "#,##0.00';
const PCT = '0.0%;[Red]-0.0%';
const COLUNAS_HISTORICO = [
  ['ID do registro', '@'],
  ['Data e hora', 'dd/mm/yyyy hh:mm:ss'],
  ['Nome do paciente', '@'],
  ['Receita bruta', MOEDA],
  ['Nº de curativos', '0'],
  ['Local de atendimento', '@'],
  ['Forma de pagamento', '@'],
  ['Material por curativo', MOEDA],
  ['Materiais (total)', MOEDA],
  ['Deslocamento por curativo', MOEDA],
  ['Deslocamento (total)', MOEDA],
  ['Outras despesas', MOEDA],
  ['Despesas fixas alocadas', MOEDA],
  ['Taxa da clínica (%)', PCT],
  ['Taxa da clínica (R$)', MOEDA],
  ['Taxa da operadora (%)', PCT],
  ['Taxa da operadora (R$)', MOEDA],
  ['Simples Nacional (%)', PCT],
  ['Simples Nacional (R$)', MOEDA],
  ['Total de descontos e despesas', MOEDA],
  ['Resultado líquido estimado', MOEDA],
  ['Resultado líquido por curativo', MOEDA],
  ['Margem estimada', PCT]
];

/* ======================================================================
 * MENU E BOTÃO
 * ==================================================================== */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Simulador')
    .addItem('Salvar simulação', 'salvarSimulacao')
    .addSeparator()
    .addItem('Configurar planilha (botão, filtro, fuso)', 'configurarPlanilha')
    .addToUi();
}

/**
 * Prepara a planilha (pode ser executado mais de uma vez sem efeitos colaterais):
 * - insere o botão "Salvar simulação" no Simulador e o vincula ao script;
 * - garante cabeçalho congelado e filtro no histórico;
 * - ajusta localidade (Brasil) e fuso (São Paulo) para datas e moeda.
 */
function configurarPlanilha() {
  const ss = SpreadsheetApp.getActive();
  const avisos = [];

  if (ss.getSpreadsheetLocale() !== 'pt_BR') {
    ss.setSpreadsheetLocale('pt_BR');
    avisos.push('Localidade da planilha ajustada para Brasil (pt_BR).');
  }
  if (ss.getSpreadsheetTimeZone() !== 'America/Sao_Paulo') {
    ss.setSpreadsheetTimeZone('America/Sao_Paulo');
    avisos.push('Fuso horário ajustado para America/Sao_Paulo.');
  }

  instalarBotao_(obterAba_(ss, CFG.ABA_SIMULADOR));
  avisos.push('Botão “Salvar simulação” instalado ao lado do resultado.');

  const hist = obterHistorico_(ss);
  hist.setFrozenRows(CFG.HIST_LINHA_CABECALHO);
  garantirFiltro_(hist, CFG.HIST_PRIMEIRA_LINHA);
  avisos.push('Histórico com cabeçalho congelado e filtro ativo.');

  SpreadsheetApp.getUi().alert('Planilha configurada', avisos.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}

function instalarBotao_(sim) {
  // Remove botões antigos vinculados ao script para não duplicar
  sim.getImages().forEach(function (img) {
    if (img.getScript() === CFG.BOTAO_FUNCAO) img.remove();
  });
  const cel = sim.getRange(CFG.BOTAO_CELULA);
  const blob = Utilities.newBlob(Utilities.base64Decode(BOTAO_PNG_BASE64), 'image/png', 'salvar.png');
  const img = sim.insertImage(blob, cel.getColumn(), cel.getRow(), 12, 6);
  img.setWidth(230).setHeight(44);
  img.assignScript(CFG.BOTAO_FUNCAO);
  img.setAltTextTitle('Salvar simulação');
}

/* ======================================================================
 * SALVAR SIMULAÇÃO
 * ==================================================================== */

function salvarSimulacao() {
  const ss = SpreadsheetApp.getActive();

  // Trava de documento: execuções simultâneas (cliques repetidos, dois usuários)
  // passam a ser processadas uma de cada vez.
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) {
    avisar_('Outro salvamento está em andamento. Aguarde alguns segundos e tente novamente.');
    return;
  }

  try {
    SpreadsheetApp.flush(); // garante fórmulas recalculadas antes da leitura

    const sim = obterAba_(ss, CFG.ABA_SIMULADOR);
    const entradas = lerEntradas_(sim);
    const taxas = lerTaxas_(obterAba_(ss, CFG.ABA_CONFIG));

    const r = validarECalcular_(entradas, taxas);
    if (r.erros.length) {
      avisar_('A simulação não foi salva. Corrija o(s) ponto(s) abaixo:\n\n• ' + r.erros.join('\n• '));
      return;
    }

    const divergencias = conferirResultados_(r.calc, lerResultados_(sim));
    if (divergencias.length) {
      avisar_('A simulação não foi salva: os resultados exibidos estão incompletos ou não conferem com o cálculo de verificação.\n\n• ' +
        divergencias.join('\n• ') +
        '\n\nVerifique se as fórmulas do Simulador foram alteradas ou apagadas.');
      return;
    }

    // Proteção contra clique duplo: mesma simulação, segundos depois, não é gravada de novo.
    // Simulações idênticas salvas em momentos distintos (fora da janela) são gravadas normalmente.
    const props = PropertiesService.getDocumentProperties();
    const assinatura = JSON.stringify([entradas, taxas.usadas]);
    const ultimo = JSON.parse(props.getProperty('ULTIMO_SALVAMENTO') || 'null');
    if (ultimo && ultimo.assinatura === assinatura && Date.now() - ultimo.ts < CFG.JANELA_DUPLICIDADE_MS) {
      ss.toast('Esta simulação acabou de ser salva (' + ultimo.id + '). Nenhuma cópia foi criada.', 'Já salva', 5);
      return;
    }

    const hist = obterHistorico_(ss);
    const agora = new Date();
    const id = gerarId_(agora, ss.getSpreadsheetTimeZone());
    const registro = montarRegistro_(id, agora, r.calc);

    const linha = proximaLinha_(hist);
    hist.getRange(linha, 1, 1, registro.length)
      .setValues([registro]) // somente valores: nada de fórmulas ou referências
      .setNumberFormats([COLUNAS_HISTORICO.map(function (c) { return c[1]; })]);
    garantirFiltro_(hist, linha);
    SpreadsheetApp.flush();

    props.setProperty('ULTIMO_SALVAMENTO', JSON.stringify({ assinatura: assinatura, ts: Date.now(), id: id }));
    ss.toast('Registro ' + id + ' gravado na aba “' + hist.getName() + '” (linha ' + linha + ').', 'Simulação salva', 6);
  } finally {
    lock.releaseLock();
  }
}

/* ======================================================================
 * LEITURA DA PLANILHA
 * ==================================================================== */

function lerEntradas_(sim) {
  const v = sim.getRange(CFG.FAIXA_ENTRADAS).getValues().map(function (l) { return l[0]; });
  return {
    nome: v[0], receita: v[1], curativos: v[2], local: v[3], pagamento: v[4],
    materialUnit: v[5], deslocUnit: v[6], outras: v[7], fixas: v[8]
  };
}

function lerResultados_(sim) {
  const v = sim.getRange(CFG.FAIXA_RESULTADOS).getValues().map(function (l) { return l[0]; });
  // B16..B28 (B24 e B25 são a linha em branco e o título da seção de resultado)
  return {
    clinica: v[0], operadora: v[1], simples: v[2], materiais: v[3], deslocamento: v[4],
    outras: v[5], fixas: v[6], total: v[7], liquido: v[10], porCurativo: v[11], margem: v[12]
  };
}

function lerTaxas_(cfg) {
  const tabela = function (a1) {
    const mapa = {};
    cfg.getRange(a1).getValues().forEach(function (l) {
      const nome = String(l[0]).trim();
      if (nome) mapa[nome] = l[1];
    });
    return mapa;
  };
  return { locais: tabela(CFG.TAB_LOCAIS), pagamentos: tabela(CFG.TAB_PAGAMENTOS), simples: cfg.getRange(CFG.CEL_SIMPLES).getValue() };
}

/* ======================================================================
 * REGRAS (funções puras, sem acesso à planilha — testáveis isoladamente)
 * ==================================================================== */

/** Valida entradas e taxas e calcula o resultado. Retorna { erros: [], calc }. */
function validarECalcular_(e, taxas) {
  const erros = [];
  const ehNumero = function (x) { return typeof x === 'number' && isFinite(x); };
  const vazio = function (x) { return x === '' || x === null || x === undefined; };

  const nome = String(vazio(e.nome) ? '' : e.nome).trim();
  if (!nome) erros.push('Informe o nome do paciente.');

  if (!ehNumero(e.receita) || e.receita <= 0) erros.push('Valor total cobrado: informe um número maior que zero.');

  if (!ehNumero(e.curativos) || e.curativos <= 0 || Math.floor(e.curativos) !== e.curativos) {
    erros.push('Número de curativos: informe um número inteiro maior que zero.');
  }

  const local = String(e.local).trim();
  const pagamento = String(e.pagamento).trim();
  const taxaLocal = taxas.locais[local];
  const taxaPag = taxas.pagamentos[pagamento];

  if (!local || !(local in taxas.locais)) {
    erros.push('Local do atendimento: selecione uma opção válida da lista.');
  } else if (!ehNumero(taxaLocal)) {
    erros.push('A taxa do local “' + local + '” não está configurada na aba Configurações.');
  } else if (taxaLocal < 0 || taxaLocal >= 1) {
    erros.push('A taxa do local “' + local + '” em Configurações está fora do intervalo de 0% a 99,9%.');
  }

  if (!pagamento || !(pagamento in taxas.pagamentos)) {
    erros.push('Forma de pagamento: selecione uma opção válida da lista.');
  } else if (!ehNumero(taxaPag)) {
    erros.push('A taxa de “' + pagamento + '” ainda não foi configurada na aba Configurações (item 2). ' +
      'Informe a taxa da operadora ou escolha outra forma de pagamento.');
  } else if (taxaPag < 0 || taxaPag >= 1) {
    erros.push('A taxa de “' + pagamento + '” em Configurações está fora do intervalo de 0% a 99,9%.');
  }

  if (!ehNumero(taxas.simples)) {
    erros.push('A alíquota do Simples Nacional não está configurada na aba Configurações (item 3).');
  } else if (taxas.simples < 0 || taxas.simples >= 1) {
    erros.push('A alíquota do Simples Nacional em Configurações está fora do intervalo de 0% a 99,9%.');
  }

  // Campos opcionais: vazio = 0; preenchido precisa ser número >= 0
  const opcional = function (x, rotulo) {
    if (vazio(x)) return 0;
    if (!ehNumero(x) || x < 0) { erros.push(rotulo + ': use um valor maior ou igual a zero ou deixe em branco.'); return 0; }
    return x;
  };
  const materialUnit = opcional(e.materialUnit, 'Custo de material por curativo');
  const deslocUnit = opcional(e.deslocUnit, 'Custo de deslocamento por curativo');
  const outras = opcional(e.outras, 'Outras despesas do plano');
  const fixas = opcional(e.fixas, 'Despesas fixas alocadas ao plano');

  taxas.usadas = [taxaLocal, taxaPag, taxas.simples];
  if (erros.length) return { erros: erros, calc: null };

  const receita = e.receita, n = e.curativos;
  const c = {
    nome: nome, receita: receita, curativos: n, local: local, pagamento: pagamento,
    materialUnit: materialUnit, deslocUnit: deslocUnit, outras: outras, fixas: fixas,
    pctClinica: taxaLocal, pctOperadora: taxaPag, pctSimples: taxas.simples,
    clinica: receita * taxaLocal,
    operadora: receita * taxaPag,
    simples: receita * taxas.simples, // sobre a receita bruta integral
    materiais: n * materialUnit,
    deslocamento: n * deslocUnit
  };
  c.total = c.clinica + c.operadora + c.simples + c.materiais + c.deslocamento + outras + fixas;
  c.liquido = receita - c.total;
  c.porCurativo = c.liquido / n;
  c.margem = c.liquido / receita; // margem sobre a receita (não é markup)

  if (![c.total, c.liquido, c.porCurativo, c.margem].every(ehNumero)) {
    return { erros: ['Não foi possível obter um resultado numérico válido.'], calc: null };
  }
  return { erros: [], calc: c };
}

/** Compara o cálculo do script com os valores exibidos pelas fórmulas do Simulador. */
function conferirResultados_(calc, lidos) {
  const rotulos = {
    clinica: 'Taxa da clínica', operadora: 'Taxa da operadora', simples: 'Simples Nacional',
    materiais: 'Materiais', deslocamento: 'Deslocamento', outras: 'Outras despesas', fixas: 'Despesas fixas alocadas',
    total: 'Total de descontos e despesas', liquido: 'Valor final', porCurativo: 'Preço líquido por curativo', margem: 'Margem'
  };
  const problemas = [];
  Object.keys(rotulos).forEach(function (k) {
    const v = lidos[k];
    if (typeof v !== 'number' || !isFinite(v)) problemas.push(rotulos[k] + ': resultado vazio ou inválido no Simulador.');
    else if (Math.abs(v - calc[k]) > CFG.TOLERANCIA) problemas.push(rotulos[k] + ': valor exibido difere do cálculo de verificação.');
  });
  return problemas;
}

/** Monta a linha do histórico (somente valores estáticos), na ordem de COLUNAS_HISTORICO. */
function montarRegistro_(id, data, c) {
  return [
    id, data, c.nome, c.receita, c.curativos, c.local, c.pagamento,
    c.materialUnit, c.materiais, c.deslocUnit, c.deslocamento, c.outras, c.fixas,
    c.pctClinica, c.clinica, c.pctOperadora, c.operadora, c.pctSimples, c.simples,
    c.total, c.liquido, c.porCurativo, c.margem
  ];
}

/** ID legível e único: SIM-AAAAMMDD-HHMMSS-xxxx (data/hora + sufixo aleatório). */
function gerarId_(data, fuso) {
  const sufixo = Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
  return 'SIM-' + Utilities.formatDate(data, fuso, 'yyyyMMdd-HHmmss') + '-' + sufixo;
}

/* ======================================================================
 * APOIO
 * ==================================================================== */

function obterAba_(ss, nome) {
  const aba = ss.getSheetByName(nome);
  if (!aba) throw new Error('Aba “' + nome + '” não encontrada. Não renomeie as abas do simulador.');
  return aba;
}

function obterHistorico_(ss) {
  const aba = ss.getSheetByName(CFG.ABA_HISTORICO) || ss.getSheetByName(CFG.ABA_HISTORICO_ANTIGA);
  if (!aba) throw new Error('Aba “' + CFG.ABA_HISTORICO + '” não encontrada.');
  const cab = aba.getRange(CFG.HIST_LINHA_CABECALHO, 1, 1, COLUNAS_HISTORICO.length).getValues()[0];
  if (String(cab[0]).trim() !== COLUNAS_HISTORICO[0][0]) {
    throw new Error('O cabeçalho do histórico (linha ' + CFG.HIST_LINHA_CABECALHO +
      ') não está no formato da versão 1.1. Use a planilha PRECIFICACAO_CURATIVOS_v1.1.');
  }
  return aba;
}

function proximaLinha_(hist) {
  const linha = Math.max(hist.getLastRow() + 1, CFG.HIST_PRIMEIRA_LINHA);
  if (linha > hist.getMaxRows()) hist.insertRowsAfter(hist.getMaxRows(), 200);
  return linha;
}

/** Garante filtro do cabeçalho até o fim da aba, preservando critérios já aplicados. */
function garantirFiltro_(hist, linhaNecessaria) {
  const n = COLUNAS_HISTORICO.length;
  const faixa = function () {
    return hist.getRange(CFG.HIST_LINHA_CABECALHO, 1, hist.getMaxRows() - CFG.HIST_LINHA_CABECALHO + 1, n);
  };
  const filtro = hist.getFilter();
  if (!filtro) { faixa().createFilter(); return; }

  const r = filtro.getRange();
  if (r.getRow() === CFG.HIST_LINHA_CABECALHO && r.getColumn() === 1 &&
      r.getLastRow() >= linhaNecessaria && r.getNumColumns() >= n) return;

  const criterios = {};
  for (let col = r.getColumn(); col <= r.getLastColumn(); col++) {
    const cr = filtro.getColumnFilterCriteria(col);
    if (cr) criterios[col] = cr;
  }
  filtro.remove();
  const novo = faixa().createFilter();
  Object.keys(criterios).forEach(function (col) {
    if (Number(col) <= n) novo.setColumnFilterCriteria(Number(col), criterios[col]);
  });
}

function avisar_(msg) {
  SpreadsheetApp.getUi().alert('Simulador de curativos', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

// Imagem PNG do botão "Salvar simulação" (gerada para o projeto; sem dependência externa)
const BOTAO_PNG_BASE64 = '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';
