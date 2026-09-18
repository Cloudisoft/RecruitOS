-- ============================================================================
-- 0011 — Prevent duplicate revenue rows for the same placement + month
-- ============================================================================

alter table revenue_records
  add constraint uq_revenue_placement_month unique (placement_id, period_month);
