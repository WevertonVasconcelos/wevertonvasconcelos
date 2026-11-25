# Prontuário Véras Vasconcelos: como colocar no ar

O que o sistema faz e o que vem depois está no **[PLANO.md](PLANO.md)**.

Leva uns 30 minutos, sem instalar nada no computador. É o mesmo caminho do
site de notas: **Supabase** (banco de dados) + **Vercel** (site).

> Use um **projeto Supabase novo e separado** do site de notas. Dados de
> pacientes ficam isolados (LGPD), e o plano grátis permite 2 projetos.

---

## Passo 0: juntar o código na branch principal (2 minutos)

O código novo está na branch `claude/kind-hypatia-ci273x`. A Vercel publica a branch `main`.

1. Abra <https://github.com/WevertonVasconcelos/wevertonvasconcelos>.
2. Vai aparecer uma faixa amarela com **Compare & pull request**. Clique nela
   (ou peça ao Claude: "abra o pull request").
3. Clique em **Create pull request** e depois em **Merge pull request** > **Confirm merge**.

## Passo 1: banco de dados no Supabase (10 minutos)

1. Entre em <https://supabase.com> > **New project**
   - **Name:** `prontuario`
   - **Database Password:** *Generate* e guarde num lugar seguro
   - **Region:** *South America (São Paulo)* · Plano **Free**

   > Se o Supabase disser que o plano grátis já tem 2 projetos ativos, dá para usar o
   > projeto do site de notas: o prontuário cria tabelas e pasta de fotos separadas e
   > só a equipe cadastrada no passo 1.6 enxerga os pacientes. Nesse caso pule para o 1.4.
2. Espere ficar pronto (1 a 2 minutos).
3. *(só em projeto novo)* **Authentication > Sign In / Providers**: **desligue** *Allow new users to sign up*.
4. **SQL Editor > New query**: cole **todo** o arquivo [`supabase/setup.sql`](supabase/setup.sql) e clique em **Run**.
   Deve terminar com *Success*. (Pode rodar de novo sempre que o arquivo mudar: não apaga nada.)
5. **Authentication > Users > Add user > Create new user**, um para cada pessoa
   (marque **Auto Confirm User**):
   - `mariana@prontuario.app` + senha forte
   - `weverton@prontuario.app` + senha forte

   Não são e-mails de verdade; no site digita-se só `mariana` ou `weverton`.
6. Volte no **SQL Editor** e rode isto para colocar os dois na equipe:
   ```sql
   insert into public.equipe (user_id, nome, registro)
   select id, 'Enf. Mariana Véras', 'COREN-PE 528.268'
     from auth.users where email = 'mariana@prontuario.app'
   on conflict (user_id) do nothing;

   insert into public.equipe (user_id, nome, registro)
   select id, 'Dr. Weverton Vasconcelos', 'CRM-PE 29.418'
     from auth.users where email = 'weverton@prontuario.app'
   on conflict (user_id) do nothing;
   ```
7. **Project Settings > API Keys**: copie a **Project URL** e a **Publishable key**
   (`sb_publishable_...`). ⚠️ Nunca a *secret* / *service_role*.

## Passo 2: ligar o site ao banco (2 minutos)

No GitHub, abra [`prontuario/config.js`](config.js) (na branch `main`), clique no lápis ✏️ e preencha:

```js
SUPABASE_URL: "https://xxxxxxxx.supabase.co",
SUPABASE_ANON_KEY: "sb_publishable_xxxxxxxx",
```

Salve com **Commit changes**. (Ou mande as duas informações para o Claude preencher.)

## Passo 3: publicar na Vercel (5 minutos)

1. Entre em <https://vercel.com> e escolha o time **VERAS VASCONCELOS** (o mesmo do `minhas-notas`).
2. **Add New… > Project** > importe o repositório `wevertonvasconcelos`.
3. **Project Name:** `prontuario-veras` · **Root Directory:** `prontuario` · **Framework Preset:** *Other*. **Deploy**.
4. O endereço fica como `https://prontuario-veras.vercel.app`. Em *Settings > Domains* dá para
   usar um domínio próprio (ex.: `prontuario.verasvasconcelos.com.br`).
