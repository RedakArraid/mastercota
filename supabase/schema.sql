-- ══════════════════════════════════════════════════════════
-- MASTERCOTA — Schéma Supabase
-- Exécuter dans l'éditeur SQL de votre projet Supabase
-- ══════════════════════════════════════════════════════════

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────
-- TABLE : users
-- ──────────────────────────────────────────────────────────
create table if not exists public.users (
  id          uuid references auth.users(id) on delete cascade primary key,
  phone       text unique,
  name        text,
  avatar_url  text,
  paystack_subaccount_id text,
  created_at  timestamptz default now()
);

alter table public.users enable row level security;

create policy "Voir son propre profil" on public.users
  for select using (auth.uid() = id);

create policy "Créer son profil" on public.users
  for insert with check (auth.uid() = id);

create policy "Modifier son profil" on public.users
  for update using (auth.uid() = id);

-- ──────────────────────────────────────────────────────────
-- TABLE : cotisations
-- ──────────────────────────────────────────────────────────
create table if not exists public.cotisations (
  id             uuid default uuid_generate_v4() primary key,
  slug           text unique not null,
  title          text not null,
  description    text,
  cover_url      text,
  target_amount  numeric not null check (target_amount > 0),
  current_amount numeric default 0 check (current_amount >= 0),
  deadline       date not null,
  owner_id       uuid references public.users(id) on delete cascade not null,
  status         text default 'active'
                   check (status in ('active', 'closed', 'completed')),
  created_at     timestamptz default now()
);

create index cotisations_owner_idx  on public.cotisations(owner_id);
create index cotisations_slug_idx   on public.cotisations(slug);
create index cotisations_status_idx on public.cotisations(status);

alter table public.cotisations enable row level security;

create policy "Voir les cotisations actives" on public.cotisations
  for select using (status = 'active' or auth.uid() = owner_id);

create policy "Créer ses cotisations" on public.cotisations
  for insert with check (auth.uid() = owner_id);

create policy "Modifier ses cotisations" on public.cotisations
  for update using (auth.uid() = owner_id);

-- ──────────────────────────────────────────────────────────
-- TABLE : contributions
-- ──────────────────────────────────────────────────────────
create table if not exists public.contributions (
  id                  uuid default uuid_generate_v4() primary key,
  cotisation_id       uuid references public.cotisations(id)
                        on delete cascade not null,
  contributor_name    text not null,
  contributor_phone   text not null,
  amount              numeric not null check (amount > 0),
  status              text default 'pending'
                        check (status in ('pending', 'paid', 'failed')),
  paystack_reference  text unique,
  payment_method      text,
  created_at          timestamptz default now()
);

create index contributions_cotisation_idx on public.contributions(cotisation_id);
create index contributions_paystack_idx   on public.contributions(paystack_reference);
create index contributions_status_idx     on public.contributions(status);

alter table public.contributions enable row level security;

-- Tout le monde peut créer une contribution (pas besoin de compte)
create policy "Créer une contribution" on public.contributions
  for insert with check (true);

-- Seul le propriétaire de la cotisation voit les contributions
create policy "Voir les contributions de ses cotisations" on public.contributions
  for select using (
    exists (
      select 1 from public.cotisations
      where id = contributions.cotisation_id
        and owner_id = auth.uid()
    )
  );

-- Service role pour les webhooks Paystack
create policy "Service role — update contributions" on public.contributions
  for update using (true);

-- ──────────────────────────────────────────────────────────
-- TRIGGER : mise à jour automatique de current_amount
-- ──────────────────────────────────────────────────────────
create or replace function update_cotisation_amount()
returns trigger as $$
begin
  -- Quand une contribution passe à 'paid'
  if NEW.status = 'paid' and OLD.status != 'paid' then

    -- Incrémenter current_amount
    update public.cotisations
    set current_amount = current_amount + NEW.amount
    where id = NEW.cotisation_id;

    -- Marquer comme 'completed' si objectif atteint
    update public.cotisations
    set status = 'completed'
    where id = NEW.cotisation_id
      and current_amount >= target_amount
      and status = 'active';

  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_contribution_paid
  after update on public.contributions
  for each row
  execute function update_cotisation_amount();

-- ──────────────────────────────────────────────────────────
-- REALTIME : activer pour les deux tables
-- ──────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.cotisations;
alter publication supabase_realtime add table public.contributions;
