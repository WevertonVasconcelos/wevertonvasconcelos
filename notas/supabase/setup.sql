-- ============================================================
-- Configuração do banco de dados do site de notas.
-- Cole tudo isto no Supabase: SQL Editor > New query > Run.
-- Pode rodar mais de uma vez sem problema.
-- ============================================================

-- 1) Tabela das notas -----------------------------------------
create table if not exists public.notas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  titulo        text not null default 'Nova nota',
  conteudo      text not null default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists notas_user_atualizado_idx
  on public.notas (user_id, atualizado_em desc);

-- Atualiza a data de modificação a cada alteração
create or replace function public.notas_marcar_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists notas_marcar_atualizacao on public.notas;
create trigger notas_marcar_atualizacao
  before update on public.notas
  for each row execute function public.notas_marcar_atualizacao();

-- Cada usuário só enxerga e altera as próprias notas
alter table public.notas enable row level security;

drop policy if exists "notas: dono lê"     on public.notas;
drop policy if exists "notas: dono cria"   on public.notas;
drop policy if exists "notas: dono edita"  on public.notas;
drop policy if exists "notas: dono apaga"  on public.notas;

create policy "notas: dono lê" on public.notas
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "notas: dono cria" on public.notas
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "notas: dono edita" on public.notas
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "notas: dono apaga" on public.notas
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 2) Pasta privada de anexos (limite de 50 MB por arquivo) -----
insert into storage.buckets (id, name, public, file_size_limit)
values ('anexos', 'anexos', false, 52428800)
on conflict (id) do update
  set public = false, file_size_limit = 52428800;

-- Os arquivos ficam em anexos/<id do usuário>/<id da nota>/arquivo
-- e cada usuário só acessa a própria pasta.
drop policy if exists "anexos: dono lê"    on storage.objects;
drop policy if exists "anexos: dono envia" on storage.objects;
drop policy if exists "anexos: dono edita" on storage.objects;
drop policy if exists "anexos: dono apaga" on storage.objects;

create policy "anexos: dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "anexos: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "anexos: dono edita" on storage.objects
  for update to authenticated
  using (bucket_id = 'anexos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "anexos: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
