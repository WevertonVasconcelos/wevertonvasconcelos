-- ============================================================
-- Prontuário Véras Vasconcelos — banco de dados
-- Cole tudo isto no Supabase: SQL Editor > New query > Run.
-- Pode rodar mais de uma vez sem problema (não apaga dados).
-- ============================================================

-- 0) Equipe: só quem está nesta lista acessa os prontuários ------
create table if not exists public.equipe (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  nome      text not null,
  registro  text,                       -- ex.: COREN-PE 528.268
  criado_em timestamptz not null default now()
);

create or replace function public.eh_da_equipe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.equipe where user_id = (select auth.uid()));
$$;

-- Carimba "atualizado_em / atualizado_por" em toda alteração
create or replace function public.carimbar_alteracao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end;
$$;

-- Histórico: guarda a versão anterior de tudo que for alterado ou apagado
create table if not exists public.historico (
  id            bigint generated always as identity primary key,
  tabela        text not null,
  registro_id   uuid,
  acao          text not null,            -- UPDATE ou DELETE
  versao_antiga jsonb not null,
  usuario       uuid,
  em            timestamptz not null default now()
);

create or replace function public.guardar_historico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.historico (tabela, registro_id, acao, versao_antiga, usuario)
  values (tg_table_name, old.id, tg_op, to_jsonb(old), auth.uid());
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- 1) Pacientes ------------------------------------------------
create table if not exists public.pacientes (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  data_nascimento      date,
  sexo                 text,
  cpf                  text,
  telefone             text,
  endereco             text,
  responsavel          text,
  responsavel_telefone text,
  observacoes          text,
  situacao             text not null default 'em tratamento',  -- em tratamento | alta | inativo
  criado_em            timestamptz not null default now(),
  criado_por           uuid default auth.uid(),
  atualizado_em        timestamptz not null default now(),
  atualizado_por       uuid
);

