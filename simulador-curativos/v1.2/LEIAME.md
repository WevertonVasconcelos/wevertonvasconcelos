# Simulador de Curativos — versão 1.2 (nova interface)

Véras Vasconcelos Medicina e Saúde · uso interno

A versão 1.2 muda **somente a interface**. As regras de cálculo, as taxas (aba **Configurações**) e o histórico (aba **Planos confirmados**, 23 colunas, registros existentes) continuam os mesmos.

| Arquivo | O que é |
|---|---|
| `apps-script/Codigo.gs` | Código completo do Apps Script (painel, salvar, nova simulação, teste, substituição) |
| `apps-script/botao_*.png` | Imagens dos botões (já embutidas no código; os arquivos são só referência) |
| `ferramentas/` | Bateria de testes fora do Google (`rodar_testes.sh <planilha.xlsx>`) |

---

## 1. O que foi encontrado na planilha em uso (XLSX enviado em 26/10/2026)

A planilha em uso **não é igual** à v1.1 que está neste repositório (`../PRECIFICACAO_CURATIVOS_v1.1.xlsx` / `../apps-script/Codigo.gs`). O código da v1.2 foi feito para a planilha **em uso**:

| Item | Planilha em uso |
|---|---|
| Simulador (entradas) | B5 nome · B6 receita · B7 curativos · B8 local · B9 pagamento · B10 material · **B11 outras** · **B12 deslocamento** · **B13 fixas** |
| Simulador (resultados) | B16 clínica · B17 operadora · B18 Simples · B19 materiais · B20 deslocamento · B21 outras · B22 fixas · B23 total · B26 líquido · B27 por curativo · B28 margem |
| Configurações | Locais `A7:B8` · Pagamentos `A13:B17` · Simples **`B23`** |
| Histórico | Aba **Planos confirmados**, cabeçalho na linha 4 (`ID` … `Margem (%)`), 2 registros (linhas 5 e 6), ID em formato UUID |
| Menu | “Curativos” |

**Problema encontrado:** em Configurações, as células **A17:B18 estão mescladas** (resquício da tentativa anterior). Com isso, a taxa do **Cartão 3x (B17) está vazia** e não dá para editá-la. Hoje, uma simulação em Cartão 3x fica sem resultado na aba antiga. A v1.2 também bloqueia esse caso e avisa, sem inventar taxa. Para corrigir, use **Curativos → Reparar taxa do Cartão 3x** (veja o passo 4). O **Cartão 1x** continua sem taxa, de propósito, e também fica bloqueado com aviso.

O código Apps Script atualmente instalado na planilha (o do menu “Curativos”) **não foi enviado**. Por isso, a v1.2 substitui esse código por completo e mantém o salvamento da aba antiga funcionando durante a transição (ver item 6).

---

## 2. Layout do painel (aba `Simulador_Novo`)

Sem células mescladas, sem linhas ou colunas congeladas. São 9 colunas visíveis, cerca de 960 px de largura, sem rolagem lateral num monitor comum.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Simulador de Planos de Curativos                         (faixa azul-marinho) │
│  Véras Vasconcelos · Medicina e Saúde · versão 1.2                            │
├────────────────────────────────────┬─────────────────────────────────────────┤
│ ENTRADAS DO PLANO                  │ RESULTADOS FINANCEIROS                   │
│ Nome do paciente         [C6     ] │ ┌ RESULTADO LÍQUIDO ┐ ┌ MARGEM ESTIMADA ┐ │
│ Receita bruta do plano   [C7     ] │ │ R$ 750,00   (E7)  │ │ 50,0%   (G7)    │ │
│ Número de curativos      [C8     ] │ └───────────────────┘ └─────────────────┘ │
│ Local de atendimento     [C9  ▼  ] │ ┌ LÍQUIDO/CURATIVO ─┐ ┌ TOTAL DESPESAS ─┐ │
│ Forma de pagamento       [C10 ▼  ] │ │ R$ 125,00  (E10)  │ │ R$ 750,00 (G10) │ │
│ Custo de materiais/curat.[C11    ] │ └───────────────────┘ └─────────────────┘ │
│ Outras despesas (total)  [C12    ] │ COMPOSIÇÃO DAS DESPESAS                  │
│ Deslocamento por curativo[C13    ] │ Clínica .......................  G13     │
│ Despesas fixas alocadas  [C14    ] │ Operadora de pagamento ........  G14     │
│                                    │ Simples Nacional ..............  G15     │
│ Pronto para salvar.  (B16, situação)│ Materiais .....................  G16     │
│                                    │ Deslocamento ..................  G17     │
│ [ Salvar simulação ] [Nova simulação]│ Outras despesas ...............  G18     │
│                                    │ Despesas fixas alocadas .......  G19     │
│                                    │ Total de despesas .............  G20     │
└────────────────────────────────────┴─────────────────────────────────────────┘
 Coluna J (oculta): controle interno — mensagem de validação e taxas encontradas.
