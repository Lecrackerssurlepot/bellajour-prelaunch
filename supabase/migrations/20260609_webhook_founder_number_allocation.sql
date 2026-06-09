-- Webhook Stripe (POST /api/webhook) — pré-requis base.
-- Appliquée sur le projet distant via Supabase MCP le 2026-06-09.

-- A) Soft cap du numéro fondateur.
--    On retire la borne haute (100) : un paiement fondateur confirmé n'est
--    jamais bloqué. Le dépassement 101/102 sur paiements simultanés est assumé.
--    Borne basse conservée (>= 1).
alter table public.waitlist drop constraint if exists waitlist_numero_fondateur_range;
alter table public.waitlist
  add constraint waitlist_numero_fondateur_range
  check (numero_fondateur is null or numero_fondateur >= 1);

-- B) Attribution ATOMIQUE du numéro fondateur.
--    - Idempotente : si l'email a déjà un numéro, le renvoie sans rien réécrire.
--    - Race-safe : s'appuie sur la contrainte UNIQUE(numero_fondateur). En cas de
--      collision (deux paiements simultanés visent le même numéro), on reboucle et
--      on recalcule le prochain libre → jamais deux fois le même numéro.
--    - Renvoie NULL si l'email est absent de waitlist.
create or replace function public.assign_numero_fondateur(p_email text)
returns integer
language plpgsql
as $$
declare
  v_existing integer;
  v_next integer;
  v_rows integer;
begin
  select numero_fondateur into v_existing
  from public.waitlist where email = p_email;
  if v_existing is not null then
    return v_existing;
  end if;

  loop
    select coalesce(max(numero_fondateur), 0) + 1 into v_next
    from public.waitlist;

    begin
      update public.waitlist
        set numero_fondateur = v_next
        where email = p_email and numero_fondateur is null;
      get diagnostics v_rows = row_count;

      if v_rows = 0 then
        -- Email absent, ou numéro attribué par un tx concurrent entre lecture et
        -- update → on relit l'état réel.
        select numero_fondateur into v_existing
        from public.waitlist where email = p_email;
        return v_existing;
      end if;

      return v_next;
    exception when unique_violation then
      -- v_next pris par un paiement concurrent → reboucle et recalcule.
    end;
  end loop;
end;
$$;
