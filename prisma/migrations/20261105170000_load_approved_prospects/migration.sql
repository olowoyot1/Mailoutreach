-- Load the six approved OAATZ recruitment partnership prospects.
-- Idempotent: an email already present (case-insensitive) is not inserted again.
INSERT INTO "Prospect"
  ("id", "companyName", "email", "country", "notes", "status", "createdAt", "updatedAt")
SELECT seed.id, seed."companyName", seed.email, 'UAE', seed.notes, 'NEW'::"ProspectStatus", NOW(), NOW()
FROM (VALUES
  ('oaatz_wesource_001', 'WeSource', 'hello@wesource.ae', 'Published contact email; official contact page'),
  ('oaatz_super_recruitment_001', 'Super Recruitment', 'info@superrecruitment.co', 'Published contact email; official contact page'),
  ('oaatz_jm_international_001', 'J.M International', 'info@jminternationaluae.com', 'Published contact email; official website'),
  ('oaatz_ams_international_001', 'AMS International', 'info@ams-int.com', 'Published contact email; official website'),
  ('oaatz_alasco_group_001', 'Alasco Group', 'ahr@alascogroup.com', 'Published recruitment contact email; official contact page'),
  ('oaatz_tangent_group_001', 'Tangent Group', 'hrteam@emirates.net.ae', 'Published contact email; official contact page')
) AS seed(id, "companyName", email, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM "Prospect" existing
  WHERE LOWER(existing.email) = LOWER(seed.email)
);
