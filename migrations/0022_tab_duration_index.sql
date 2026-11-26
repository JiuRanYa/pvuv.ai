-- Tab-scoped trackers used a persistent visitor ID as their visit ID.
-- This index skips regular sessions when checking whether a report needs reconstruction.
CREATE INDEX IF NOT EXISTS idx_sessions_tab_duration ON sessions(site_id,last_pageview_at)
WHERE visitor_id=session_id AND last_pageview_at-started_at>1800000;
