# Simulador de Precificação de Curativos — MVP 1.1

Véras Vasconcelos Medicina e Saúde · uso interno

## Arquivos

| Arquivo | O que é |
|---|---|
| `PRECIFICACAO_CURATIVOS_v1.1.xlsx` | Planilha pronta para importar no Google Planilhas (3 abas, visual da v1.0 preservado) |
| `apps-script/Codigo.gs` | Código completo do Google Apps Script (menu, botão, salvamento, validações) |
| `apps-script/botao_salvar.png` | Imagem do botão (já está embutida no código; o arquivo é só referência) |
| `ferramentas/` | Scripts usados para gerar o XLSX e rodar os testes (manutenção) |

---

## 1. Importar o XLSX e converter para Google Planilhas

1. Abra o Google Drive → **Novo → Upload de arquivo** → escolha `PRECIFICACAO_CURATIVOS_v1.1.xlsx`.
2. Clique com o botão direito no arquivo → **Abrir com → Planilhas Google**.
3. Se abrir em “modo de compatibilidade” (selo **.XLSX** ao lado do nome): **Arquivo → Salvar como Planilhas Google**. Use a cópia nova (o Apps Script só funciona em arquivo nativo do Google Planilhas).

> Já existe no seu Drive a cópia de teste **“PRECIFICAÇÃO CURATIVOS v1.1 (cópia de teste)”**, criada durante o desenvolvimento e já convertida. Você pode usá-la direto como planilha oficial (renomeie) ou apagá-la e importar o XLSX.

## 2. Instalar o script

1. Na planilha convertida: **Extensões → Apps Script**.
2. Apague o conteúdo do arquivo `Código.gs` e cole **todo** o conteúdo de `apps-script/Codigo.gs`.
3. Clique em **Salvar** (ícone de disquete). Dê um nome ao projeto, por ex. “Simulador de curativos”.
4. Volte à planilha e **recarregue a página (F5)**. Aparece o menu **Simulador** na barra de menus.

## 3. Autorizar e instalar o botão (uma vez)

1. Menu **Simulador → Configurar planilha (botão, filtro, fuso)**.
2. O Google pede autorização: **Continuar → escolha sua conta → Avançado → Acessar “Simulador de curativos” (não seguro) → Permitir**.
   O aviso “não verificado” é padrão para scripts próprios; o script só acessa esta planilha.
3. Rode o mesmo item de menu de novo, se a primeira execução tiver parado na autorização.

Esse comando:
- insere o botão **Salvar simulação** ao lado do resultado (célula D26) e o vincula ao script;
- ajusta localidade para **Brasil** e fuso para **America/Sao_Paulo** (a cópia de teste veio com fuso de Los Angeles; sem isso a hora do registro sai errada);
- garante cabeçalho congelado e filtro no histórico.

Pode ser repetido a qualquer momento: não duplica o botão.

**Se o botão não aparecer** (vínculo manual, alternativa): **Inserir → Desenho** → desenhe um retângulo com o texto “Salvar simulação” → **Salvar e fechar** → clique no desenho → menu **⋮** → **Atribuir script** → digite `salvarSimulacao` → OK.

Outros usuários autorizados da planilha precisam autorizar o script uma vez, no primeiro uso.
O menu e o botão não funcionam no aplicativo de celular do Google Planilhas (limitação do Google); use pelo navegador.

## 4. Uso

Abrir a planilha → preencher os campos amarelos → conferir os resultados → clicar em **Salvar simulação** (ou menu **Simulador → Salvar simulação**) → o registro aparece na próxima linha da aba **Histórico de simulações**, com ID, data e hora. Uma mensagem discreta (canto inferior direito) confirma o ID gravado. O simulador continua preenchido.

---

## 5. Estrutura final da planilha

### Simulador
| Linha | Conteúdo |
|---|---|
| 5–13 | Entradas: nome, valor cobrado, nº de curativos, local, forma de pagamento, material/curativo, **deslocamento/curativo (novo)**, outras despesas, **despesas fixas alocadas (novo)** |
| 16–23 | Taxa da clínica, **taxa da operadora**, Simples Nacional, materiais, **deslocamento**, outras despesas, **despesas fixas**, total |
| 26–28 | Valor final, preço líquido por curativo, margem |
| 30 | Mensagem de situação (erros, prejuízo, pronto para salvar) |
| D26 | Botão **Salvar simulação** (instalado pelo script) |
| Coluna E (oculta) | Controle interno: mensagem de validação e taxas encontradas. Não editar. |

