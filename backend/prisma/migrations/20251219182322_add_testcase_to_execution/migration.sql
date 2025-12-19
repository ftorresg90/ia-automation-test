-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "testCaseId" TEXT;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
