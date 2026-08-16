/*
  Warnings:

  - The values [Mid] on the enum `Priority` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Priority_new" AS ENUM ('Low', 'Medium', 'High');
ALTER TABLE "public"."Request" ALTER COLUMN "priority" TYPE "public"."Priority_new" USING ("priority"::text::"public"."Priority_new");
ALTER TYPE "public"."Priority" RENAME TO "Priority_old";
ALTER TYPE "public"."Priority_new" RENAME TO "Priority";
DROP TYPE "public"."Priority_old";
COMMIT;
