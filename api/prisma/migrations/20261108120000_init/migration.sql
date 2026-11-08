-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EmployeePosition" AS ENUM ('bar', 'kitchen');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('manager', 'staff');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('probation', 'tetap');

-- CreateEnum
CREATE TYPE "ShiftCode" AS ENUM ('PAGI', 'SORE', 'MIDDLE');

-- CreateTable
CREATE TABLE "employee" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "position" "EmployeePosition" NOT NULL,
    "role" "EmployeeRole" NOT NULL DEFAULT 'staff',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'probation',
    "probation_end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_type" (
    "id" UUID NOT NULL,
    "code" "ShiftCode" NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "posisi_berlaku" "EmployeePosition"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "shift_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_email_key" ON "employee"("email");

-- CreateIndex
CREATE INDEX "employee_is_active_idx" ON "employee"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "shift_type_code_key" ON "shift_type"("code");

