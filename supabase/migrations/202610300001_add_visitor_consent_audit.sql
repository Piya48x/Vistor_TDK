-- Audit fields for explicit visitor-document consent.
-- Apply this migration before deploying the matching frontend.
alter table public.visitors
  add column if not exists consent_given_at timestamptz,
  add column if not exists consent_notice_version text,
  add column if not exists consent_method text;

comment on column public.visitors.consent_given_at is
  'UTC timestamp at which the visitor explicitly consented.';
comment on column public.visitors.consent_notice_version is
  'Version of the privacy notice shown when consent was given.';
comment on column public.visitors.consent_method is
  'How consent was captured, for example explicit_checkbox.';

-- Retention must also be enforced server-side. Configure a scheduled deletion
-- process for visitor rows and photo objects after the approved retention period,
-- except records under a documented legal hold.