### Configurações
- Item 1: taxa por local (B7:B8).
- Item 2: taxa da operadora — **Dinheiro 0%, Pix 0%, Cartão 1x (em branco), Cartão 2x 6%, Cartão 3x 8,4%** (B13:B17).
- Item 3: alíquota do Simples Nacional, 6% (B24).
- Item 4: memória de cálculo atualizada.

### Histórico de simulações (antiga “Planos confirmados”)
Linha 4 = cabeçalho com filtro; registros a partir da linha 5. 23 colunas:
ID · Data e hora · Paciente · Receita bruta · Nº de curativos · Local · Forma de pagamento · Material por curativo · Materiais (total) · Deslocamento por curativo · Deslocamento (total) · Outras despesas · Despesas fixas alocadas · Taxa da clínica (% e R$) · Taxa da operadora (% e R$) · Simples Nacional (% e R$) · Total de descontos e despesas · Resultado líquido · Resultado por curativo · Margem.

---

## 6. Regras de cálculo

```
Materiais         = curativos × material por curativo
Deslocamento      = curativos × deslocamento por curativo
Taxa da clínica   = receita bruta × taxa do local
Taxa da operadora = receita bruta × taxa da forma de pagamento
Simples           = receita bruta × alíquota (sobre a receita integral, em todas as formas de pagamento)
Despesas totais   = clínica + operadora + Simples + materiais + deslocamento + outras + fixas
Resultado líquido = receita bruta − despesas totais        (pode ser negativo → destaque em vermelho)
Por curativo      = resultado líquido ÷ curativos
Margem            = resultado líquido ÷ receita bruta      (margem sobre a receita, não markup)
```

Campos opcionais vazios = 0. Despesas fixas alocadas e outras despesas entram uma única vez.

---

## 7. Decisões tomadas

1. **Cálculo continua nas fórmulas** (resultado aparece na hora, sem script). Ao salvar, o script **recalcula de forma independente** e só grava se bater com o que está na tela (tolerância de meio centavo). Isso detecta fórmula apagada ou alterada.
2. **Validação em três camadas:** validação de dados nas células (rejeita texto, negativos, curativos fracionados), mensagem na tela (linha 30) e validação final no script antes de gravar.
3. **Cartão 1x sem taxa:** a célula continua vazia; cálculo e salvamento ficam bloqueados com orientação. Nenhuma taxa foi inventada.
4. **Nome do paciente** é obrigatório só para salvar; o cálculo aparece sem ele (a tela avisa).
5. **Clique duplo / concorrência:** trava de documento (`LockService`) serializa execuções; a mesma simulação salva de novo em menos de **10 segundos** é ignorada (aviso “já salva”). Fora dessa janela, simulações idênticas são gravadas normalmente.
6. **ID:** `SIM-AAAAMMDD-HHMMSS-XXXX` (data/hora + 4 caracteres aleatórios): legível, ordenável e único.
7. **Valores gravados** são números estáticos (`setValues`), com formato de moeda/percentual; nunca fórmulas. Valores sem arredondamento interno (o formato exibe centavos).
8. **Aba renomeada** de “Planos confirmados” para “Histórico de simulações”, porque agora guarda toda simulação salva. A linha de apoio dinâmica foi removida. O script também reconhece o nome antigo.
9. **Registros existentes:** o XLSX recebido não tinha nenhum registro (só a linha de apoio). Se a versão em uso no Google tiver registros feitos depois, copie-os (Colar especial → somente valores) para as colunas equivalentes do novo histórico: Paciente, Receita bruta, Nº de curativos, Local, Forma de pagamento, Total de despesas, Resultado líquido e Resultado por curativo.
10. **“Pix / dinheiro”** foi separado em **Dinheiro** e **Pix**, ambos 0%.
11. **Simples Nacional** passou a incidir sobre a receita bruta integral (antes era sobre o valor já sem as taxas da clínica e do cartão). A nota em Configurações foi reescrita com a nova regra.
12. O texto de ajuda de “Outras despesas” deixou de citar “Transporte”, para não lançar o deslocamento duas vezes.
13. Nada de dashboard, relatório, usuários ou serviços externos. Sem dependências: a imagem do botão está embutida no código.

---

## 8. Testes realizados

**Onde foram feitos**
- **Fórmulas no Google Planilhas (real):** o XLSX foi convertido no seu Drive (cópia de teste) e os cenários A, B, C e E foram preenchidos via API, com leitura dos resultados calculados pelo próprio Google.
- **Fórmulas no LibreOffice:** os mesmos cenários e mais casos de erro.
- **Script (`Codigo.gs`):** executado em Node.js com uma simulação das APIs do Apps Script, usando os valores reais produzidos pelas fórmulas. **O script ainda não foi executado dentro do Google Apps Script**: não há como instalá-lo por este ambiente. A primeira execução real (botão/menu) acontece na instalação, etapas 2 e 3.

