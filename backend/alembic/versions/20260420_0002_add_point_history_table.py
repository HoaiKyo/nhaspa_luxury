"""add loyalty point history table

Revision ID: 20260420_0002
Revises: 20260419_0001
Create Date: 2026-04-20 09:30:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260420_0002"
down_revision = "20260419_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    if "lich_su_diem" in table_names:
        return
    if "nguoi_dung" not in table_names:
        return

    has_invoice = "hoa_don" in table_names

    columns = [
        sa.Column("ma_lich_su", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ma_khach_hang", sa.Integer(), nullable=False),
        sa.Column("ma_hoa_don", sa.Integer(), nullable=True),
        sa.Column("loai_bien_dong", sa.String(length=40), nullable=False),
        sa.Column("diem_thay_doi", sa.Integer(), nullable=False),
        sa.Column("so_du_sau", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("noi_dung", sa.Unicode(length=255), nullable=True),
        sa.Column("ngay_tao", sa.DateTime(), nullable=True, server_default=sa.text("GETDATE()")),
        sa.ForeignKeyConstraint(["ma_khach_hang"], ["nguoi_dung.ma_nguoi_dung"]),
    ]

    if has_invoice:
        columns.append(sa.ForeignKeyConstraint(["ma_hoa_don"], ["hoa_don.ma_hoa_don"]))

    op.create_table("lich_su_diem", *columns)
    op.create_index("ix_lich_su_diem_ma_khach_hang", "lich_su_diem", ["ma_khach_hang"])
    op.create_index("ix_lich_su_diem_ma_hoa_don", "lich_su_diem", ["ma_hoa_don"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "lich_su_diem" not in inspector.get_table_names():
        return

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("lich_su_diem")}
    if "ix_lich_su_diem_ma_hoa_don" in existing_indexes:
        op.drop_index("ix_lich_su_diem_ma_hoa_don", table_name="lich_su_diem")
    if "ix_lich_su_diem_ma_khach_hang" in existing_indexes:
        op.drop_index("ix_lich_su_diem_ma_khach_hang", table_name="lich_su_diem")

    op.drop_table("lich_su_diem")
