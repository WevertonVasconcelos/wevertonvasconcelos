# Prontuário Véras Vasconcelos: plano do projeto

Prontuário eletrônico próprio da Véras Vasconcelos Medicina e Saúde, para os
atendimentos de feridas da Enf. Mariana Véras. Ele substitui o Consultório.me
e a pasta de fotos no Google Fotos.

## 1. O que foi pedido, organizado

| Pedido | Como fica no sistema |
|---|---|
| Ficha de admissão com muitas variáveis | Tela **Admissão** igual às folhas de papel da Mariana (`DOCUMENTOS_PARA_ATENDIMENTOS.pdf`), em 3 abas: **Ficha de Anamnese** (mesmas perguntas Sim/Não, dispositivos, mobilidade, Peso/Altura/IMC/PA/Glicemia/SPO2/FC/FR/Temperatura, fatores de cicatrização) + **exames laboratoriais**; **Avaliação da Lesão** (mapa do corpo para tocar no local, medidas, Tipo, Dor, Tecido, Bordas, Tempo, Perilesão, Exsudato, Pele, Observações); **Plano de Cuidados** (a mesma tabela de 12 linhas + laser/adjuvantes). |
| Evoluções com texto | Tela **Nova sessão**: data, lesão, tipo, local, procedimento, conduta e próximo atendimento. A lista fica no **Controle de sessões** (tabela DATA / PROCEDIMENTO, como na folha). |
| Evoluções com foto | Câmera direto na evolução. As fotos são reduzidas antes de enviar e ficam numa **linha do tempo por lesão** (aba Fotos), com a tabela de medidas e a variação da área. |
| Documentar a evolução da lesão | A mesma folha de Avaliação da Lesão em cada sessão. A aba **Cicatrização** reproduz a folha de papel: tabela DATA / COMP × LARG / EXSUDATO / TIPO DE TECIDO / TOTAL e o gráfico **TOTAL PUSH** (0 a 17), calculados sozinhos. |
| Materiais e custo de material | Catálogo de **Materiais** com custo unitário. Cada evolução lança os materiais usados e o sistema soma o custo daquele atendimento. |
| Valor de sessões e planos mensais | **Planos** (mensal, pacote, avulso) cadastrados na própria ficha de admissão, mais **pagamentos** recebidos. A tela **Financeiro** mostra o mês: recebido, custo de material, resultado e os números por paciente. |
| Layout com a nossa marca | Copiado da ficha de atendimento: logo dourado e ameixa, painel bege `#D6CBB2` com linhas, quadros com título na borda, caixinhas quadradas, tabelas com cabeçalho dourado `#BBA982`, títulos "FICHA DE **ANAMNESE**", arcos bege nos cantos e fonte Montserrat. O PDF impresso sai nas mesmas folhas. |
| Não perder nada | 1) Banco na nuvem (Supabase). 2) Registro clínico **não pode ser apagado**, só corrigido, e toda versão antiga fica no **histórico**. 3) **Backup** em .zip para o Mac/Drive, com prontuário legível de cada paciente + fotos + dados. |
| Usar no celular | **PWA**: abre no navegador e pode ser "instalado" na tela de início como um app. |

## 2. Front-end e back-end: o que cada parte faz

```
 Celular / Mac (navegador)                     Nuvem
┌──────────────────────────┐        ┌────────────────────────────────┐
│ FRONT-END (o que se vê)  │        │ BACK-END (Supabase)            │
│ index.html  telas        │ ─────► │ Auth      login e senha        │
│ style.css   visual       │ ◄───── │ Postgres  tabelas do prontuário│
│ js/         lógica       │        │ RLS       só a equipe acessa   │
│ sw.js       vira app     │        │ Storage   fotos e exames       │
└──────────────────────────┘        └────────────────────────────────┘
        hospedado na Vercel (grátis)
```

**Back-end, o que precisa existir** (tudo criado pelo `supabase/setup.sql`):

1. **Autenticação**: usuário e senha para cada pessoa da equipe, sem cadastro aberto.
2. **Banco de dados** com as tabelas:
   - `pacientes`: dados pessoais e situação (em tratamento, alta, inativo)
   - `admissoes`: a ficha admissional (campos flexíveis)
   - `lesoes`: cada ferida do paciente
   - `evolucoes`: cada atendimento
   - `arquivos`: fotos das lesões, exames, documentos
   - `materiais` e `evolucao_materiais`: catálogo e o que foi usado em cada atendimento
   - `planos` e `pagamentos`: o financeiro
   - `equipe`: quem pode acessar
   - `historico`: cópia automática de toda alteração ou exclusão
