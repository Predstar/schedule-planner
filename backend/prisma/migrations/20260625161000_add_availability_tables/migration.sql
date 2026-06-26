CREATE TYPE "AvailabilityStatus" AS ENUM ('SUBMITTED');

CREATE TABLE "availabilities" (
  "id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "week_start_date" DATE NOT NULL,
  "status" "AvailabilityStatus" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "availability_entries" (
  "id" UUID NOT NULL,
  "availability_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "available" BOOLEAN NOT NULL,
  "preferred" BOOLEAN NOT NULL,

  CONSTRAINT "availability_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "availabilities_employee_id_week_start_date_key"
ON "availabilities"("employee_id", "week_start_date");

ALTER TABLE "availabilities"
ADD CONSTRAINT "availabilities_employee_id_fkey"
FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "availability_entries"
ADD CONSTRAINT "availability_entries_availability_id_fkey"
FOREIGN KEY ("availability_id") REFERENCES "availabilities"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
