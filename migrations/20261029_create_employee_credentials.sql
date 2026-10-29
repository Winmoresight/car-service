USE [BaseSeviceCar];

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.WebEmployeeCredential', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.WebEmployeeCredential (
    CodeStaff int NOT NULL,
    PhoneNormalized nvarchar(20) NOT NULL,
    PasswordSalt nvarchar(64) NOT NULL,
    PasswordHash nvarchar(128) NOT NULL,
    MustChangePassword bit NOT NULL
      CONSTRAINT DF_WebEmployeeCredential_MustChange DEFAULT 1,
    CreatedAt datetime2 NOT NULL
      CONSTRAINT DF_WebEmployeeCredential_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt datetime2 NOT NULL
      CONSTRAINT DF_WebEmployeeCredential_UpdatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_WebEmployeeCredential PRIMARY KEY (CodeStaff),
    CONSTRAINT UQ_WebEmployeeCredential_Phone UNIQUE (PhoneNormalized)
  );
END;

COMMIT TRANSACTION;

SELECT N'WebEmployeeCredential พร้อมใช้งานแล้ว' AS Result;
