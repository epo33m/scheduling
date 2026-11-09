-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('copy', 'request', 'auto_middle', 'manual');

-- CreateTable
CREATE TABLE "shift_assignment" (
    "id" UUID NOT NULL,
    "week_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "shift_code" "ShiftCode",
    "source" "AssignmentSource" NOT NULL DEFAULT 'copy',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "shift_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_assignment_employee_id_idx" ON "shift_assignment"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignment_week_id_employee_id_tanggal_key" ON "shift_assignment"("week_id", "employee_id", "tanggal");

-- AddForeignKey
ALTER TABLE "shift_assignment" ADD CONSTRAINT "shift_assignment_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "schedule_week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignment" ADD CONSTRAINT "shift_assignment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
