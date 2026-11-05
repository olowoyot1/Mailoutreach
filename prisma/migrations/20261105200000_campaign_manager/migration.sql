CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Campaign_status_createdAt_idx" ON "Campaign"("status", "createdAt");
CREATE TABLE "CampaignProspect" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "prospectId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignProspect_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CampaignProspect_campaignId_prospectId_key" ON "CampaignProspect"("campaignId", "prospectId");
CREATE INDEX "CampaignProspect_prospectId_idx" ON "CampaignProspect"("prospectId");
ALTER TABLE "EmailLog" ADD COLUMN "campaignId" TEXT;
CREATE INDEX "EmailLog_campaignId_idx" ON "EmailLog"("campaignId");
ALTER TABLE "CampaignProspect" ADD CONSTRAINT "CampaignProspect_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignProspect" ADD CONSTRAINT "CampaignProspect_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
