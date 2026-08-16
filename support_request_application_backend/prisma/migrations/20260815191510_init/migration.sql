-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('Low', 'Mid', 'High');

-- CreateEnum
CREATE TYPE "Categories" AS ENUM ('SALES', 'BILLING', 'TECHNICAL', 'GENERAL');

-- CreateTable
CREATE TABLE "Request" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "classified_as" "Categories" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);
