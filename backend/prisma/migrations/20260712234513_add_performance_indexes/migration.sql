-- CreateIndex
CREATE INDEX "availability_entries_availability_id_idx" ON "availability_entries"("availability_id");

-- CreateIndex
CREATE INDEX "shifts_date_idx" ON "shifts"("date");

-- CreateIndex
CREATE INDEX "schedules_status_week_start_date_idx" ON "schedules"("status", "week_start_date");

-- CreateIndex
CREATE INDEX "schedule_assignments_schedule_id_employee_id_idx" ON "schedule_assignments"("schedule_id", "employee_id");

-- CreateIndex
CREATE INDEX "schedule_assignments_employee_id_idx" ON "schedule_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "swap_requests_requesting_employee_id_idx" ON "swap_requests"("requesting_employee_id");

-- CreateIndex
CREATE INDEX "swap_requests_target_employee_id_idx" ON "swap_requests"("target_employee_id");

-- CreateIndex
CREATE INDEX "swap_requests_status_created_at_idx" ON "swap_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "open_shift_posts_assignment_id_idx" ON "open_shift_posts"("assignment_id");

-- CreateIndex
CREATE INDEX "open_shift_posts_posted_by_employee_id_idx" ON "open_shift_posts"("posted_by_employee_id");

-- CreateIndex
CREATE INDEX "open_shift_posts_status_created_at_idx" ON "open_shift_posts"("status", "created_at");

-- CreateIndex
CREATE INDEX "shift_claims_open_post_id_idx" ON "shift_claims"("open_post_id");

-- CreateIndex
CREATE INDEX "shift_claims_claiming_employee_id_idx" ON "shift_claims"("claiming_employee_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");
