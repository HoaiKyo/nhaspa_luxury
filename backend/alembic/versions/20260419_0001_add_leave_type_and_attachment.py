"""add leave type and attachment columns

Revision ID: 20260419_0001
Revises:
Create Date: 2026-04-19 23:35:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260419_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "nghi_phep" not in inspector.get_table_names():
        return
    existing_columns = {column["name"] for column in inspector.get_columns("nghi_phep")}

    if "loai_nghi" not in existing_columns:
        op.add_column(
            "nghi_phep",
            sa.Column("loai_nghi", sa.String(length=20), nullable=False, server_default="ANNUAL"),
        )
        op.execute("UPDATE nghi_phep SET loai_nghi = 'ANNUAL' WHERE loai_nghi IS NULL")

    if "dinh_kem" not in existing_columns:
        op.add_column("nghi_phep", sa.Column("dinh_kem", sa.Unicode(length=1000), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "nghi_phep" not in inspector.get_table_names():
        return
    existing_columns = {column["name"] for column in inspector.get_columns("nghi_phep")}

    if "dinh_kem" in existing_columns:
        op.drop_column("nghi_phep", "dinh_kem")
    if "loai_nghi" in existing_columns:
        op.drop_column("nghi_phep", "loai_nghi", mssql_drop_default=True)