-- 2) Admissão (ficha admissional; campos flexíveis em "dados") ---
create table if not exists public.admissoes (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes (id) on delete restrict,
  data           date not null default current_date,
  dados          jsonb not null default '{}'::jsonb,
  criado_em      timestamptz not null default now(),
  criado_por     uuid default auth.uid(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

-- 3) Lesões do paciente (cada ferida tem sua linha do tempo) ------
create table if not exists public.lesoes (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes (id) on delete restrict,
  nome           text not null,           -- ex.: "Pé D - região plantar"
  etiologia      text,
  inicio         date,
  situacao       text not null default 'em tratamento',  -- em tratamento | cicatrizada | encerrada
  observacoes    text,
  criado_em      timestamptz not null default now(),
  criado_por     uuid default auth.uid(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

-- 4) Evoluções (cada atendimento) -------------------------------
create table if not exists public.evolucoes (
  id              uuid primary key default gen_random_uuid(),
  paciente_id     uuid not null references public.pacientes (id) on delete restrict,
  lesao_id        uuid references public.lesoes (id) on delete restrict,
  data            timestamptz not null default now(),
  tipo            text,
  local_atendimento text,
  descricao       text not null default '',
  avaliacao       jsonb not null default '{}'::jsonb,
  conduta         text,
  proximo_atendimento date,
  criado_em       timestamptz not null default now(),
  criado_por      uuid default auth.uid(),
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid
);

-- 5) Arquivos: fotos das lesões, exames, documentos ---------------
create table if not exists public.arquivos (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes (id) on delete restrict,
  evolucao_id    uuid references public.evolucoes (id) on delete restrict,
  lesao_id       uuid references public.lesoes (id) on delete restrict,
  categoria      text not null default 'lesao',   -- lesao | exame | documento
  caminho        text not null unique,
  caminho_mini   text,
  nome_original  text,
  tipo_mime      text,
  tamanho        bigint,
  legenda        text,
  data           date not null default current_date,
  criado_em      timestamptz not null default now(),
  criado_por     uuid default auth.uid(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

-- 6) Materiais (catálogo com custo) e uso em cada evolução --------
create table if not exists public.materiais (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  unidade        text not null default 'un',
  custo_unitario numeric(12,2) not null default 0,
  ativo          boolean not null default true,
  observacoes    text,
  criado_em      timestamptz not null default now(),
  criado_por     uuid default auth.uid(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

create table if not exists public.evolucao_materiais (
  id             uuid primary key default gen_random_uuid(),
  evolucao_id    uuid not null references public.evolucoes (id) on delete cascade,
  material_id    uuid not null references public.materiais (id) on delete restrict,
  quantidade     numeric(12,2) not null default 1,
  custo_unitario numeric(12,2) not null default 0,   -- custo no dia (não muda se o catálogo mudar)
  criado_em      timestamptz not null default now(),
  criado_por     uuid default auth.uid(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

-- 7) Financeiro: planos contratados e pagamentos recebidos ---------
create table if not exists public.planos (
  id                uuid primary key default gen_random_uuid(),
  paciente_id       uuid not null references public.pacientes (id) on delete restrict,
  tipo              text not null default 'mensal',   -- mensal | pacote | avulso
  descricao         text,
  valor             numeric(12,2) not null default 0,
  sessoes_previstas integer,
  inicio            date not null default current_date,
  fim               date,
  situacao          text not null default 'ativo',    -- ativo | encerrado
  observacoes       text,
  criado_em         timestamptz not null default now(),
  criado_por        uuid default auth.uid(),
  atualizado_em     timestamptz not null default now(),
  atualizado_por    uuid
);

create table if not exists public.pagamentos (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes (id) on delete restrict,
  plano_id       uuid references public.planos (id) on delete set null,
  evolucao_id    uuid references public.evolucoes (id) on delete set null,
  data           date not null default current_date,
  valor          numeric(12,2) not null,
  forma          text,                    -- pix | dinheiro | cartão | transferência | outro
  descricao      text,
  criado_em      timestamptz not null default now(),
  criado_por     uuid default auth.uid(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

-- 8) Simulador de preços e configurações ----------------------
create table if not exists public.simulacoes (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid references public.pacientes (id) on delete set null,
  tipo           text not null default 'plano',      -- plano | produto
  descricao      text,
  dados          jsonb not null default '{}'::jsonb,  -- o que foi digitado
  resultado      jsonb not null default '{}'::jsonb,  -- o que foi calculado
  criado_em      timestamptz not null default now(),
  criado_por     uuid default auth.uid(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

create table if not exists public.configuracoes (
  id             uuid primary key default gen_random_uuid(),
  chave          text not null unique,               -- ex.: 'simulador'
  valor          jsonb not null default '{}'::jsonb,
  criado_em      timestamptz not null default now(),
  criado_por     uuid default auth.uid(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

-- Campos acrescentados depois (rodar de novo o arquivo não apaga nada)
alter table public.pacientes add column if not exists pasta_link text;           -- link da pasta no Drive
alter table public.admissoes add column if not exists tipo text not null default 'admissão';  -- admissão | readmissão
alter table public.admissoes add column if not exists admissao_anterior_id uuid references public.admissoes (id) on delete restrict;
alter table public.admissoes add column if not exists alta_em date;
alter table public.admissoes add column if not exists alta_motivo text;
alter table public.evolucoes add column if not exists admissao_id uuid references public.admissoes (id) on delete restrict;

-- Índices -------------------------------------------------------
create index if not exists admissoes_paciente_idx on public.admissoes (paciente_id, data desc);
create index if not exists lesoes_paciente_idx    on public.lesoes (paciente_id);
create index if not exists evolucoes_paciente_idx on public.evolucoes (paciente_id, data desc);
create index if not exists evolucoes_data_idx     on public.evolucoes (data);
create index if not exists arquivos_paciente_idx  on public.arquivos (paciente_id, data);
create index if not exists arquivos_evolucao_idx  on public.arquivos (evolucao_id);
create index if not exists evomat_evolucao_idx    on public.evolucao_materiais (evolucao_id);
create index if not exists planos_paciente_idx    on public.planos (paciente_id);
create index if not exists pagamentos_paciente_idx on public.pagamentos (paciente_id, data);
create index if not exists pagamentos_data_idx    on public.pagamentos (data);
create index if not exists evolucoes_admissao_idx on public.evolucoes (admissao_id);
create index if not exists simulacoes_criado_idx  on public.simulacoes (criado_em desc);

-- Gatilhos, permissões e regras de segurança em todas as tabelas ---
do $$
declare
  t text;
begin
  foreach t in array array['pacientes','admissoes','lesoes','evolucoes','arquivos',
                           'materiais','evolucao_materiais','planos','pagamentos',
                           'simulacoes','configuracoes']
  loop
    execute format('drop trigger if exists carimbar on public.%I', t);
    execute format('create trigger carimbar before update on public.%I
                    for each row execute function public.carimbar_alteracao()', t);
    execute format('drop trigger if exists historico on public.%I', t);
    execute format('create trigger historico after update or delete on public.%I
                    for each row execute function public.guardar_historico()', t);

    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "equipe lê" on public.%I', t);
    execute format('drop policy if exists "equipe cria" on public.%I', t);
    execute format('drop policy if exists "equipe edita" on public.%I', t);
    execute format('drop policy if exists "equipe apaga" on public.%I', t);
    execute format('create policy "equipe lê" on public.%I for select to authenticated
                    using ((select public.eh_da_equipe()))', t);
    execute format('create policy "equipe cria" on public.%I for insert to authenticated
                    with check ((select public.eh_da_equipe()))', t);
    execute format('create policy "equipe edita" on public.%I for update to authenticated
                    using ((select public.eh_da_equipe())) with check ((select public.eh_da_equipe()))', t);
  end loop;

  -- Registro clínico NÃO se apaga (só se corrige, e a versão antiga fica no histórico).
  -- Podem ser apagados: foto/arquivo enviado errado, material lançado errado,
  -- plano e pagamento lançados errado, item do catálogo de materiais.
  foreach t in array array['arquivos','evolucao_materiais','planos','pagamentos','materiais','simulacoes']
  loop
    execute format('create policy "equipe apaga" on public.%I for delete to authenticated
                    using ((select public.eh_da_equipe()))', t);
  end loop;
end;
$$;

-- Lista de pacientes com a data do último atendimento
create or replace view public.pacientes_lista
with (security_invoker = true) as
select p.id, p.nome, p.data_nascimento, p.situacao, p.telefone,
       (select max(e.data) from public.evolucoes e where e.paciente_id = p.id) as ultimo_atendimento
  from public.pacientes p;
revoke all on public.pacientes_lista from anon;
grant select on public.pacientes_lista to authenticated;

-- Equipe e histórico: só leitura pelo site
revoke all on public.equipe from anon;
revoke all on public.historico from anon;
grant select on public.equipe to authenticated;
grant select on public.historico to authenticated;
alter table public.equipe enable row level security;
alter table public.historico enable row level security;
drop policy if exists "equipe lê equipe" on public.equipe;
create policy "equipe lê equipe" on public.equipe for select to authenticated
  using ((select public.eh_da_equipe()));
drop policy if exists "equipe lê histórico" on public.historico;
create policy "equipe lê histórico" on public.historico for select to authenticated
  using ((select public.eh_da_equipe()));

-- 9) Pasta privada de arquivos (fotos, exames; até 25 MB cada) ----
insert into storage.buckets (id, name, public, file_size_limit)
values ('prontuario', 'prontuario', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

drop policy if exists "prontuario: equipe lê"    on storage.objects;
drop policy if exists "prontuario: equipe envia" on storage.objects;
drop policy if exists "prontuario: equipe apaga" on storage.objects;

create policy "prontuario: equipe lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'prontuario' and (select public.eh_da_equipe()));
create policy "prontuario: equipe envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'prontuario' and (select public.eh_da_equipe()));
create policy "prontuario: equipe apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'prontuario' and (select public.eh_da_equipe()));

-- ============================================================
-- DEPOIS de criar os usuários em Authentication > Users,
-- coloque cada um na equipe (troque e-mail, nome e registro):
--
-- insert into public.equipe (user_id, nome, registro)
-- select id, 'Enf. Mariana Véras', 'COREN-PE 528.268'
--   from auth.users where email = 'mariana@prontuario.app'
-- on conflict (user_id) do nothing;
--
-- insert into public.equipe (user_id, nome, registro)
-- select id, 'Dr. Weverton Vasconcelos', 'CRM-PE 29.418'
--   from auth.users where email = 'weverton@prontuario.app'
-- on conflict (user_id) do nothing;
-- ============================================================