3. **Regras de segurança (RLS)**: só quem está na `equipe` lê ou grava. Evolução, admissão, lesão e paciente não podem ser apagados.
4. **Armazenamento privado** (`prontuario`) para fotos e exames, acessados só por links temporários.
5. **Backup**: botão no próprio site (o plano grátis do Supabase não faz backup automático).

**Front-end**: HTML, CSS e JavaScript puros, sem instalar nada e sem etapa de "build". É o mesmo jeito do site de notas, que você já sabe publicar.

## 3. O que está pronto nesta versão (v1)

- [x] Login, saída automática por inatividade, "sair de todos os aparelhos"
- [x] Lista de pacientes com busca e filtro por situação
- [x] Cadastro do paciente
- [x] Admissão nas 3 folhas da Mariana (Anamnese, Avaliação da Lesão, Plano de Cuidados) e readmissão
- [x] Mapa do corpo para marcar o local da lesão
- [x] Escala PUSH calculada e folha de Cicatrização com gráfico
- [x] Lesões por paciente
- [x] Evolução com texto, avaliação, fotos, materiais e pagamento
- [x] Linha do tempo das evoluções, com autor e marca de "editado"
- [x] Fotos por lesão + medidas ao longo do tempo
- [x] Exames e documentos (foto ou PDF)
- [x] Alertas no topo do paciente (alergia, anticoagulante, comorbidades)
- [x] Plano contratado na admissão, pagamentos e financeiro do paciente
- [x] Financeiro do mês
- [x] Catálogo de materiais com custo
- [x] Prontuário para imprimir ou salvar em PDF
- [x] Backup completo em .zip
- [x] Instalável no celular (PWA)

## 4. Próximos passos sugeridos (em ordem)

1. **Colocar no ar e usar 2 semanas em paralelo** com o Consultório.me. Anotar o que falta.
2. **Ajustar os campos** com a Mariana: tudo fica em `js/campos.js`, numa lista fácil de editar.
3. **Migrar os pacientes ativos** do Consultório.me: exportar o que der e lançar as fotos antigas do Google Fotos na aba Fotos de cada paciente, com a data original.
4. **Comparar fotos lado a lado** (antes × depois).
5. **Termos prontos para imprimir** com os dados do paciente já preenchidos (contratação, recusa, alta, uso de imagem), a partir das páginas 6 a 11 do PDF da Mariana.
6. **Agenda**: usar o campo "próximo atendimento" para montar a lista do dia.
7. **TCLE e autorização de imagem** assinados na tela (hoje dá para anexar o PDF/foto do papel assinado).
8. **Backup automático** semanal para o Google Drive, ou o plano Pro do Supabase (US$ 25/mês, com backup diário).
9. **Controle de estoque** dos materiais, se fizer sentido.

## 5. Cuidados legais (conferir com a assessoria)

- **Escala PUSH**: o cálculo segue a PUSH 3.0 (área 0 a 10, exsudato 0 a 3, tecido 0 a 4).
  Como a ficha permite marcar mais de uma opção, o sistema usa a maior quantidade de
  exsudato e o pior tecido marcados. **[CONFERIR com a Mariana]**

- **LGPD**: dado de saúde é dado sensível. O sistema é fechado (só a equipe), mas
  é preciso ter o consentimento do paciente para o tratamento dos dados e das
  imagens. O TCLE da empresa pode incluir isso. **[CONFERIR]**
- **Guarda do prontuário**: a Lei 13.787/2018 fala em no mínimo 20 anos a partir do
  último registro. Por isso o sistema não deixa apagar registro clínico e o
  backup deve ser guardado. **[CONFERIR]**
- **Validade jurídica**: prontuário só eletrônico, sem papel, normalmente exige
  assinatura digital com certificado ICP-Brasil (e as regras do COFEN sobre registro
  eletrônico). Esta versão não tem isso. Enquanto não tiver, trate como registro
  de apoio, e imprima e assine o que precisar de validade formal. **[CONFERIR com o COREN-PE]**
