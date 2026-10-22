-- Saved calculations of the mortgage calculator.
-- Money is stored as whole cents, the rate as whole hundredths of a percent.

create table public.calculations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  created_at timestamptz not null default now(),
  loan_cents bigint not null check (loan_cents between 100000 and 1000000000),
  annual_rate_hundredths integer not null check (annual_rate_hundredths between 0 and 2500),
  term_months integer not null check (term_months between 12 and 480 and term_months % 12 = 0),
  extra_monthly_cents bigint not null default 0 check (extra_monthly_cents >= 0),
  monthly_payment_cents bigint not null check (monthly_payment_cents >= 0),
  total_paid_cents bigint not null check (total_paid_cents >= 0),
  total_interest_cents bigint not null check (total_interest_cents >= 0),
  months_to_payoff integer check (months_to_payoff between 1 and 480),
  months_saved integer check (months_saved between 0 and 480),
  extra_total_interest_cents bigint check (extra_total_interest_cents >= 0),
  interest_saved_cents bigint check (interest_saved_cents >= 0),
  constraint calculations_extra_all_or_none check (
    (months_to_payoff is null and months_saved is null
      and extra_total_interest_cents is null and interest_saved_cents is null)
    or (months_to_payoff is not null and months_saved is not null
      and extra_total_interest_cents is not null and interest_saved_cents is not null)
  )
);

create index calculations_client_created_idx
  on public.calculations (client_id, created_at desc);

-- Row level security on, with no policies on purpose: the public (anon) key can read and write
-- nothing. Only the backend, with the secret key, can.
alter table public.calculations enable row level security;
revoke all on public.calculations from anon, authenticated;