| Cenário | Resultado obtido | Situação |
|---|---|---|
| **A** Clínica + Pix (R$ 1.000, 5 cur., material R$ 50) | Clínica 200 · operadora 0 · Simples 60 · materiais 250 · total 510 · líquido **490** · por curativo **98** · margem **49,0%** | ✅ Google, LibreOffice e script |
| **B** Domicílio + Cartão 2x (+ deslocamento 20/cur., fixas 50) | Materiais 250 · deslocamento 100 · fixas 50 · cartão 60 · Simples 60 · total 520 · líquido **480** · por curativo **96** · margem **48,0%** | ✅ Google, LibreOffice e script |
| **C** Dinheiro | Operadora R$ 0,00 (“Dinheiro: sem taxa da operadora”) · Simples **R$ 60,00** (6% de R$ 1.000) | ✅ Google, LibreOffice e script |
| **D** Histórico | Salvou A; trocou todos os dados do simulador e as taxas (Simples 8%, clínica 30%); salvou B → linha de A **idêntica** à original | ✅ script (simulado) |
| **E** 0 curativos | Resultados em branco + “Número de curativos inválido…”; salvar bloqueado com alerta | ✅ Google, LibreOffice e script |
| **E** Cartão 1x sem taxa | Resultados em branco + “Falta a taxa de Cartão 1x em Configurações — cálculo e salvamento suspensos…”; salvar bloqueado | ✅ Google, LibreOffice e script |
| Clique duplo (2 s) | Nenhuma linha extra; aviso “já salva” | ✅ script |
| Mesma simulação 15 s depois | Gravada como novo registro (novo ID) | ✅ script |
| Prejuízo (R$ 300, Cartão 3x, despesas) | Líquido −R$ 178,20, margem −59,4%; destaque vermelho; gravação permitida | ✅ LibreOffice e script |
| Curativos fracionados (2,5), despesa negativa, sem nome, tudo vazio | Bloqueados com mensagem específica | ✅ LibreOffice e script |
| Fórmula adulterada ou apagada no Simulador | Salvamento bloqueado (“não conferem”, “vazio ou inválido”) | ✅ script |
| Histórico cheio (sem linhas livres) | Insere linhas, grava e mantém o filtro aplicado | ✅ script |
| “Configurar planilha” executado 2× | Um único botão vinculado a `salvarSimulacao` | ✅ script |

**Teste recomendado após instalar (2 minutos):** preencha o cenário A → Salvar → confira a linha 5 do histórico → troque tudo para o cenário B → Salvar → confira que a linha 5 não mudou e que a linha 6 tem o B → selecione Cartão 1x → Salvar → deve aparecer o bloqueio.

---

## 9. Alterações em relação à v1.0

- Forma de pagamento: “Pix / dinheiro” separado em **Dinheiro** e **Pix**.
- “Taxa do cartão” renomeada para **Taxa da operadora de pagamento**.
- **Simples Nacional** sobre a receita bruta integral, alíquota configurável (6%).
- Novos campos: **custo de deslocamento por curativo** e **despesas fixas alocadas ao plano**, com linhas próprias nos resultados e no histórico.
- Validação ampliada (inteiros, negativos, texto em campo numérico, listas, taxas ausentes ou fora de faixa) e fórmulas simplificadas (uma única verificação em vez de repeti-la em cada célula).
- Destaque visual de **prejuízo** (fundo e texto vermelhos) e de mensagens de bloqueio.
- **Salvamento automático** por botão e menu, com ID, data/hora, trava contra clique duplo e verificação de integridade.
- “Planos confirmados” virou **Histórico de simulações**: 23 colunas, filtro, cabeçalho congelado e sem linha de apoio.
- Instruções de copiar e colar substituídas pelas instruções do botão; Configurações e memória de cálculo atualizadas; versão 1.1.

## Manutenção

- Taxas: altere só na aba **Configurações**. Registros antigos não mudam.
- Se mover células do Simulador ou de Configurações, ajuste o objeto `CFG` no início de `Codigo.gs`.
- Para regerar o XLSX ou rodar os testes: `ferramentas/build.py` (gera o XLSX a partir do v1.0), `ferramentas/testa_formulas.py` (LibreOffice), `ferramentas/teste_script.js` (Node).
