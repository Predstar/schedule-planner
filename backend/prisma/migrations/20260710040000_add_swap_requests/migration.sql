-- CreateEnum
CREATE TYPE "SwapRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'APPROVED');

-- CreateTable
CREATE TABLE "swap_requests" (
    "id" UUID NOT NULL,
    "requesting_employee_id" UUID NOT NULL,
    "target_employee_id" UUID NOT NULL,
    "requesting_assignment_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "SwapRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swap_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_requesting_employee_id_fkey" FOREIGN KEY ("requesting_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_target_employee_id_fkey" FOREIGN KEY ("target_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_requesting_assignment_id_fkey" FOREIGN KEY ("requesting_assignment_id") REFERENCES "schedule_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
