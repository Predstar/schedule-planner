/*
  Warnings:

  - A unique constraint covering the columns `[confirmation_token]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "confirmation_token" TEXT,
ALTER COLUMN "active" SET DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_confirmation_token_key" ON "users"("confirmation_token");
