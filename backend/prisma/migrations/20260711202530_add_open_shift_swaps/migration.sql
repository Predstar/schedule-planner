-- CreateEnum
CREATE TYPE "OpenShiftPostStatus" AS ENUM ('OPEN', 'CLAIMED', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShiftClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "open_shift_posts" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "posted_by_employee_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "OpenShiftPostStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_shift_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_claims" (
    "id" UUID NOT NULL,
    "open_post_id" UUID NOT NULL,
    "claiming_employee_id" UUID NOT NULL,
    "status" "ShiftClaimStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_claims_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "open_shift_posts" ADD CONSTRAINT "open_shift_posts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "schedule_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_shift_posts" ADD CONSTRAINT "open_shift_posts_posted_by_employee_id_fkey" FOREIGN KEY ("posted_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_claims" ADD CONSTRAINT "shift_claims_open_post_id_fkey" FOREIGN KEY ("open_post_id") REFERENCES "open_shift_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_claims" ADD CONSTRAINT "shift_claims_claiming_employee_id_fkey" FOREIGN KEY ("claiming_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

