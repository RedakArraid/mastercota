-- Migration : ajout de la colonne paystack_subaccount_id si absente
-- À exécuter dans l'éditeur SQL de Supabase si la colonne n'existe pas déjà.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS paystack_subaccount_id text;
