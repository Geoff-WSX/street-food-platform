-- CreateTable
CREATE TABLE `reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reporterId` INTEGER NOT NULL,
    `reportedId` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `images` TEXT NULL,
    `chatRecords` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `adminNote` TEXT NULL,
    `handledBy` INTEGER NULL,
    `handledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reports_reportedId_idx`(`reportedId`),
    INDEX `reports_reporterId_idx`(`reporterId`),
    INDEX `reports_status_idx`(`status`),
    INDEX `reports_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reportedId_fkey` FOREIGN KEY (`reportedId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_handledBy_fkey` FOREIGN KEY (`handledBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
