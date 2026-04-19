/*
  Warnings:

  - You are about to drop the column `expires` on the `PendingRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `PendingRegistration` table. All the data in the column will be lost.
  - Added the required column `expiresAt` to the `PendingRegistration` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PendingRegistration_token_key";

-- AlterTable
ALTER TABLE "PendingRegistration" DROP COLUMN "expires",
DROP COLUMN "token",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL;
