-- Per-envelope crypto metadata: sender pubkey snapshot + scheme for decrypt after rotation.
alter table public.message_envelopes
  add column if not exists sender_pubkey bytea,
  add column if not exists crypto_scheme text not null default 'gen-v1';

alter table public.message_envelopes
  add constraint message_envelopes_crypto_scheme_check
  check (crypto_scheme in ('static-v1', 'gen-v1'));