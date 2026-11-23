# Minhas Notas

Site pessoal para escrever notas no celular e abrir em qualquer computador
(por exemplo, os do hospital) sem precisar entrar no e-mail pessoal.

- Várias notas, cada uma com título (dá para renomear a qualquer momento)
- Salva sozinho enquanto você digita
- Anexos em cada nota (fotos, PDFs, documentos; até 50 MB cada)
- Busca nas notas
- Botão **Copiar texto** para colar no sistema do hospital
- Login só com **usuário e senha**
- Sai sozinho depois de 30 minutos parado e ao fechar o navegador
  (a não ser que você marque "Manter conectado neste aparelho", que é para usar só no seu celular)
- Menu **⋯ > Sair de todos os aparelhos**, para quando você esquecer o login aberto num computador

O site é só HTML, CSS e JavaScript (sem instalar nada). Os dados ficam no
**Supabase** (grátis) e o site é publicado na **Vercel** (grátis).

---

## Passo 1: criar o banco de dados no Supabase (uns 10 minutos)

1. Entre em <https://supabase.com> e clique em **Start your project**.
   Dá para criar a conta com o GitHub.
2. Crie um projeto novo:
   - **Name:** `notas`
   - **Database Password:** clique em *Generate* e guarde num lugar seguro
     (quase nunca vai precisar dela)
   - **Region:** *South America (São Paulo)*
   - Plano **Free**
3. Espere o projeto ficar pronto (1 a 2 minutos).
4. No menu da esquerda, abra **SQL Editor**, clique em **New query**, cole
   **todo** o conteúdo do arquivo [`supabase/setup.sql`](supabase/setup.sql) e clique em **Run**.
   Deve aparecer *Success. No rows returned*.
5. Bloqueie cadastros de estranhos: **Authentication > Sign In / Providers**
   e **desligue** *Allow new users to sign up*. Salve.
6. Crie o seu usuário: **Authentication > Users > Add user > Create new user**
   - **Email:** `seuusuario@notas.app` (por exemplo `weverton@notas.app`).
     Não é um e-mail de verdade, nada é enviado para ele. No site você vai
     digitar só `weverton`.
   - **Password:** uma senha forte, que você consiga digitar rápido
   - Marque **Auto Confirm User**
7. Pegue as duas chaves: **Project Settings > API Keys** (ou **Data API**):
   - **Project URL**: algo como `https://abcdefgh.supabase.co`
   - **Publishable key** (`sb_publishable_...`). Se só aparecer a chave
     *anon public*, use essa.

   ⚠️ **Nunca** use a chave *secret* nem a *service_role*.

## Passo 2: ligar o site ao banco

Abra o arquivo [`config.js`](config.js) e preencha:

```js
SUPABASE_URL: "https://abcdefgh.supabase.co",
SUPABASE_ANON_KEY: "sb_publishable_xxxxxxxx",
```

Essas duas informações são públicas por natureza. Quem protege as suas notas
são a senha e as regras de segurança criadas no passo 1.4.

## Passo 3: publicar na Vercel

1. Entre em <https://vercel.com> com o GitHub.
2. **Add New… > Project** e importe o repositório `wevertonvasconcelos`.
3. Em **Root Directory**, escolha a pasta **`notas`**.
   Em **Framework Preset**, deixe **Other**. Clique em **Deploy**.
4. O site fica num endereço como `https://notas-xxxx.vercel.app`.
   Dá para trocar o nome em *Settings > Domains*.

## Passo 4: testar

1. No celular: abra o endereço, entre, crie uma nota e anexe uma foto.
2. **Num computador do hospital:** abra o mesmo endereço e confira se a nota
   e a foto aparecem. Se o site não abrir, provavelmente a rede do hospital
   bloqueia o endereço; fale com a TI ou teste com um domínio próprio.
3. Dica: no celular, use *Adicionar à tela de início* para abrir como um app.

---

## Bom saber

- **Projeto pausado:** no plano grátis, o Supabase pausa o projeto depois de
  cerca de 7 dias sem nenhum acesso. Se o site parar de carregar as notas,
  entre no painel do Supabase e clique em **Restore project**. Nada se perde.
- **Espaço:** o plano grátis tem 1 GB para anexos e 500 MB para o texto
  (texto ocupa muito pouco).
- **Nomes de anexos:** acentos e espaços viram letras simples e `_`
  (`Prescrição médica.pdf` vira `Prescricao_medica.pdf`). É uma exigência
  do armazenamento.
- **Navegador:** funciona em Chrome, Edge, Firefox e Safari atuais.
  Não funciona no Internet Explorer.
- **Dados de pacientes (LGPD):** evite guardar dados que identifiquem
  pacientes. O site é privado, mas não é um sistema hospitalar homologado.
- **Trocar a senha:** dentro do site, menu **⋯ > Trocar senha**.
- **Esqueceu a senha:** como o e-mail não é real, a recuperação por e-mail
  não funciona. Nesse caso, no Supabase, rode no **SQL Editor**
  (troque o usuário e a senha):
  ```sql
  update auth.users
     set encrypted_password = extensions.crypt('NovaSenhaForte123', extensions.gen_salt('bf'))
   where email = 'weverton@notas.app';
  ```
  **Não apague o usuário:** isso apaga junto todas as notas e anexos dele.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | As telas do site |
| `style.css` | A aparência (tema claro e escuro automáticos) |
| `app.js` | A lógica: login, notas, salvamento automático, anexos |
| `config.js` | **Onde você coloca as chaves do Supabase** |
| `vendor/supabase.js` | Biblioteca oficial do Supabase (v2.118.0), guardada aqui para não depender de outro site, que a rede do hospital poderia bloquear |
| `supabase/setup.sql` | Cria a tabela, a pasta de anexos e as regras de segurança |
