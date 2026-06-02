-- SQL Script to Enable SQL Server Authentication and Setup SA User
-- รันสคริปต์นี้ใน SQL Server Management Studio หรือ Azure Data Studio

-- 1. Enable SQL Server and Windows Authentication Mode
USE [master]
GO

-- ต้องรันด้วย SSMS → Server Properties → Security → Manual
-- หรือใช้ PowerShell (ต้องมีสิทธิ์ Admin):
-- $srv = New-Object Microsoft.SqlServer.Management.Smo.Server("localhost\SQLEXPRESS")
-- $srv.Settings.LoginMode = [Microsoft.SqlServer.Management.Smo.ServerLoginMode]::Mixed
-- $srv.Alter()

-- 2. Enable SA Login and Set Password
ALTER LOGIN [sa] ENABLE
GO

ALTER LOGIN [sa] WITH PASSWORD = N'YourStrongPassword123!'
GO

-- 3. Grant SA necessary permissions
ALTER SERVER ROLE [sysadmin] ADD MEMBER [sa]
GO

-- 4. Create a new user specifically for the app (recommended)
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'servicecar_app')
BEGIN
    CREATE LOGIN [servicecar_app] WITH PASSWORD = N'ServiceCar2026!'
END
GO

-- 5. Grant permissions to BaseSeviceCar database
USE [BaseSeviceCar]
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'servicecar_app')
BEGIN
    CREATE USER [servicecar_app] FOR LOGIN [servicecar_app]
END
GO

ALTER ROLE [db_datareader] ADD MEMBER [servicecar_app]
GO
ALTER ROLE [db_datawriter] ADD MEMBER [servicecar_app]
GO

PRINT '✅ Setup complete!'
PRINT ''
PRINT 'คุณสามารถใช้ credentials ใดใน .env.local:'
PRINT ''
PRINT '1️⃣ ใช้ SA (แนะนำสำหรับ dev):'
PRINT 'DATABASE_USER=sa'
PRINT 'DATABASE_PASSWORD=YourStrongPassword123!'
PRINT ''
PRINT '2️⃣ ใช้ App User (แนะนำสำหรับ production):'
PRINT 'DATABASE_USER=servicecar_app'
PRINT 'DATABASE_PASSWORD=ServiceCar2026!'
