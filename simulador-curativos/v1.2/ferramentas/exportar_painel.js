// Executa criarSimuladorNovo() na planilha simulada e exporta o conteúdo da aba Simulador_Novo
// (textos e fórmulas) para ser aplicado numa cópia de teste no Google Planilhas / LibreOffice.
// Uso: node exportar_painel.js Codigo.gs planilha_v11.json saida.json
const fs = require('fs'), vm = require('vm');
const { planilhaDeJson, criarAmbiente } = require('./mock_apps_script');
const [, , GS, DADOS, SAIDA] = process.argv;
const ss = planilhaDeJson(JSON.parse(fs.readFileSync(DADOS, 'utf8')));
const antes = JSON.stringify(ss.abas.map(a => [a.nome, a.cel, a.mescladas]));
const { ctx } = criarAmbiente(ss);
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(GS, 'utf8') + '\nthis.api={criarSimuladorNovo};', ctx);
ctx.api.criarSimuladorNovo();
const p = ss.getSheetByName('Simulador_Novo');
const depois = JSON.stringify(ss.abas.filter(a => a !== p).map(a => [a.nome, a.cel, a.mescladas]));
console.log('alertas:', ss.alertas);
console.log('outras abas inalteradas:', antes === depois);
console.log('posição da aba nova:', ss.abas.indexOf(p), '| mesclagens na aba nova:', p.mescladas.length,
  '| botões:', p.imagens.map(i => i.script + '@' + i.col + ',' + i.row), '| colunas ocultas:', p.ocultas);
fs.writeFileSync(SAIDA, JSON.stringify({ celulas: p.cel, formatos: p.fmt }, null, 1));
