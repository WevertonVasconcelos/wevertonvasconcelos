/**
 * SIMULADOR DE PRECIFICAÇÃO DE CURATIVOS — VERSÃO 1.2 (nova interface)
 * Véras Vasconcelos Medicina e Saúde
 *
 * O que muda em relação à 1.1: somente a interface. Regras de cálculo, taxas
 * (aba Configurações) e histórico (aba Planos confirmados, 23 colunas) são os mesmos.
 *
 * Fluxo de implantação seguro:
 *   1. Menu Curativos → "Criar aba Simulador_Novo"   (não altera nenhuma outra aba)
 *   2. Menu Curativos → "Testar cálculos do Simulador_Novo" (não grava no histórico)
 *   3. Usar e conferir. A aba antiga "Simulador" continua funcionando, inclusive o salvar.
 *   4. Após aprovação: menu Curativos → "Substituir interface antiga"
 *      (a aba antiga é renomeada e ocultada, nunca apagada).
 *
 * Os resultados exibidos vêm das fórmulas da planilha. Ao salvar, o script refaz o
 * cálculo de forma independente e só grava se os dois coincidirem.
 * Nenhuma função deste arquivo altera, apaga ou move registros já gravados.
 */

const CFG = {
  ABA_PAINEL: 'Simulador_Novo',
  ABA_ANTIGA: 'Simulador',
  ABA_ANTIGA_ARQUIVO: 'Simulador v1.1 (arquivo)',
  ABA_CONFIG: 'Configurações',
  ABA_HISTORICO: 'Planos confirmados',
  MARCA_PAINEL: 'simulador_curativos_painel_v12', // metadado que identifica a aba nova, mesmo após renomear

  // Configurações (posições da versão 1.1 em uso)
  CONF_LOCAIS: '$A$7:$B$8',
  CONF_PAGAMENTOS: '$A$13:$B$17',
  CONF_SIMPLES: '$B$23',

  // Histórico
  HIST_LINHA_CABECALHO: 4,
  HIST_PRIMEIRA_LINHA: 5,

  JANELA_DUPLICIDADE_MS: 10000, // mesma simulação salva de novo nesse intervalo = clique duplo, ignorada
  TOLERANCIA: 0.005
};

/**
 * Onde cada dado está em cada interface. O salvamento lê pela interface ativa;
 * assim a aba antiga continua salvando enquanto a nova está em teste.
 */
const LAYOUTS = {
  painel: {
    entradas: { nome: 'C6', receita: 'C7', curativos: 'C8', local: 'C9', pagamento: 'C10',
      materialUnit: 'C11', outras: 'C12', deslocUnit: 'C13', fixas: 'C14' },
    resultados: { clinica: 'G13', operadora: 'G14', simples: 'G15', materiais: 'G16', deslocamento: 'G17',
      outras: 'G18', fixas: 'G19', total: 'G20', liquido: 'E7', porCurativo: 'E10', margem: 'G7' }
  },
  antigo: { // aba "Simulador" da versão 1.1
    entradas: { nome: 'B5', receita: 'B6', curativos: 'B7', local: 'B8', pagamento: 'B9',
      materialUnit: 'B10', outras: 'B11', deslocUnit: 'B12', fixas: 'B13' },
    resultados: { clinica: 'B16', operadora: 'B17', simples: 'B18', materiais: 'B19', deslocamento: 'B20',
      outras: 'B21', fixas: 'B22', total: 'B23', liquido: 'B26', porCurativo: 'B27', margem: 'B28' }
  }
};

// Colunas do histórico, exatamente como existem na aba Planos confirmados: [cabeçalho, formato]
const MOEDA = '"R$ "#,##0.00;[Red](#,##0.00)';
const PCT = '0.0%';
const COLUNAS_HISTORICO = [
  ['ID', '@'], ['Data e hora', 'dd/MM/yyyy HH:mm:ss'], ['Paciente', '@'], ['Receita bruta (R$)', MOEDA],
  ['Curativos', '0'], ['Local', '@'], ['Pagamento', '@'], ['Material unit. (R$)', MOEDA],
  ['Material total (R$)', MOEDA], ['Deslocamento unit. (R$)', MOEDA], ['Deslocamento total (R$)', MOEDA],
  ['Outras despesas (R$)', MOEDA], ['Fixas alocadas (R$)', MOEDA], ['Taxa clínica (%)', PCT],
  ['Taxa clínica (R$)', MOEDA], ['Taxa pagamento (%)', PCT], ['Taxa pagamento (R$)', MOEDA],
  ['Simples (%)', PCT], ['Simples (R$)', MOEDA], ['Despesas totais (R$)', MOEDA],
  ['Resultado estimado (R$)', MOEDA], ['Líquido por curativo (R$)', MOEDA], ['Margem (%)', PCT]
];

/* ======================================================================
 * MENU
 * ==================================================================== */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Curativos')
    .addItem('Salvar simulação', 'salvarSimulacao')
    .addItem('Nova simulação', 'novaSimulacao')
    .addSeparator()
    .addItem('Criar aba Simulador_Novo', 'criarSimuladorNovo')
    .addItem('Testar cálculos do Simulador_Novo', 'testarSimuladorNovo')
    .addItem('Reparar taxa do Cartão 3x em Configurações', 'repararCartao3x')
    .addSeparator()
    .addItem('Substituir interface antiga (após aprovação)', 'substituirInterfaceAntiga')
    .addToUi();
}

