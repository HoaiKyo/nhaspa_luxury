import sqlite3
conn = sqlite3.connect('backend/spa_management.db')
cursor = conn.cursor()
query = """
SELECT lh.ma_lich_hen, lh.ngay_hen, lh.gio_bat_dau, lh.trang_thai, ct.ma_nhan_vien, nv.ho_ten 
FROM lich_hen lh 
JOIN chi_tiet_lich_hen ct ON lh.ma_lich_hen = ct.ma_lich_hen 
LEFT JOIN nhan_vien n ON ct.ma_nhan_vien = n.ma_nhan_vien
LEFT JOIN nguoi_dung nv ON n.ma_nguoi_dung = nv.ma_nguoi_dung
WHERE nv.ho_ten LIKE '%Phúc%' AND lh.ngay_hen = '2026-06-01'
"""
cursor.execute(query)
rows = cursor.fetchall()
for row in rows:
    print(row)
