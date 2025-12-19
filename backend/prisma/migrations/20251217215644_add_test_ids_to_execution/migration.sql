-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "testCaseIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