/* ======================================================================
 * CONSTRUÇÃO DO PAINEL
 * ==================================================================== */

const COR = {
  MARINHO: '#1F3A5F', PETROLEO: '#0F6E6E', FUNDO: '#F4F7FA', BRANCO: '#FFFFFF',
  TEXTO: '#24364B', SUAVE: '#6B7C93', BORDA: '#C9D3DF',
  CARD_PETROLEO: '#E6F2F2', CARD_MARINHO: '#E9EEF5',
  ALERTA_FUNDO: '#FDECEC', ALERTA_TEXTO: '#B42318', AVISO_FUNDO: '#FFF4E0', AVISO_TEXTO: '#8A5A00', OK_FUNDO: '#E6F2F2'
};
const FMT_MOEDA = '"R$ "#,##0.00;[Red]"-R$ "#,##0.00';
const FMT_PCT = '0.0%;[Red]-0.0%';

/**
 * Especificação do painel: conteúdo de cada célula (texto ou fórmula).
 * Função pura, usada pela construção e pelos testes fora do Google.
 */
function especificacaoPainel_() {
  const C = "'" + CFG.ABA_CONFIG + "'!";
  const locA = C + CFG.CONF_LOCAIS.replace(':$B$', ':$A$'), locB = C + CFG.CONF_LOCAIS.replace('$A$', '$B$');
  const pagA = C + CFG.CONF_PAGAMENTOS.replace(':$B$', ':$A$'), pagB = C + CFG.CONF_PAGAMENTOS.replace('$A$', '$B$');
  const taxa = function (nomes, valores, chave) {
    const idx = 'INDEX(' + valores + ',MATCH(' + chave + ',' + nomes + ',0))';
    return '=IFERROR(IF(' + idx + '&""="","",' + idx + '),"")';
  };
  const invalido = function (cel, msg) {
    return 'IF(AND(' + cel + '<>"",OR(NOT(ISNUMBER(' + cel + ')),N(' + cel + ')<0)),"' + msg + '",';
  };
  // Mensagem de bloqueio ("" = tudo certo para calcular)
  const J2 =
    '=IF(AND($C$7="",$C$8=""),"Preencha as entradas do plano para ver o resultado.",' +
    'IF(OR(NOT(ISNUMBER($C$7)),N($C$7)<=0),"Receita bruta inválida: informe um valor maior que zero.",' +
    'IF(OR(NOT(ISNUMBER($C$8)),N($C$8)<=0,N($C$8)<>INT(N($C$8))),"Número de curativos: informe um inteiro maior que zero.",' +
    'IF(ISNA(MATCH($C$9,' + locA + ',0)),"Selecione o local de atendimento.",' +
    'IF(ISNA(MATCH($C$10,' + pagA + ',0)),"Selecione a forma de pagamento.",' +
    'IF(NOT(ISNUMBER($J$3)),"Falta a taxa do local "&$C$9&" em Configurações.",' +
    'IF(NOT(ISNUMBER($J$4)),"Falta a taxa de "&$C$10&" em Configurações.",' +
    'IF(NOT(ISNUMBER($J$5)),"Falta a alíquota do Simples em Configurações.",' +
    'IF(OR($J$3<0,$J$3>=1,$J$4<0,$J$4>=1,$J$5<0,$J$5>=1),"Taxa fora de 0% a 99,9% em Configurações.",' +
    invalido('$C$11', 'Material por curativo inválido.') +
    invalido('$C$12', 'Outras despesas inválidas.') +
    invalido('$C$13', 'Deslocamento por curativo inválido.') +
    invalido('$C$14', 'Despesas fixas inválidas.') +
    '"")))))))))))))';
  const se = function (f) { return '=IF($J$2<>"","",' + f + ')'; };

  return {
    'B2': 'Simulador de Planos de Curativos',
    'B3': 'Véras Vasconcelos  ·  Medicina e Saúde  ·  versão 1.2',
    'B5': 'ENTRADAS DO PLANO', 'E5': 'RESULTADOS FINANCEIROS',
    'B6': 'Nome do paciente', 'B7': 'Receita bruta do plano', 'B8': 'Número de curativos',
    'B9': 'Local de atendimento', 'B10': 'Forma de pagamento', 'B11': 'Custo de materiais por curativo',
    'B12': 'Outras despesas (total)', 'B13': 'Deslocamento por curativo', 'B14': 'Despesas fixas alocadas ao plano',
    'E6': 'RESULTADO LÍQUIDO ESTIMADO', 'G6': 'MARGEM ESTIMADA',
    'E7': se('$C$7-$G$20'), 'G7': se('$E$7/$C$7'),
    'E9': 'RESULTADO LÍQUIDO POR CURATIVO', 'G9': 'TOTAL DE DESPESAS',
    'E10': se('$E$7/$C$8'), 'G10': se('$G$20'),
    'E12': 'COMPOSIÇÃO DAS DESPESAS',
    'E13': 'Clínica', 'G13': se('ROUND($C$7*$J$3,2)'),
    'E14': 'Operadora de pagamento', 'G14': se('ROUND($C$7*$J$4,2)'),
    'E15': 'Simples Nacional', 'G15': se('ROUND($C$7*$J$5,2)'),
    'E16': 'Materiais', 'G16': se('ROUND($C$8*N($C$11),2)'),
    'E17': 'Deslocamento', 'G17': se('ROUND($C$8*N($C$13),2)'),
    'E18': 'Outras despesas', 'G18': se('N($C$12)'),
    'E19': 'Despesas fixas alocadas', 'G19': se('N($C$14)'),
    'E20': 'Total de despesas', 'G20': se('SUM($G$13:$G$19)'),
    'B16': '=IF($J$2<>"",$J$2,IF(TRIM($C$6&"")="","Calculado. Informe o nome do paciente para salvar.",' +
      'IF($E$7<0,"Atenção: resultado negativo (prejuízo).","Pronto para salvar.")))',
    'B22': 'Taxas editáveis na aba Configurações  ·  registros salvos na aba Planos confirmados',
    'J1': 'CONTROLE INTERNO — não editar',
    'J2': J2,
    'J3': taxa(locA, locB, '$C$9'),
    'J4': taxa(pagA, pagB, '$C$10'),
    'J5': '=IF(' + C + CFG.CONF_SIMPLES + '&""="","",' + C + CFG.CONF_SIMPLES + ')'
  };
}

