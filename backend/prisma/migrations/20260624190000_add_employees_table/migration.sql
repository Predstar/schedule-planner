CREATE TABLE "employees" (
  "id" UUID NOT NULL,

  CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users"
ADD CONSTRAINT "users_employee_id_fkey"
FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");
