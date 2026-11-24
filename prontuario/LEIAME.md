# Prontuário Véras Vasconcelos: como colocar no ar

O que o sistema faz e o que vem depois está no **[PLANO.md](PLANO.md)**.

Leva uns 30 minutos, sem instalar nada no computador. É o mesmo caminho do
site de notas: **Supabase** (banco de dados) + **Vercel** (site).

> Use um **projeto Supabase novo e separado** do site de notas. Dados de
> pacientes ficam isolados (LGPD), e o plano grátis permite 2 projetos.

---

## Passo 1: banco de dados no Supabase

1. Entre em <https://supabase.com> > **New project**
   - **Name:** `prontuario`
   - **Database Password:** *Generate* e guarde num lugar seguro
   - **Region:** *South America (São Paulo)*
2. Espere ficar pronto (1 a 2 minutos).
3. **SQL Editor > New query**: cole **todo** o arquivo
   [`supabase/setup.sql`](supabase/setup.sql) e clique em **Run**.
   Deve terminar com *Success*.
4. **Authentication > Sign In / Providers**: **desligue** *Allow new users to sign up*.
5. **Authentication > Users > Add user > Create new user**, um para cada pessoa:
   - `mariana@prontuario.app` + senha forte + marque **Auto Confirm User**
   - `weverton@prontuario.app` + senha forte + **Auto Confirm User**

   (não são e-mails de verdade; no site digita-se só `mariana` ou `weverton`)
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
7. **Project Settings > API Keys**: copie a **Project URL** e a
   **Publishable key** (`sb_publishable_...`). ⚠️ Nunca a *secret*/*service_role*.

## Passo 2: ligar o site ao banco

No GitHub, abra [`config.js`](config.js), clique no lápis ✏️ e preencha:

```js
SUPABASE_URL: "https://xxxxxxxx.supabase.co",
SUPABASE_ANON_KEY: "sb_publishable_xxxxxxxx",
```

Salve com **Commit changes**.

## Passo 3: publicar na Vercel

1. <https://vercel.com> > **Add New… > Project** > importe `wevertonvasconcelos`.
2. **Root Directory:** `prontuario`. **Framework Preset:** *Other*. **Deploy**.
3. Em *Settings > Domains* dá para trocar para algo como `prontuario-vv.vercel.app`
   ou um domínio próprio (ex.: `prontuario.verasvasconcelos.com.br`).

## Passo 4: instalar no celular

- **iPhone (Safari):** abra o endereço > botão Compartilhar > **Adicionar à Tela de Início**.
- **Android (Chrome):** menu ⋮ > **Instalar app**.
- No celular da Mariana, marque **"Manter conectado neste aparelho"** no login.
  Em computador de terceiros, **não** marque: o site sai sozinho depois de 30 minutos parado.

## Passo 5: primeiro uso

1. **Materiais**: cadastre os materiais mais usados com o custo de cada um.
2. **Pacientes > Novo paciente**: ao salvar, o sistema já abre a admissão.
3. Na admissão salva, cadastre o **plano** (mensal, pacote ou avulso) e o valor.
4. A cada atendimento: **+ Nova evolução**, com texto, fotos, materiais e pagamento.
5. Toda semana: **Backup**, no Mac.

---

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
  (`prontuario-v1` → `prontuario-v2`) para os celulares pegarem a versão nova.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Estrutura das telas |
| `style.css` | Visual da marca |
| `config.js` | **Onde vão as chaves do Supabase** |
| `js/campos.js` | **Campos da admissão e da avaliação da lesão** |
| `js/app.js` | Login, menu e navegação |
| `js/banco.js` | Conexão com o Supabase e envio de fotos |
| `js/telas/` | Cada tela (pacientes, paciente, admissão, evolução, materiais, financeiro, backup, impressão) |
| `js/relatorio.js` | Monta o prontuário legível (impressão e backup) |
| `sw.js`, `manifest.webmanifest`, `icones/` | O que faz virar app no celular |
| `fontes/` | Cormorant Garamond e Montserrat (licença OFL) |
| `vendor/supabase.js` | Biblioteca oficial do Supabase, guardada aqui |
| `supabase/setup.sql` | Cria tabelas, segurança, histórico e a pasta de fotos |