/**
 * Cria a aba Simulador_Novo do zero (sem mesclagens e sem congelamento).
 * Não altera nenhuma outra aba. Se a aba já existir e tiver sido criada por este
 * script, é recriada; uma aba homônima de outra origem nunca é apagada.
 */
function criarSimuladorNovo() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  obterAba_(ss, CFG.ABA_CONFIG);
  obterHistorico_(ss); // confere o histórico antes de qualquer mudança

  const painelAtual = obterPainel_(ss);
  if (painelAtual && painelAtual.getName() !== CFG.ABA_PAINEL) {
    avisar_('O painel v1.2 já está em uso na aba “' + painelAtual.getName() + '”. Nenhuma aba nova foi criada.');
    return;
  }
  const existente = ss.getSheetByName(CFG.ABA_PAINEL);
  if (existente) {
    if (!ehPainel_(existente)) {
      avisar_('Já existe uma aba chamada “' + CFG.ABA_PAINEL + '” que não foi criada por este script. Renomeie-a e tente novamente.');
      return;
    }
    const r = ui.alert('Simulador de curativos', 'A aba “' + CFG.ABA_PAINEL + '” já existe. Recriá-la? ' +
      '(As entradas digitadas nela serão perdidas; o histórico não é afetado.)', ui.ButtonSet.YES_NO);
    if (r !== ui.Button.YES) return;
    ss.deleteSheet(existente);
  }

  const sh = ss.insertSheet(CFG.ABA_PAINEL, 0);
  sh.addDeveloperMetadata(CFG.MARCA_PAINEL);
  montarPainel_(sh, ss);
  ss.setActiveSheet(sh);
  sh.setActiveSelection('C6');

  const avisos = ['Aba “' + CFG.ABA_PAINEL + '” criada. Nenhuma outra aba foi alterada.'];
  const pend = pendenciasConfig_(ss);
  if (pend.length) avisos.push('', 'Pendências em Configurações:', '• ' + pend.join('\n• '));
  avisos.push('', 'Próximo passo: menu Curativos → Testar cálculos do Simulador_Novo.');
  avisar_(avisos.join('\n'));
}