```

Cores: azul-marinho `#1F3A5F`, verde-petróleo `#0F6E6E`, fundo `#F4F7FA`, cartões em tons claros dessas duas cores. Resultado negativo aparece em vermelho. A linha de situação (B16) fica vermelha em caso de erro, âmbar em caso de pendência e verde-petróleo quando a simulação está pronta para salvar.

---

## 3. Instalação (cerca de 5 minutos)

> Antes de tudo, faça uma cópia de segurança: **Arquivo → Fazer uma cópia**. A instalação não apaga nada, mas a cópia permite comparar.

1. Na planilha: **Extensões → Apps Script**.
2. **Guarde o código atual:** selecione todo o conteúdo de `Código.gs` e cole num Documento Google chamado “Backup script v1.1”.
3. Apague o conteúdo de `Código.gs` e cole **todo** o conteúdo de `apps-script/Codigo.gs`. Se houver outros arquivos `.gs` no projeto com funções `onOpen` ou `salvarSimulacao`, apague-os também (depois de copiá-los para o backup).
4. Clique em **Salvar** e recarregue a planilha (F5). O menu **Curativos** aparece com os novos itens.
5. **Curativos → Criar aba Simulador_Novo**. Na primeira vez, o Google pede autorização: Continuar → sua conta → Avançado → Acessar (não seguro) → Permitir. Depois, rode o item de novo.
   - Esse passo cria apenas a aba `Simulador_Novo`, como primeira aba, com os botões. **Nenhuma outra aba é alterada.**
   - Ao final, uma mensagem lista as pendências de Configurações (Cartão 1x e Cartão 3x sem taxa).
6. (Recomendado) **Curativos → Reparar taxa do Cartão 3x em Configurações**: desfaz **somente** a mesclagem A17:B18 e preenche B17 com 8,4% (pede confirmação). A taxa continua editável em B17.

## 4. Validação na sua planilha (antes de aprovar)

1. **Curativos → Testar cálculos do Simulador_Novo.** O script preenche o caso de aceitação, lê os resultados que o próprio Google Planilhas calculou, compara-os com o esperado e com o cálculo independente do script, e depois restaura as entradas. **Nada é gravado no histórico.** O resultado esperado é “TESTE APROVADO”.
2. **Teste de salvamento (grava 2 linhas reais no histórico):**
   1. Anote o conteúdo das linhas 5 e 6 de **Planos confirmados**.
   2. No painel, preencha: Alexandre · 1500 · 6 · Clínica Center · Pix · 60 · 0 (deixe deslocamento e fixas em branco). Confira na tela: Clínica R$ 300 · Simples R$ 90 · Materiais R$ 360 · Total R$ 750 · Resultado R$ 750 · Por curativo R$ 125 · Margem 50,0%.
   3. Clique em **Salvar simulação**. Uma nova linha (7) aparece com ID, data/hora e valores fixos.
   4. Clique em **Nova simulação**. As entradas ficam vazias e o histórico não muda.
   5. Preencha outra simulação, por exemplo: Paciente B · 1000 · 5 · Domicílio · Cartão 2x · 50 · (vazio) · 20 · 50. O resultado deve ser R$ 480 (48,0%). Salve.
   6. Confirme que a linha 7 **não mudou** e que as linhas 5 e 6 continuam idênticas ao que você anotou.
3. Se preferir não manter essas linhas de teste no histórico, faça o teste numa **cópia** da planilha (Arquivo → Fazer uma cópia). O script nunca apaga registros.

## 5. Substituição definitiva (somente após aprovação)

**Curativos → Substituir interface antiga (após aprovação).** Após confirmação:
- a aba `Simulador` antiga é renomeada para **“Simulador v1.1 (arquivo)”** e **ocultada** (não é apagada);
- `Simulador_Novo` passa a se chamar **“Simulador”** e vai para a primeira posição.

Para desfazer: reexiba a aba arquivada e renomeie as duas de volta. O script identifica o painel por um metadado interno, não pelo nome.

