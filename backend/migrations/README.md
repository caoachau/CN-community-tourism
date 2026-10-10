# Database design migrations

`001_initial_schema.sql` is the proposed initial schema for Aiven MySQL 8.4.11: **41 tables, compact design v2**. It replaces the undeployed 55-table draft; it is not an upgrade script for an existing database. Run it once against an explicitly selected **empty development schema**. It does not create/drop databases, contain credentials, seed accounts, or implement application transactions. DDL statements auto-commit; an incomplete import must be inspected before continuing.

Read the [database design](../../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/README.md), [transaction contract](../../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/TRANSACTIONS.md), and [Workbench/Aiven instructions](../../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/AIVEN_AND_VALIDATION.md) first.

Once deployed, keep this migration immutable and add numbered migrations for subsequent changes. A migration runner and checksummed migration history are not implemented yet; startup does not apply this file automatically. The Express API now verifies a mysql2/promise TLS connection at startup; this does not create or validate the application schema.

The initial DDL has now been applied and validated on disposable local MySQL 8.4.11 schemas through the [test harness](../test/README.md). This test-only migration loader is separate from a production migration runner; it has not imported the schema into Aiven.
