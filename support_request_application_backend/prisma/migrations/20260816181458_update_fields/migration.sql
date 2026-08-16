/*
  Warnings:

  - Added the required column `classification_source` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Request` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('PENDING', 'FULLFILLED');

-- CreateEnum
CREATE TYPE "public"."Source" AS ENUM ('HUMAN', 'AI');

-- AlterTable
ALTER TABLE "public"."Request" ADD COLUMN     "classification_source" "public"."Source" NOT NULL,
ADD COLUMN     "status" "public"."Status" NOT NULL;
