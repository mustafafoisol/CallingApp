-- Store WebRTC SDP in Postgres — Realtime broadcast drops large offer/answer payloads.
alter table public.calls
  add column if not exists offer_sdp text,
  add column if not exists answer_sdp text;