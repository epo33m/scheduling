-- Request-flow tables for F3. Generated with
-- `prisma migrate diff --from-empty --to-schema prisma/schema --script`
-- restricted to the schedule_week / off_request / shift_request delta over the
-- init migration; the enum, table, index, and FK statements mirror the schema
-- and are safe to re-diff. Format CHECKs and RLS live in the hardening pass.

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "WeekStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "schedule_week" (
    "id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "status" "WeekStatus" NOT NULL DEFAULT 'draft',
    "request_deadline" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "published_by" UUID,
    "copied_from_week_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "schedule_week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "off_request" (
    "id" UUID NOT NULL,
    "week_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "decided_by" UUID,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "off_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_request" (
    "id" UUID NOT NULL,
    "week_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "shift_code" "ShiftCode" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "decided_by" UUID,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "shift_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_week_start_date_key" ON "schedule_week"("start_date");

-- CreateIndex
CREATE INDEX "schedule_week_status_idx" ON "schedule_week"("status");

-- CreateIndex
CREATE UNIQUE INDEX "off_request_week_id_employee_id_key" ON "off_request"("week_id", "employee_id");

-- CreateIndex
CREATE INDEX "off_request_employee_id_idx" ON "off_request"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_request_week_id_employee_id_tanggal_key" ON "shift_request"("week_id", "employee_id", "tanggal");

-- CreateIndex
CREATE INDEX "shift_request_employee_id_idx" ON "shift_request"("employee_id");

-- AddForeignKey
ALTER TABLE "off_request" ADD CONSTRAINT "off_request_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "schedule_week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "off_request" ADD CONSTRAINT "off_request_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_request" ADD CONSTRAINT "shift_request_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "schedule_week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_request" ADD CONSTRAINT "shift_request_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