---

## 6. Como o salvamento funciona

- **Salvar simulação** (botão ou menu) grava a partir da aba que está aberta:
  - painel v1.2 → usa as células C6:C14 e os resultados E7, G7, E10, G13:G20;
  - aba antiga “Simulador” (durante a transição) → usa B5:B13 e B16:B28, como na v1.1.
- Antes de gravar, o script **recalcula tudo de forma independente** e só grava se o resultado coincidir com o que aparece na tela (tolerância de meio centavo). Isso detecta fórmula apagada ou alterada.
- Também confere os **23 cabeçalhos** de Planos confirmados. Se algum foi alterado, nada é gravado.
- A gravação vai para a **primeira linha livre depois do último registro**: só valores (`setValues`), com ID único (UUID, como os registros existentes) e data/hora. Nenhuma linha existente é lida para escrita, alterada, apagada ou movida.
- Arredondamento igual ao da v1.1: cada parcela em 2 casas; o “líquido por curativo” gravado tem 2 casas (ex.: 100,33); a margem é gravada sem arredondar (como no registro da linha 5).
- Proteção contra clique duplo: a mesma simulação salva de novo em menos de 10 s não é duplicada.
- **Nova simulação** limpa somente C6:C14 do painel (as fórmulas, os formatos e as listas permanecem).
- As fórmulas do painel têm proteção apenas de aviso: quem tentar editá-las recebe um alerta, mas não fica bloqueado.

## 7. Regras de cálculo (inalteradas)

```
Clínica      = receita bruta × taxa do local        (Clínica Center 20% · Domicílio 0%)
Operadora    = receita bruta × taxa do pagamento    (Dinheiro/Pix 0% · 2x 6% · 3x 8,4% · 1x configurável)
Simples      = receita bruta × 6%                   (todas as formas de pagamento)
Materiais    = curativos × material por curativo
Deslocamento = curativos × deslocamento por curativo
Outras e fixas alocadas = valores totais, aplicados uma única vez
Total        = soma das parcelas acima
Resultado    = receita bruta − total
Por curativo = resultado ÷ curativos
Margem       = resultado ÷ receita bruta
```
As taxas são lidas da aba Configurações (locais A7:B8, pagamentos A13:B17, Simples B23). Se as linhas mudarem de lugar, ajuste apenas o objeto `CFG` no início do código.

---

## 8. Testes realizados e limites

| Onde | O que foi validado | Resultado |
|---|---|---|
| **Google Planilhas (real)**, numa planilha de teste com a aba Configurações idêntica à sua e as fórmulas geradas pelo script | Caso de aceitação · Domicílio + Cartão 2x + deslocamento + fixas · Cartão 3x vazio (bloqueado) · Cartão 3x com 8,4% | ✅ Clínica 300 · Simples 90 · Material 360 · Total 750 · Resultado 750 · Por curativo 125 · Margem 0,5 · (2x) total 520, resultado 480 · (3x) operadora 84, total 744 |
| **LibreOffice**, sobre o seu XLSX | 12 cenários (aceitação, 2x, dinheiro, 3x, 1x, prejuízo, R$ 1.300 com dízima, zero curativos, fracionado, negativo, sem nome, vazio) | ✅ todos coerentes; R$ 1.300 reproduz exatamente o registro existente da linha 5 |
| **Node.js** (Codigo.gs real, APIs do Apps Script simuladas, sobre os dados do seu XLSX) | 43 verificações: criação sem tocar outras abas, aceite, 2 salvamentos consecutivos com a 1ª linha intacta, linhas 5 e 6 intactas, clique duplo, bloqueios, integridade, cabeçalho alterado, Nova simulação, salvar pela aba antiga, teste embutido, reparo do 3x, recriação, substituição, sem painel duplicado | ✅ 43/43 |

**Limitação:** não é possível executar o Apps Script dentro do Google Planilhas a partir deste ambiente. As fórmulas foram validadas no Google Planilhas real, mas a **construção visual** (cores, bordas, larguras, botões, listas e destaques) e o **salvamento real** só serão executados quando você rodar os passos 3 e 4. Por isso, **esta versão ainda não deve ser considerada validada na sua planilha**: a aprovação depende do “TESTE APROVADO” e do teste de salvamento do item 4.

Planilha de teste criada no seu Drive durante a validação: “TESTE Simulador de curativos v1.2 (cópia de teste — pode apagar)”. Ela contém apenas Configurações e as fórmulas do painel e pode ser apagada.
