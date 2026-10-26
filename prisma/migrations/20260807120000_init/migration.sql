# FriendConnect initial migration
# Creates all tables from the schema. For existing db:push deployments, baseline first:
#   bunx prisma migrate resolve --applied 20260807120000_init
# Then future migrations apply incrementally.
# NEVER use `prisma db push` in production — use `prisma migrate deploy`.