5. Daqui em diante, toda mudança que entrar na `main` é publicada sozinha.

## Passo 4: instalar no celular e no Mac

- **iPhone (Safari):** abra o endereço > Compartilhar > **Adicionar à Tela de Início**.
- **Android (Chrome):** menu ⋮ > **Instalar app**.
- **Mac:** abra no **Google Chrome** (é ele que grava a pasta dos pacientes) > menu ⋮ >
  *Transmitir, salvar e compartilhar* > **Instalar página como app**.
- No celular da Mariana, marque **"Manter conectado neste aparelho"** no login.
  Em computador de terceiros, **não** marque.

## Passo 5: pasta dos pacientes no Mac e no Drive (5 minutos, uma vez)

1. No Mac, instale o **Google Drive para computador** (<https://www.google.com/drive/download/>) e entre com a conta da empresa.
   Aparece uma pasta "Google Drive" no Finder.
2. Dentro dela, crie a pasta **Prontuário Véras Vasconcelos**.
3. No prontuário (Chrome do Mac): **Backup > Pasta dos pacientes no Mac > Escolher pasta** e escolha essa pasta.
   Clique em **Permitir** quando o Chrome perguntar (marque "permitir sempre", se aparecer).
4. Pronto: cada paciente ganha a pasta `Pacientes/Nome - código/` com `prontuario.html`, fotos e exames.
   Ela se atualiza sozinha quando você salva paciente, admissão ou sessão no Mac, e ao abrir o
   prontuário no Mac (o que foi feito pelo celular entra nessa hora). Como a pasta está no Drive, vai para a nuvem também.
5. Opcional: no cadastro do paciente há o campo **Link da pasta no Drive**; com ele, aparece o botão
   **Pasta no Drive** no prontuário do paciente.

## Passo 6: primeiro uso

1. **Materiais**: cadastre os materiais mais usados com o custo de cada um.
2. **Simulador** (menu): na aba *Planos de curativos*, confira as taxas em *Configurações* (vieram da planilha
   SIMULADOR DE CURATIVOS TESTE: Clinical Center 20%, cartão 2x 6%, 3x 8,4%, Simples 6%).
   A aba *Preço de produtos* segue a planilha "Simulador de Precificação - Produtos para Feridas".
3. **Pacientes > Novo paciente**: ao salvar, o sistema já abre a anamnese.
4. Em **Avaliação da lesão**, o botão **Abrir avaliação de pé diabético** abre a parte do pé diabético
   (abre sozinha quando a etiologia é "Pé diabético").
5. A cada atendimento: **+ Nova sessão**. Quando o tratamento terminar: **Resumo > Dar alta**.
   Se o paciente voltar: **Readmitir (novo episódio)**.

## PDF do prontuário

- No paciente: **Resumo > Baixar PDF do prontuário**. Sai um arquivo `Prontuario - Nome do Paciente.pdf`, em
  páginas A4 no visual da ficha: identificação, alertas, e para cada episódio (admissão/readmissão) a
  Ficha de Anamnese, a Avaliação da Lesão (com o mapa do corpo), a Avaliação do Pé Diabético (se preenchida),
  o Plano de Cuidados e o Controle de Sessões com as fotos; no fim, a Cicatrização (PUSH) e a lista de exames.
  O financeiro **não** entra no PDF (é documento clínico).
- O backup completo e a pasta do Mac também trazem o `prontuario.pdf` de cada paciente.

## Backup (importante)

O plano grátis do Supabase **não** faz cópia automática. Faça assim:

1. No Mac, abra o prontuário > **Backup > Baixar backup completo**.
2. Mova o `.zip` para uma pasta do **Google Drive para computador** (ou iCloud Drive).
   Fica no Mac **e** na nuvem.
3. Dentro do zip há uma pasta por paciente com o `prontuario.html`, que abre em
   qualquer navegador, mesmo sem internet e mesmo se o site sair do ar.

O site lembra você quando passar 7 dias sem backup naquele aparelho.

## Bom saber

- **Projeto pausado:** sem nenhum acesso por ~7 dias, o Supabase grátis pausa.
  Se não carregar, entre no painel e clique em **Restore project**. Nada se perde.
- **Espaço grátis:** 1 GB de fotos/exames. Cada foto fica com uns 200 a 400 KB
  depois de reduzida, ou seja, alguns milhares de fotos. Quando chegar perto, o plano Pro
  (US$ 25/mês) dá 100 GB e backup diário.
- **Precisa de internet** para ver e salvar dados. Sem sinal, o app abre, mas não
  carrega pacientes. Se o salvamento falhar, o formulário continua preenchido na
  tela: é só tentar de novo quando a internet voltar.
- **Apagar:** evolução, admissão, lesão e paciente **não se apagam**, só se
  corrigem. A versão anterior fica na tabela `historico` (Supabase > Table Editor).
  Foto enviada errada, pagamento, plano e material lançados errado podem ser apagados.
- **Trocar a senha:** menu com o seu nome > **Trocar senha**.
- **Esqueceu a senha:** no Supabase, SQL Editor:
  ```sql
  update auth.users
     set encrypted_password = extensions.crypt('NovaSenhaForte123', extensions.gen_salt('bf'))
   where email = 'mariana@prontuario.app';
  ```
- **Nova pessoa na equipe:** crie o usuário (passo 1.5) e rode o `insert` do passo 1.6
  com o e-mail dela. Quem não está na equipe entra, mas não vê nada.

## Mudar os campos das fichas

Tudo está em [`js/campos.js`](js/campos.js), em forma de lista. Para acrescentar
uma pergunta, copie uma linha parecida e troque o `id` e o `rotulo`. Regras:
- **Não troque o `id`** de um campo que já tem dados (é por ele que o valor é guardado).
- Tirar um campo da lista não apaga os dados antigos: eles continuam no banco e no backup.
- Depois de mudar qualquer arquivo, aumente a versão em `sw.js`
  (ex.: `prontuario-v2` → `prontuario-v3`) para os celulares pegarem a versão nova.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Estrutura das telas |
| `style.css` | Visual da marca |
| `config.js` | **Onde vão as chaves do Supabase** |
| `js/campos.js` | **Campos das folhas** (Anamnese, Avaliação da Lesão, Plano de Cuidados), na mesma ordem do papel |
| `js/formulario.js` | Desenha as folhas no visual da ficha; mapa do corpo; cálculo do PUSH |
| `js/app.js` | Login, menu e navegação |
| `js/banco.js` | Conexão com o Supabase e envio de fotos |
| `js/telas/` | Cada tela (pacientes, paciente, admissão, sessão, materiais, financeiro, simulador, backup, impressão) |
| `js/pediabetico.js` | **Avaliação do pé diabético** (IWGDF 2023): campos e cálculos (risco, infecção, SINBAD, WIfI) |
| `js/pasta.js` | Grava a pasta de cada paciente no Mac (Chrome/Edge) |
| `js/pdf.js` | Monta o PDF do prontuário (páginas A4 com fotos) |
| `vendor/jspdf.umd.min.js` | Biblioteca jsPDF 2.5.2 (licença MIT), que gera o PDF |
| `js/telas/simulador.js` | Simulador: planos de curativos e preço de produtos (mesma lógica das planilhas) |
| `js/relatorio.js` | Monta o prontuário legível (impressão e backup) |
| `sw.js`, `manifest.webmanifest`, `icones/` | O que faz virar app no celular |
| `fontes/` | Montserrat (licença OFL), a fonte da ficha |
| `icones/logo.png`, `icones/corpo/` | Logo e figuras do corpo tirados da ficha de atendimento |
| `vendor/supabase.js` | Biblioteca oficial do Supabase, guardada aqui |
| `supabase/setup.sql` | Cria tabelas, segurança, histórico e a pasta de fotos |
