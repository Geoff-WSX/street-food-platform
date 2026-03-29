-- Drop old foreign key constraint
ALTER TABLE `reports` DROP FOREIGN KEY `reports_handledBy_fkey`;

-- AlterTable
ALTER TABLE `reports`
  DROP COLUMN `handledAt`,
  DROP COLUMN `handledBy`,
  ADD COLUMN `reviewerId` INT,
  ADD COLUMN `reviewedAt` DATETIME(3),
  ADD COLUMN `reviewerNote` TEXT,
  ADD COLUMN `adminId` INT,
  ADD COLUMN `adminAt` DATETIME(3),
  MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `users`
  MODIFY COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'user';

-- AddIndex
CREATE INDEX `reports_reviewerId_idx` ON `reports`(`reviewerId`);

-- AddIndex
CREATE INDEX `reports_adminId_idx` ON `reports`(`adminId`);

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
