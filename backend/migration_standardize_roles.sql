-- =========================================================================
-- DATABASE NORMALIZATION SCRIPT
-- Standardizing: Positions, Departments, and Roles
-- Author: Senior Database Engineer (Antigravity)
-- =========================================================================

BEGIN TRANSACTION;

-- 1. Create standardized role list if not exists
PRINT '1. Standardizing Role list...';
IF NOT EXISTS (SELECT 1 FROM vai_tro WHERE ten_vai_tro = 'ADMIN')
    INSERT INTO vai_tro (ten_vai_tro, mo_ta) VALUES ('ADMIN', N'Quản trị hệ thống');

IF NOT EXISTS (SELECT 1 FROM vai_tro WHERE ten_vai_tro = 'LE_TAN')
    INSERT INTO vai_tro (ten_vai_tro, mo_ta) VALUES ('LE_TAN', N'Bộ phận Lễ tân');

IF NOT EXISTS (SELECT 1 FROM vai_tro WHERE ten_vai_tro = 'NHAN_VIEN_SPA')
    INSERT INTO vai_tro (ten_vai_tro, mo_ta) VALUES ('NHAN_VIEN_SPA', N'Kỹ thuật viên Spa');

-- Fetch modern IDs for mapping
DECLARE @AdminId INT = (SELECT ma_vai_tro FROM vai_tro WHERE ten_vai_tro = 'ADMIN');
DECLARE @LeTanId INT = (SELECT ma_vai_tro FROM vai_tro WHERE ten_vai_tro = 'LE_TAN');
DECLARE @SpaId INT = (SELECT ma_vai_tro FROM vai_tro WHERE ten_vai_tro = 'NHAN_VIEN_SPA');


-- 2. Map and Re-assign User Roles
PRINT '2. Mapping and Re-assigning User Roles...';

-- Temporarily identify target role for every staff member
IF OBJECT_ID('tempdb..#TargetUserRoles') IS NOT NULL DROP TABLE #TargetUserRoles;
CREATE TABLE #TargetUserRoles (
    ma_nguoi_dung INT PRIMARY KEY,
    target_role_id INT
);

INSERT INTO #TargetUserRoles (ma_nguoi_dung, target_role_id)
SELECT 
    u.ma_nguoi_dung,
    CASE 
        -- Rule 1: Admin check
        WHEN u.email LIKE '%admin%' 
             OR EXISTS (SELECT 1 FROM nguoi_dung_vai_tro rv WHERE rv.ma_nguoi_dung = u.ma_nguoi_dung AND rv.ma_vai_tro = 1)
        THEN @AdminId
        
        -- Rule 2: Receptionist check
        WHEN EXISTS (SELECT 1 FROM nhan_vien nv WHERE nv.ma_nguoi_dung = u.ma_nguoi_dung AND nv.chuc_vu LIKE N'%lễ tân%')
        THEN @LeTanId
        
        -- Rule 3: Staff check
        ELSE @SpaId
    END
FROM nguoi_dung u;

-- 2.1 Remove all existing role assignments to start clean (within transaction)
DELETE FROM nguoi_dung_vai_tro;

-- 2.2 Re-insert only the correct, singular role assignment
INSERT INTO nguoi_dung_vai_tro (ma_nguoi_dung, ma_vai_tro, ngay_gan)
SELECT ma_nguoi_dung, target_role_id, GETDATE()
FROM #TargetUserRoles;


-- 3. Cleanup redundant roles
PRINT '3. Cleaning up redundant roles...';
DELETE FROM vai_tro 
WHERE ten_vai_tro NOT IN ('ADMIN', 'LE_TAN', 'NHAN_VIEN_SPA');


-- 4. Standardize Staff Data (Positions & Departments)
PRINT '4. Standardizing Staff positions and departments...';
UPDATE nv
SET 
    nv.chuc_vu = CASE 
        WHEN rv.ma_vai_tro = @AdminId THEN N'Admin'
        WHEN rv.ma_vai_tro = @LeTanId THEN N'Lễ tân'
        ELSE N'Nhân viên spa'
    END,
    nv.phong_ban = CASE 
        WHEN rv.ma_vai_tro = @AdminId THEN N'Hệ thống'
        WHEN rv.ma_vai_tro = @LeTanId THEN N'Lễ tân'
        ELSE N'Spa'
    END
FROM nhan_vien nv
JOIN nguoi_dung_vai_tro rv ON nv.ma_nguoi_dung = rv.ma_nguoi_dung;


-- 5. Final Deduplication check (ensure 1:1 user-role relationship)
PRINT '5. Final Deduplication check...';
WITH CTE_Roles AS (
    SELECT 
        ma_nguoi_dung, 
        ma_vai_tro,
        ROW_NUMBER() OVER (PARTITION BY ma_nguoi_dung ORDER BY ma_vai_tro ASC) as rn
    FROM nguoi_dung_vai_tro
)
DELETE FROM CTE_Roles WHERE rn > 1;

IF OBJECT_ID('tempdb..#TargetUserRoles') IS NOT NULL DROP TABLE #TargetUserRoles;

-- 6. COMMIT if everything is fine
COMMIT;
PRINT 'Migration completed successfully.';
GO

-- =========================================================================
-- BONUS: Standard Query to fetch staff list WITHOUT duplicates
-- =========================================================================
SELECT 
    u.ma_nguoi_dung,
    u.ho_ten,
    u.email,
    r.ten_vai_tro AS VaiTro,
    nv.chuc_vu AS ChucVu,
    nv.phong_ban AS PhongBan,
    nv.ma_nhan_vien_code
FROM nguoi_dung u
INNER JOIN nguoi_dung_vai_tro rv ON u.ma_nguoi_dung = rv.ma_nguoi_dung
INNER JOIN vai_tro r ON rv.ma_vai_tro = r.ma_vai_tro
LEFT JOIN nhan_vien nv ON u.ma_nguoi_dung = nv.ma_nguoi_dung
ORDER BY r.ma_vai_tro ASC, u.ho_ten ASC;
