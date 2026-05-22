BEGIN;

-- Legacy `default/default` scope normalization is handled as an operational
-- data fix, not an automated migration. Mixed-scope deployments can contain
-- canonical lookup rows alongside legacy rows, and a blanket rewrite would
-- silently rebind entities to whichever canonical definitions happen to exist.
--
-- Keep this explicit no-op migration as a marker so the code compatibility
-- fix and the release artifact stay in sync without risking destructive or
-- environment-specific data rewrites during automated migration runs.

COMMIT;
