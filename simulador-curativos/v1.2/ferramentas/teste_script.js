// Testa Codigo.gs (v1.2) em Node sobre a planilha v1.1 em uso (aba Planos confirmados com 2 registros reais).
// Os resultados das fórmulas do painel vêm de um recálculo real (LibreOffice ou Google Planilhas).
// Uso: node teste_script.js Codigo.gs planilha_v11.json cenarios_resultados.json
const fs = require('fs'), vm = require('vm');
const { planilhaDeJson, criarAmbiente } = require('./mock_apps_script');
const [, , GS, DADOS, CENARIOS] = process.argv;
const dados = JSON.parse(fs.readFileSync(DADOS, 'utf8'));
const CEN = JSON.parse(fs.readFileSync(CENARIOS, 'utf8'));
const ENT = ['C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];

const ss = planilhaDeJson(dados);
const amb = criarAmbiente(ss);
vm.createContext(amb.ctx);
vm.runInContext(fs.readFileSync(GS, 'utf8') +
  '\nthis.api={criarSimuladorNovo,salvarSimulacao,novaSimulacao,testarSimuladorNovo,repararCartao3x,substituirInterfaceAntiga};', amb.ctx);
const api = amb.ctx.api;

const log = [];
const ok = (nome, cond, det = '') => { log.push(`${cond ? 'PASSOU' : 'FALHOU'}  ${nome}${det ? '  — ' + det : ''}`); if (!cond) process.exitCode = 1; };
const hist = () => ss.getSheetByName('Planos confirmados');
const linha = r => hist().getRange(r, 1, 1, 23).getValues()[0];
const fotografia = (de, ate) => JSON.stringify(Array.from({ length: ate - de + 1 }, (_, i) => linha(de + i)));
const quase = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9;

// Resultados das fórmulas do painel: vêm do cenário recalculado cujas entradas coincidem com as do painel
function ligarResolver(painel) {
  painel.resolver = (a1, aba) => {
    const atual = ENT.map(k => aba.valor(k));
    for (const c of Object.values(CEN)) {
      if (ENT.every((k, i) => (c.entradas[k] === null ? '' : c.entradas[k]) === atual[i])) {
        const v = c.resultados[a1];
        return v === null || v === undefined ? '' : v;
      }
    }
    return '';
  };
}
function preencher(painel, cen) {
  const e = CEN[cen].entradas;
  ENT.forEach(k => { painel.cel[k] = e[k] === null ? '' : e[k]; });
}

const original = fotografia(5, 6);
ok('Histórico original: 2 registros (linhas 5 e 6)', hist().getLastRow() === 6, linha(5)[0] + ' / ' + linha(6)[0]);

// 1. Criação do painel
api.criarSimuladorNovo();
let painel = ss.getSheetByName('Simulador_Novo');
ligarResolver(painel);
ok('Aba Simulador_Novo criada, sem mesclagens, 2 botões', painel && painel.mescladas.length === 0 &&
  painel.imagens.map(i => i.getScript()).join() === 'salvarSimulacao,novaSimulacao');
ok('Criação não altera o histórico', fotografia(5, 6) === original);

// 2. Critério de aceitação — salvar
ss.setActiveSheet(painel);
preencher(painel, 'aceite_alexandre'); ss.alertas.length = 0;
api.salvarSimulacao();
let L = linha(7);
ok('Aceite — gravado na linha 7, sem alertas', ss.alertas.length === 0 && hist().getLastRow() === 7, ss.alertas.join(' | '));
ok('Aceite — paciente, receita, curativos, local, pagamento', L[2] === 'Alexandre' && L[3] === 1500 && L[4] === 6 && L[5] === 'Clínica Center' && L[6] === 'Pix');
ok('Aceite — Clínica R$ 300 (20%)', quase(L[14], 300) && quase(L[13], 0.2));
ok('Aceite — Simples R$ 90 (6%)', quase(L[18], 90) && quase(L[17], 0.06));
ok('Aceite — Material R$ 360', quase(L[8], 360) && quase(L[7], 60));
ok('Aceite — Operadora (Pix) R$ 0', quase(L[16], 0) && quase(L[15], 0));
ok('Aceite — Total de despesas R$ 750', quase(L[19], 750));
ok('Aceite — Resultado líquido R$ 750', quase(L[20], 750));
ok('Aceite — Resultado por curativo R$ 125', quase(L[21], 125));
ok('Aceite — Margem 50%', quase(L[22], 0.5));
ok('Aceite — ID único (UUID) e data/hora', /^[0-9a-f-]{36}$/.test(L[0]) && Object.prototype.toString.call(L[1]) === '[object Date]');
ok('Aceite — somente valores estáticos (nenhuma fórmula)', L.every(v => !(typeof v === 'string' && v.startsWith('='))));
const linha7 = fotografia(7, 7);

// 3. Clique duplo
amb.avancar(2000); api.salvarSimulacao();
ok('Clique duplo (2 s) não duplica', hist().getLastRow() === 7 && /acabou de ser salva/.test(ss.toasts.at(-1)));

// 4. Segunda simulação consecutiva
amb.avancar(60000); preencher(painel, 'domicilio_2x'); api.salvarSimulacao();
L = linha(8);
ok('2ª simulação gravada na linha 8', hist().getLastRow() === 8 && L[2] === 'Paciente B');
ok('2ª — Domicílio 0%, Cartão 2x 6% = 60, deslocamento 5×20 = 100, fixas 50 uma vez',
  quase(L[14], 0) && quase(L[16], 60) && quase(L[10], 100) && quase(L[12], 50) && quase(L[19], 520) && quase(L[20], 480));
ok('1ª simulação (linha 7) inalterada após a 2ª', fotografia(7, 7) === linha7);
ok('Registros antigos (linhas 5 e 6) inalterados', fotografia(5, 6) === original);

// 5. Mudança de taxas depois de salvar não afeta registros
const conf = ss.getSheetByName('Configurações');
conf.cel.B7 = 0.3; conf.cel.B23 = 0.08;
ok('Taxas alteradas em Configurações não mudam registros gravados', fotografia(7, 7) === linha7 && fotografia(5, 6) === original);
conf.cel.B7 = 0.2; conf.cel.B23 = 0.06;

// 6. Bloqueios (nada é gravado)
for (const [cen, padrao] of [['cartao1x', /Cartão 1x.*não está configurada/], ['cartao3x', /Cartão 3x.*não está configurada/],
  ['zero_curativos', /inteiro maior que zero/], ['fracionado', /inteiro maior que zero/], ['negativo', /Outras despesas/],
  ['sem_nome', /nome do paciente/], ['vazio', /nome do paciente/]]) {
  preencher(painel, cen); ss.alertas.length = 0; const antes = hist().getLastRow(); amb.avancar(15000); api.salvarSimulacao();
  ok('Bloqueio: ' + cen, hist().getLastRow() === antes && ss.alertas.length === 1 && padrao.test(ss.alertas[0]), (ss.alertas[0] || '').split('\n').pop());
}

// 7. Integridade: resultado exibido adulterado
preencher(painel, 'aceite_alexandre'); const res = painel.resolver;
painel.resolver = (a1, aba) => (a1 === 'E7' ? 999 : res(a1, aba)); ss.alertas.length = 0; amb.avancar(15000); api.salvarSimulacao();
ok('Integridade: resultado divergente bloqueia', hist().getLastRow() === 8 && /não conferem/.test(ss.alertas[0]));
painel.resolver = res;

// 8. Prejuízo é gravado; valor com dízima arredondado como na v1.1
preencher(painel, 'prejuizo'); amb.avancar(15000); api.salvarSimulacao();
ok('Prejuízo gravado com valores negativos', quase(linha(9)[20], -153) && quase(linha(9)[22], -0.51));
preencher(painel, 'dizima'); amb.avancar(15000); api.salvarSimulacao();
L = linha(10);
const v5 = linha(5);
ok('R$ 1.300 grava igual ao registro v1.1 da linha 5 (líquido, por curativo 100,33, margem)',
  quase(L[20], v5[20]) && quase(L[21], v5[21]) && quase(L[22], v5[22]) && quase(L[19], v5[19]), `${L[21]} vs ${v5[21]}`);

// 9. Nova simulação
api.novaSimulacao();
ok('Nova simulação: entradas limpas, fórmulas mantidas, histórico intacto',
  ENT.every(k => painel.valor(k) === '') && String(painel.cel.E7).startsWith('=') && hist().getLastRow() === 10);

// 10. Aba antiga (v1.1) continua salvando durante a transição
const antiga = ss.getSheetByName('Simulador');
ss.setActiveSheet(antiga); ss.alertas.length = 0; amb.avancar(15000); api.salvarSimulacao();
L = linha(11);
ok('Salvar pela aba antiga “Simulador” (nome “Alexandre ” aparado)', ss.alertas.length === 0 && hist().getLastRow() === 11 &&
  L[2] === 'Alexandre' && quase(L[20], 750) && quase(L[21], 125));

// 11. Teste embutido (menu) — não grava e restaura entradas
ss.setActiveSheet(painel); preencher(painel, 'domicilio_2x'); ss.alertas.length = 0;
api.testarSimuladorNovo();
ok('Teste embutido aprovado', /^TESTE APROVADO/.test(ss.alertas[0]), ss.alertas[0].split('\n')[0]);
ok('Teste embutido restaura as entradas e não grava', painel.valor('C6') === 'Paciente B' && hist().getLastRow() === 11);

// 12. Cabeçalho alterado: nada é gravado
hist().cel.W4 = 'Margem'; ss.alertas.length = 0; amb.avancar(15000);
let erro = null; try { api.salvarSimulacao(); } catch (e) { erro = e.message; }
ok('Cabeçalho alterado bloqueia gravação', erro && /Margem \(%\)/.test(erro) && hist().getLastRow() === 11, erro);
hist().cel.W4 = 'Margem (%)';

// 13. Reparar Cartão 3x
const confAntes = JSON.stringify(Object.entries(conf.cel).filter(([k]) => k !== 'B17'));
api.repararCartao3x();
ok('Reparo Cartão 3x: desfaz só A17:B18 e grava 8,4%', conf.cel.B17 === 0.084 && conf.mescladas.length === 2 &&
  JSON.stringify(Object.entries(conf.cel).filter(([k]) => k !== 'B17')) === confAntes);

// 14. Recriar painel; aba homônima estranha não é apagada
api.criarSimuladorNovo(); painel = ss.getSheetByName('Simulador_Novo'); ligarResolver(painel);
ok('Recriar painel: uma única aba nova e 2 botões', ss.abas.filter(a => a.nome === 'Simulador_Novo').length === 1 && painel.imagens.length === 2);
const estranha = ss.getSheetByName('Simulador_Novo'); estranha.meta = []; ss.alertas.length = 0;
api.criarSimuladorNovo();
ok('Aba “Simulador_Novo” sem a marca do script não é apagada', ss.getSheetByName('Simulador_Novo') === estranha && /não foi criada por este script/.test(ss.alertas[0]));
estranha.meta = ['simulador_curativos_painel_v12'];

// 15. Substituição definitiva (após aprovação)
api.substituirInterfaceAntiga();
const arq = ss.getSheetByName('Simulador v1.1 (arquivo)');
ok('Substituição: antiga renomeada e oculta, painel vira “Simulador” na 1ª posição',
  arq === antiga && arq.oculta && ss.abas[0] === painel && painel.getName() === 'Simulador');
preencher(painel, 'aceite_alexandre'); ss.setActiveSheet(painel); amb.avancar(15000); api.salvarSimulacao();
ok('Após substituição, salvar continua lendo o painel novo', hist().getLastRow() === 12 && quase(linha(12)[20], 750));

ss.alertas.length = 0; api.criarSimuladorNovo();
ok('Após substituição, “Criar aba” não duplica o painel', !ss.getSheetByName('Simulador_Novo') && /já está em uso/.test(ss.alertas[0]));
ok('Ao final, registros originais (linhas 5 e 6) idênticos', fotografia(5, 6) === original);

console.log(log.join('\n'));
console.log('\nHistórico final (linha | paciente | pagamento | despesas | líquido | por curativo | margem):');
for (let r = 5; r <= hist().getLastRow(); r++) {
  const l = linha(r);
  console.log(`  ${r} | ${l[2]} | ${l[6]} | ${l[19]} | ${l[20]} | ${l[21]} | ${(l[22] * 100).toFixed(2)}%`);
}
