CREATE TABLE "shifts" (
  "id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "employee_role" "EmployeeRole" NOT NULL,
  "required_count" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);