function montarPainel_(sh, ss) {
  const spec = especificacaoPainel_();

  // Grade enxuta: 10 colunas (J oculta) e 24 linhas — cabe num monitor comum sem rolagem lateral
  if (sh.getMaxColumns() > 10) sh.deleteColumns(11, sh.getMaxColumns() - 10);
  if (sh.getMaxRows() > 24) sh.deleteRows(25, sh.getMaxRows() - 24);
  sh.setHiddenGridlines(true);
  sh.setTabColor(COR.PETROLEO);

  [18, 250, 170, 28, 240, 16, 200, 18, 18, 200].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  for (let r = 1; r <= 24; r++) sh.setRowHeight(r, 30);
  sh.setRowHeight(1, 12); sh.setRowHeight(2, 42); sh.setRowHeight(3, 24); sh.setRowHeight(4, 14);
  sh.setRowHeight(7, 40); sh.setRowHeight(10, 40); sh.setRowHeight(18, 46);

  const tudo = sh.getRange('A1:J24');
  tudo.setFontFamily('Arial').setFontSize(10).setFontColor(COR.TEXTO).setBackground(COR.FUNDO)
    .setVerticalAlignment('middle').setWrap(false);

  Object.keys(spec).forEach(function (a1) {
    const v = spec[a1];
    if (typeof v === 'string' && v.charAt(0) === '=') sh.getRange(a1).setFormula(v);
    else sh.getRange(a1).setValue(v);
  });

  // Cabeçalho
  sh.getRange('B2:G3').setBackground(COR.MARINHO).setFontColor(COR.BRANCO);
  sh.getRange('B2').setFontSize(17).setFontWeight('bold');
  sh.getRange('B3').setFontSize(9).setFontColor('#C9D6E8');

  // Títulos das colunas
  sh.getRange('B5:C5').setBorder(null, null, true, null, null, null, COR.MARINHO, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange('E5:G5').setBorder(null, null, true, null, null, null, COR.PETROLEO, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange('B5').setFontColor(COR.MARINHO).setFontWeight('bold').setFontSize(11);
  sh.getRange('E5').setFontColor(COR.PETROLEO).setFontWeight('bold').setFontSize(11);

  // Entradas
  sh.getRange('B6:B14').setFontColor(COR.TEXTO);
  const ent = sh.getRange('C6:C14');
  ent.setBackground(COR.BRANCO).setFontSize(11).setFontWeight('bold').setFontColor(COR.MARINHO)
    .setHorizontalAlignment('right')
    .setBorder(true, true, true, true, null, true, COR.BORDA, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange('C6').setHorizontalAlignment('left');
  sh.getRange('C9:C10').setHorizontalAlignment('left');
  sh.getRange('C7').setNumberFormat(FMT_MOEDA);
  sh.getRange('C8').setNumberFormat('0');
  sh.getRange('C11:C14').setNumberFormat(FMT_MOEDA);

  // Cartões de destaque (2 × 2)
  [['E6:E7', COR.CARD_PETROLEO, COR.PETROLEO], ['G6:G7', COR.CARD_PETROLEO, COR.PETROLEO],
   ['E9:E10', COR.CARD_MARINHO, COR.MARINHO], ['G9:G10', COR.CARD_MARINHO, COR.MARINHO]].forEach(function (c) {
    const r = sh.getRange(c[0]);
    r.setBackground(c[1]).setBorder(true, true, true, true, null, null, c[2], SpreadsheetApp.BorderStyle.SOLID);
    r.offset(0, 0, 1, 1).setFontSize(8).setFontWeight('bold').setFontColor(c[2]).setVerticalAlignment('bottom');
    r.offset(1, 0, 1, 1).setFontSize(20).setFontWeight('bold').setFontColor(COR.MARINHO).setVerticalAlignment('top');
  });
  sh.getRange('E7').setNumberFormat(FMT_MOEDA);
  sh.getRange('E10').setNumberFormat(FMT_MOEDA);
  sh.getRange('G10').setNumberFormat(FMT_MOEDA);
  sh.getRange('G7').setNumberFormat(FMT_PCT);

  // Composição
  sh.getRange('E12').setFontColor(COR.PETROLEO).setFontWeight('bold').setFontSize(9);
  sh.getRange('E12:G12').setBorder(null, null, true, null, null, null, COR.PETROLEO, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange('E13:G19').setBackground(COR.BRANCO)
    .setBorder(null, null, true, null, null, true, '#E3E8EF', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange('G13:G20').setNumberFormat(FMT_MOEDA).setHorizontalAlignment('right');
  sh.getRange('E20:G20').setBackground(COR.CARD_MARINHO).setFontWeight('bold').setFontColor(COR.MARINHO)
    .setBorder(true, null, true, null, null, null, COR.MARINHO, SpreadsheetApp.BorderStyle.SOLID);

  // Situação e rodapé
  sh.getRange('B16:C16').setBackground(COR.OK_FUNDO);
  sh.getRange('B16').setFontWeight('bold').setFontColor(COR.PETROLEO);
  sh.getRange('B22').setFontSize(8).setFontColor(COR.SUAVE);

  // Controle interno
  sh.getRange('J1:J5').setFontSize(8).setFontColor(COR.SUAVE).setBackground(COR.BRANCO);
  sh.hideColumns(10);

  aplicarValidacoes_(sh, ss);
  aplicarDestaques_(sh);
  protegerFormulas_(sh, spec);
  instalarBotoes_(sh);
}

function aplicarValidacoes_(sh, ss) {
  const conf = obterAba_(ss, CFG.ABA_CONFIG);
  const lista = function (a1, ajuda) {
    const nomes = conf.getRange(a1.replace(/\$/g, '').replace(/:B/, ':A'));
    return SpreadsheetApp.newDataValidation().requireValueInRange(nomes, true)
      .setAllowInvalid(false).setHelpText(ajuda).build();
  };
  const regra = function (formula, ajuda) {
    return SpreadsheetApp.newDataValidation().requireFormulaSatisfied(formula)
      .setAllowInvalid(false).setHelpText(ajuda).build();
  };
  sh.getRange('C7').setDataValidation(regra('=AND(ISNUMBER(C7),C7>0)', 'Receita bruta: valor maior que zero.'));
  sh.getRange('C8').setDataValidation(regra('=AND(ISNUMBER(C8),C8>=1,C8=INT(C8))', 'Número inteiro de curativos, maior que zero.'));
  sh.getRange('C9').setDataValidation(lista(CFG.CONF_LOCAIS, 'Escolha um local da lista (taxas em Configurações).'));
  sh.getRange('C10').setDataValidation(lista(CFG.CONF_PAGAMENTOS, 'Escolha uma forma de pagamento da lista.'));
  sh.getRange('C11:C14').setDataValidation(regra('=AND(ISNUMBER(C11),C11>=0)', 'Valor maior ou igual a zero (ou deixe em branco).'));
}

function aplicarDestaques_(sh) {
  const regra = function (a1, formula, fundo, texto) {
    return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula)
      .setBackground(fundo).setFontColor(texto).setRanges([sh.getRange(a1)]).build();
  };
  sh.setConditionalFormatRules([
    regra('E6:E7', '=AND(ISNUMBER($E$7),$E$7<0)', COR.ALERTA_FUNDO, COR.ALERTA_TEXTO),
    regra('E9:E10', '=AND(ISNUMBER($E$10),$E$10<0)', COR.ALERTA_FUNDO, COR.ALERTA_TEXTO),
    regra('G6:G7', '=AND(ISNUMBER($G$7),$G$7<0)', COR.ALERTA_FUNDO, COR.ALERTA_TEXTO),
    regra('B16:C16', '=AND($J$2<>"",NOT(AND($C$7="",$C$8="")))', COR.ALERTA_FUNDO, COR.ALERTA_TEXTO),
    regra('B16:C16', '=OR($J$2<>"",TRIM($C$6&"")="",AND(ISNUMBER($E$7),$E$7<0))', COR.AVISO_FUNDO, COR.AVISO_TEXTO)
  ]);
}

/** Proteção só de aviso nas fórmulas: impede apagar sem querer, sem bloquear o usuário. */
function protegerFormulas_(sh, spec) {
  const formulas = Object.keys(spec).filter(function (a1) { return String(spec[a1]).charAt(0) === '='; });
  sh.getRangeList(formulas).getRanges().forEach(function (r) {
    r.protect().setDescription('Fórmula do simulador v1.2').setWarningOnly(true);
  });
}

function instalarBotoes_(sh) {
  sh.getImages().forEach(function (img) {
    const s = img.getScript();
    if (s === 'salvarSimulacao' || s === 'novaSimulacao') img.remove();
  });
  [[BOTAO_SALVAR_PNG, 'salvarSimulacao', 'Salvar simulação', 2, 220],
   [BOTAO_NOVA_PNG, 'novaSimulacao', 'Nova simulação', 3, 160]].forEach(function (b) {
    const blob = Utilities.newBlob(Utilities.base64Decode(b[0]), 'image/png', b[1] + '.png');
    const img = sh.insertImage(blob, b[3], 18, 0, 3);
    img.setWidth(b[4]).setHeight(40);
    img.assignScript(b[1]);
    img.setAltTextTitle(b[2]);
  });
}

/* ======================================================================
 * SALVAR E NOVA SIMULAÇÃO
 * ==================================================================== */

function salvarSimulacao() {
  const ss = SpreadsheetApp.getActive();
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) {
    avisar_('Outro salvamento está em andamento. Aguarde alguns segundos e tente novamente.');
    return;
  }
  try {
    SpreadsheetApp.flush();
    const origem = interfaceAtiva_(ss);
    if (!origem) {
      avisar_('Abra a aba do simulador (' + CFG.ABA_PAINEL + ' ou ' + CFG.ABA_ANTIGA + ') antes de salvar.');
      return;
    }
    const entradas = lerCelulas_(origem.aba, origem.layout.entradas);
    const taxas = lerTaxas_(obterAba_(ss, CFG.ABA_CONFIG));

    const r = validarECalcular_(entradas, taxas);
    if (r.erros.length) {
      avisar_('A simulação não foi salva. Corrija:\n\n• ' + r.erros.join('\n• '));
      return;
    }
    const divergencias = conferirResultados_(r.calc, lerCelulas_(origem.aba, origem.layout.resultados));
    if (divergencias.length) {
      avisar_('A simulação não foi salva: os resultados exibidos não conferem com o cálculo de verificação.\n\n• ' +
        divergencias.join('\n• ') + '\n\nVerifique se alguma fórmula da aba “' + origem.aba.getName() + '” foi alterada.');
      return;
    }

    const props = PropertiesService.getDocumentProperties();
    const assinatura = JSON.stringify([entradas, taxas.usadas]);
    const ultimo = JSON.parse(props.getProperty('ULTIMO_SALVAMENTO') || 'null');
    if (ultimo && ultimo.assinatura === assinatura && Date.now() - ultimo.ts < CFG.JANELA_DUPLICIDADE_MS) {
      ss.toast('Esta simulação acabou de ser salva. Nenhuma cópia foi criada.', 'Já salva', 5);
      return;
    }

    const hist = obterHistorico_(ss);
    const registro = montarRegistro_(Utilities.getUuid(), new Date(), r.calc);
    const linha = proximaLinha_(hist);
    // Grava apenas na linha livre seguinte; somente valores, nunca fórmulas.
    hist.getRange(linha, 1, 1, registro.length)
      .setValues([registro])
      .setNumberFormats([COLUNAS_HISTORICO.map(function (c) { return c[1]; })]);
    SpreadsheetApp.flush();

    props.setProperty('ULTIMO_SALVAMENTO', JSON.stringify({ assinatura: assinatura, ts: Date.now() }));
    ss.toast(r.calc.nome + ' — registro gravado na linha ' + linha + ' de “' + hist.getName() + '”.', 'Simulação salva', 6);
  } finally {
    lock.releaseLock();
  }
}

/** Limpa somente as entradas do painel (fórmulas, formatos e validações permanecem). */
function novaSimulacao() {
  const ss = SpreadsheetApp.getActive();
  const painel = obterPainel_(ss);
  if (!painel) { avisar_('A aba do painel v1.2 não existe. Use Curativos → Criar aba Simulador_Novo.'); return; }
  const e = LAYOUTS.painel.entradas;
  painel.getRangeList(Object.keys(e).map(function (k) { return e[k]; })).clearContent();
  ss.setActiveSheet(painel);
  painel.setActiveSelection(e.nome);
  ss.toast('Entradas limpas. O histórico não foi alterado.', 'Nova simulação', 4);
}

/* ======================================================================
 * TESTE NA PLANILHA (não grava no histórico)
 * ==================================================================== */

/**
 * Preenche o painel com o caso de aceitação, lê os resultados calculados pelas
 * fórmulas do Google Planilhas, compara com o esperado e restaura as entradas.
 */
function testarSimuladorNovo() {
  const ss = SpreadsheetApp.getActive();
  const sh = obterPainel_(ss);
  if (!sh) { avisar_('Crie primeiro a aba: Curativos → Criar aba Simulador_Novo.'); return; }
  const e = LAYOUTS.painel.entradas, res = LAYOUTS.painel.resultados;
  const chaves = Object.keys(e);
  const backup = chaves.map(function (k) { return sh.getRange(e[k]).getValue(); });
  const histAntes = obterHistorico_(ss).getLastRow();

  const caso = { nome: 'Alexandre', receita: 1500, curativos: 6, local: 'Clínica Center', pagamento: 'Pix',
    materialUnit: 60, outras: 0, deslocUnit: '', fixas: '' };
  const esperado = { clinica: 300, operadora: 0, simples: 90, materiais: 360, deslocamento: 0, outras: 0, fixas: 0,
    total: 750, liquido: 750, porCurativo: 125, margem: 0.5 };
  const linhas = [];
  let falhas = 0;
  try {
    chaves.forEach(function (k) { sh.getRange(e[k]).setValue(caso[k]); });
    SpreadsheetApp.flush();
    const lido = lerCelulas_(sh, res);
    Object.keys(esperado).forEach(function (k) {
      const ok = typeof lido[k] === 'number' && Math.abs(lido[k] - esperado[k]) < 1e-9;
      if (!ok) falhas++;
      linhas.push((ok ? '✔ ' : '✘ ') + k + ': ' + lido[k] + (ok ? '' : ' (esperado ' + esperado[k] + ')'));
    });
    const calc = validarECalcular_(lerCelulas_(sh, e), lerTaxas_(obterAba_(ss, CFG.ABA_CONFIG)));
    const conf = calc.erros.length ? calc.erros : conferirResultados_(calc.calc, lido);
    if (conf.length) { falhas++; linhas.push('✘ verificação do script: ' + conf.join('; ')); }
    else linhas.push('✔ cálculo do script confere com as fórmulas');
  } finally {
    chaves.forEach(function (k, i) { sh.getRange(e[k]).setValue(backup[i]); });
    SpreadsheetApp.flush();
  }
  const histDepois = obterHistorico_(ss).getLastRow();
  if (histDepois !== histAntes) { falhas++; linhas.push('✘ o histórico mudou durante o teste'); }
  else linhas.push('✔ histórico intacto (' + histAntes + ' linhas)');
  avisar_((falhas ? 'TESTE COM FALHAS (' + falhas + ')' : 'TESTE APROVADO') + '\n\n' + linhas.join('\n'));
}

/* ======================================================================
 * MANUTENÇÃO (executadas só pelo menu, com confirmação)
 * ==================================================================== */

/**
 * Na versão 1.1 em uso, A17:B18 de Configurações está mesclada e a taxa do
 * Cartão 3x (B17) ficou inacessível e vazia. Desfaz só essa mesclagem e
 * preenche 8,4% se a célula estiver vazia. Nada mais é alterado.
 */
function repararCartao3x() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  const conf = obterAba_(ss, CFG.ABA_CONFIG);
  if (String(conf.getRange('A17').getValue()).trim() !== 'Cartão 3x') {
    avisar_('A linha 17 de Configurações não é “Cartão 3x”. Nada foi alterado.');
    return;
  }
  const b17 = conf.getRange('B17');
  const mesclada = conf.getRange('A17:B18').getMergedRanges().length > 0;
  if (!mesclada && b17.getValue() !== '') { avisar_('A taxa do Cartão 3x já está preenchida (' + b17.getDisplayValue() + ').'); return; }
  const r = ui.alert('Reparar Configurações', 'Desfazer a mesclagem de A17:B18 e preencher a taxa do Cartão 3x com 8,4%?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  if (mesclada) conf.getRange('A17:B18').breakApart();
  if (b17.getValue() === '') b17.setValue(0.084).setNumberFormat('0.0%');
  avisar_('Cartão 3x configurado: ' + b17.getDisplayValue() + '. A taxa continua editável em Configurações!B17.');
}

/**
 * Após aprovação: o painel passa a se chamar "Simulador" e a aba antiga é
 * renomeada e ocultada (não é apagada). Para desfazer, renomeie de volta.
 */
function substituirInterfaceAntiga() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  const painel = obterPainel_(ss);
  if (!painel) { avisar_('A aba do painel v1.2 não existe.'); return; }
  if (painel.getName() === CFG.ABA_ANTIGA) { avisar_('A substituição já foi feita.'); return; }
  if (ss.getSheetByName(CFG.ABA_ANTIGA_ARQUIVO)) {
    avisar_('Já existe a aba “' + CFG.ABA_ANTIGA_ARQUIVO + '”. Renomeie-a antes de continuar.');
    return;
  }
  const r = ui.alert('Substituir interface', 'A aba “' + CFG.ABA_ANTIGA + '” será renomeada para “' + CFG.ABA_ANTIGA_ARQUIVO +
    '” e ocultada (não será apagada). “' + CFG.ABA_PAINEL + '” passará a se chamar “' + CFG.ABA_ANTIGA + '”. Continuar?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  const antiga = ss.getSheetByName(CFG.ABA_ANTIGA);
  if (antiga) antiga.setName(CFG.ABA_ANTIGA_ARQUIVO).hideSheet();
  painel.setName(CFG.ABA_ANTIGA);
  ss.setActiveSheet(painel);
  ss.moveActiveSheet(1);
  avisar_('Interface substituída. O histórico e as Configurações não foram alterados.');
}

/* ======================================================================
 * LEITURA DA PLANILHA
 * ==================================================================== */

function ehPainel_(sh) {
  return sh.getDeveloperMetadata().some(function (m) { return m.getKey() === CFG.MARCA_PAINEL; });
}

function obterPainel_(ss) {
  const porNome = ss.getSheetByName(CFG.ABA_PAINEL);
  if (porNome && ehPainel_(porNome)) return porNome;
  const abas = ss.getSheets();
  for (let i = 0; i < abas.length; i++) if (ehPainel_(abas[i])) return abas[i];
  return null;
}

/** Interface de onde salvar: a aba ativa, se for um dos simuladores; senão, o painel v1.2. */
function interfaceAtiva_(ss) {
  const ativa = ss.getActiveSheet();
  if (ativa && ehPainel_(ativa)) return { aba: ativa, layout: LAYOUTS.painel };
  if (ativa && ativa.getName() === CFG.ABA_ANTIGA) return { aba: ativa, layout: LAYOUTS.antigo };
  const painel = obterPainel_(ss);
  return painel ? { aba: painel, layout: LAYOUTS.painel } : null;
}

function lerCelulas_(sh, mapa) {
  const out = {};
  Object.keys(mapa).forEach(function (k) { out[k] = sh.getRange(mapa[k]).getValue(); });
  return out;
}

function lerTaxas_(conf) {
  const tabela = function (a1) {
    const mapa = {};
    conf.getRange(a1.replace(/\$/g, '')).getValues().forEach(function (l) {
      const nome = String(l[0]).trim();
      if (nome) mapa[nome] = l[1];
    });
    return mapa;
  };
  return { locais: tabela(CFG.CONF_LOCAIS), pagamentos: tabela(CFG.CONF_PAGAMENTOS),
    simples: conf.getRange(CFG.CONF_SIMPLES.replace(/\$/g, '')).getValue() };
}

function pendenciasConfig_(ss) {
  const t = lerTaxas_(obterAba_(ss, CFG.ABA_CONFIG));
  const p = [];
  Object.keys(t.pagamentos).forEach(function (k) {
    if (typeof t.pagamentos[k] !== 'number') p.push(k + ': taxa não configurada (simulações com essa forma ficam bloqueadas).');
  });
  if (p.some(function (x) { return x.indexOf('Cartão 3x') === 0; })) {
    p.push('Para o Cartão 3x (8,4%), use Curativos → Reparar taxa do Cartão 3x em Configurações.');
  }
  return p;
}

/* ======================================================================
 * REGRAS (funções puras — mesmas regras da versão 1.1)
 * ==================================================================== */

/** Arredondamento a 2 casas igual ao ROUND do Planilhas (metade se afasta do zero). */
function arred2_(x) {
  const s = x < 0 ? -1 : 1;
  return s * Math.round(Math.abs(x) * 100 + 1e-7) / 100;
}

/** Valida entradas e taxas e calcula o resultado. Retorna { erros: [], calc }. */
function validarECalcular_(e, taxas) {
  const erros = [];
  const ehNumero = function (x) { return typeof x === 'number' && isFinite(x); };
  const vazio = function (x) { return x === '' || x === null || x === undefined; };

  const nome = String(vazio(e.nome) ? '' : e.nome).trim();
  if (!nome) erros.push('Informe o nome do paciente.');
  if (!ehNumero(e.receita) || e.receita <= 0) erros.push('Receita bruta: informe um valor maior que zero.');
  if (!ehNumero(e.curativos) || e.curativos <= 0 || Math.floor(e.curativos) !== e.curativos) {
    erros.push('Número de curativos: informe um número inteiro maior que zero.');
  }

  const local = String(e.local).trim(), pagamento = String(e.pagamento).trim();
  const tl = taxas.locais[local], tp = taxas.pagamentos[pagamento];
  const confereTaxa = function (existe, taxa, rotulo, oQue) {
    if (!existe) erros.push(rotulo + ': selecione uma opção válida da lista.');
    else if (!ehNumero(taxa)) erros.push('A taxa de “' + oQue + '” não está configurada na aba Configurações.');
    else if (taxa < 0 || taxa >= 1) erros.push('A taxa de “' + oQue + '” em Configurações está fora de 0% a 99,9%.');
  };
  confereTaxa(!!local && local in taxas.locais, tl, 'Local de atendimento', local);
  confereTaxa(!!pagamento && pagamento in taxas.pagamentos, tp, 'Forma de pagamento', pagamento);
  confereTaxa(true, taxas.simples, 'Simples Nacional', 'Simples Nacional');

  const opcional = function (x, rotulo) {
    if (vazio(x)) return 0;
    if (!ehNumero(x) || x < 0) { erros.push(rotulo + ': use um valor maior ou igual a zero ou deixe em branco.'); return 0; }
    return x;
  };
  const materialUnit = opcional(e.materialUnit, 'Custo de materiais por curativo');
  const deslocUnit = opcional(e.deslocUnit, 'Deslocamento por curativo');
  const outras = opcional(e.outras, 'Outras despesas');
  const fixas = opcional(e.fixas, 'Despesas fixas alocadas');

  taxas.usadas = [tl, tp, taxas.simples];
  if (erros.length) return { erros: erros, calc: null };

  const receita = e.receita, n = e.curativos;
  const c = {
    nome: nome, receita: receita, curativos: n, local: local, pagamento: pagamento,
    materialUnit: materialUnit, deslocUnit: deslocUnit, outras: outras, fixas: fixas,
    pctClinica: tl, pctOperadora: tp, pctSimples: taxas.simples,
    clinica: arred2_(receita * tl),                 // Clínica Center 20% / Domicílio 0%
    operadora: arred2_(receita * tp),               // Dinheiro/Pix 0%, 2x 6%, 3x 8,4%, 1x configurável
    simples: arred2_(receita * taxas.simples),      // 6% da receita bruta, todas as formas
    materiais: arred2_(n * materialUnit),
    deslocamento: arred2_(n * deslocUnit)           // unitário × quantidade
  };
  c.total = c.clinica + c.operadora + c.simples + c.materiais + c.deslocamento + outras + fixas; // fixas: uma vez
  c.liquido = receita - c.total;
  c.porCurativo = c.liquido / n;
  c.margem = c.liquido / receita;                   // resultado ÷ receita bruta
  if (![c.total, c.liquido, c.porCurativo, c.margem].every(ehNumero)) {
    return { erros: ['Não foi possível obter um resultado numérico válido.'], calc: null };
  }
  return { erros: [], calc: c };
}

function conferirResultados_(calc, lidos) {
  const rotulos = {
    clinica: 'Clínica', operadora: 'Operadora', simples: 'Simples Nacional', materiais: 'Materiais',
    deslocamento: 'Deslocamento', outras: 'Outras despesas', fixas: 'Despesas fixas', total: 'Total de despesas',
    liquido: 'Resultado líquido', porCurativo: 'Resultado por curativo', margem: 'Margem'
  };
  const problemas = [];
  Object.keys(rotulos).forEach(function (k) {
    const v = lidos[k];
    if (typeof v !== 'number' || !isFinite(v)) problemas.push(rotulos[k] + ': resultado vazio ou inválido na tela.');
    else if (Math.abs(v - calc[k]) > CFG.TOLERANCIA) problemas.push(rotulos[k] + ': valor exibido difere do cálculo de verificação.');
  });
  return problemas;
}

/** Linha do histórico, na ordem das 23 colunas de Planos confirmados (somente valores). */
function montarRegistro_(id, data, c) {
  return [
    id, data, c.nome, c.receita, c.curativos, c.local, c.pagamento,
    c.materialUnit, c.materiais, c.deslocUnit, c.deslocamento, c.outras, c.fixas,
    c.pctClinica, c.clinica, c.pctOperadora, c.operadora, c.pctSimples, c.simples,
    c.total, c.liquido, arred2_(c.porCurativo), c.margem
  ];
}

/* ======================================================================
 * APOIO
 * ==================================================================== */

function obterAba_(ss, nome) {
  const aba = ss.getSheetByName(nome);
  if (!aba) throw new Error('Aba “' + nome + '” não encontrada. Não renomeie as abas do simulador.');
  return aba;
}

/** Confere os 23 cabeçalhos antes de gravar; se não baterem, nada é gravado. */
function obterHistorico_(ss) {
  const aba = obterAba_(ss, CFG.ABA_HISTORICO);
  const cab = aba.getRange(CFG.HIST_LINHA_CABECALHO, 1, 1, COLUNAS_HISTORICO.length).getValues()[0];
  const diferentes = COLUNAS_HISTORICO.filter(function (c, i) { return String(cab[i]).trim() !== c[0]; });
  if (diferentes.length) {
    throw new Error('O cabeçalho de “' + CFG.ABA_HISTORICO + '” (linha ' + CFG.HIST_LINHA_CABECALHO +
      ') foi alterado — coluna(s): ' + diferentes.map(function (c) { return c[0]; }).join(', ') + '. Nada foi gravado.');
  }
  return aba;
}

/** Primeira linha após o último registro. Nunca reutiliza uma linha ocupada. */
function proximaLinha_(hist) {
  const linha = Math.max(hist.getLastRow() + 1, CFG.HIST_PRIMEIRA_LINHA);
  if (linha > hist.getMaxRows()) hist.insertRowsAfter(hist.getMaxRows(), 100);
  return linha;
}

function avisar_(msg) {
  SpreadsheetApp.getUi().alert('Simulador de curativos', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

// Imagens dos botões (geradas por ferramentas/botoes.py; sem dependência externa)
const BOTAO_SALVAR_PNG = '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';
const BOTAO_NOVA_PNG = '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';
