-- CreateTable
CREATE TABLE `ems_departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `color` VARCHAR(20) NOT NULL DEFAULT '#6759E8',
    `manager` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ems_departments_name_key`(`name`),
    UNIQUE INDEX `ems_departments_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ems_employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeCode` VARCHAR(24) NOT NULL,
    `userId` INTEGER NULL,
    `firstName` VARCHAR(80) NOT NULL,
    `lastName` VARCHAR(80) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `phone` VARCHAR(40) NULL,
    `jobTitle` VARCHAR(120) NOT NULL,
    `departmentId` INTEGER NULL,
    `manager` VARCHAR(120) NULL,
    `location` VARCHAR(100) NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'Active',
    `employmentType` VARCHAR(24) NOT NULL DEFAULT 'Full-time',
    `hireDate` DATE NOT NULL,
    `salary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `avatarUrl` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ems_employees_employeeCode_key`(`employeeCode`),
    UNIQUE INDEX `ems_employees_userId_key`(`userId`),
    UNIQUE INDEX `ems_employees_email_key`(`email`),
    INDEX `ems_employees_departmentId_status_idx`(`departmentId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ems_attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `workDate` DATE NOT NULL,
    `checkIn` DATETIME(3) NULL,
    `checkOut` DATETIME(3) NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'Present',
    `note` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ems_attendance_workDate_status_idx`(`workDate`, `status`),
    UNIQUE INDEX `ems_attendance_employeeId_workDate_key`(`employeeId`, `workDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ems_leave_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `days` DECIMAL(5, 1) NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'Pending',
    `reviewer` VARCHAR(120) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ems_leave_requests_status_startDate_idx`(`status`, `startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ems_leave_balances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `entitled` DECIMAL(5, 1) NOT NULL DEFAULT 20,
    `used` DECIMAL(5, 1) NOT NULL DEFAULT 0,

    UNIQUE INDEX `ems_leave_balances_employeeId_year_type_key`(`employeeId`, `year`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ems_payroll` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `periodStart` DATE NOT NULL,
    `periodEnd` DATE NOT NULL,
    `baseSalary` DECIMAL(12, 2) NOT NULL,
    `deductions` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `netPay` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'Draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ems_payroll_periodEnd_status_idx`(`periodEnd`, `status`),
    UNIQUE INDEX `ems_payroll_employeeId_periodEnd_key`(`employeeId`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ems_performance_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `reviewer` VARCHAR(120) NOT NULL,
    `rating` DECIMAL(3, 1) NOT NULL,
    `summary` VARCHAR(1200) NOT NULL,
    `period` VARCHAR(40) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ems_performance_reviews_employeeId_createdAt_idx`(`employeeId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ems_goals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `dueDate` DATE NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'In progress',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ems_goals_employeeId_status_idx`(`employeeId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ems_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NULL,
    `uploadedByUserId` INTEGER NOT NULL,
    `fileName` VARCHAR(240) NOT NULL,
    `mimeType` VARCHAR(120) NOT NULL,
    `byteSize` INTEGER NOT NULL,
    `objectKey` VARCHAR(700) NOT NULL,
    `category` VARCHAR(40) NOT NULL DEFAULT 'document',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ems_documents_objectKey_key`(`objectKey`),
    INDEX `ems_documents_employeeId_deletedAt_idx`(`employeeId`, `deletedAt`),
    INDEX `ems_documents_uploadedByUserId_createdAt_idx`(`uploadedByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ems_activity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actorUserId` INTEGER NULL,
    `actorName` VARCHAR(120) NOT NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity` VARCHAR(80) NOT NULL,
    `entityId` INTEGER NULL,
    `detail` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ems_activity_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ems_employees` ADD CONSTRAINT `ems_employees_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `ems_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ems_attendance` ADD CONSTRAINT `ems_attendance_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `ems_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ems_leave_requests` ADD CONSTRAINT `ems_leave_requests_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `ems_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ems_leave_balances` ADD CONSTRAINT `ems_leave_balances_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `ems_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ems_payroll` ADD CONSTRAINT `ems_payroll_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `ems_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ems_performance_reviews` ADD CONSTRAINT `ems_performance_reviews_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `ems_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ems_goals` ADD CONSTRAINT `ems_goals_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `ems_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ems_documents` ADD CONSTRAINT `ems_documents_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `ems_employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

