# Scheduling

Aplikasi penjadwalan shift mingguan untuk tim Kyne (6 staf bar & kitchen plus 1 manager).

- PRD (sumber kebenaran): `docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md`
- Keputusan arsitektur: `docs/adr/`
- Istilah domain: `GLOSSARY.md`
- Bahasa visual: `DESIGN.md`

## Stack

Monorepo Bun workspaces + Turborepo (ADR 0001).

| Direktori | Isi |
| --- | --- |
| `web` | Next.js 16 (App Router) sebagai PWA: tampilan staf dan dashboard manager |
| `api` | NestJS: seluruh aturan bisnis, RBAC, validasi; Prisma ke Supabase Postgres |
| `packages/types` | Tipe bersama, termasuk `SHIFT_TYPE_CATALOG` (jam shift dari PRD) |
| `packages/validators` | Skema zod yang dipakai api dan seed |

## Getting started

Butuh Bun 1.4.3 dan database Postgres (Supabase).

```sh
bun install
cp .env.example .env      # isi DATABASE_URL (pooled) dan DIRECT_URL (direct)
bun run db:generate       # generate Prisma client ke api/src/generated
bun run db:migrate        # terapkan migrasi, termasuk RLS deny-all
bun run db:seed           # seed shift_type PAGI/SORE/MIDDLE
bun run dev               # web :3000, api :3001
```

## Perintah

| Perintah | Efek |
| --- | --- |
| `bun run dev` | web dan api mode watch |
| `bun run build` | build semua paket |
| `bun run typecheck` | `tsc --noEmit` di semua paket |
| `bun run test` | unit test (vitest) |
| `bun run test:api` | integration test api (jest) |
| `bun run format` | prettier |

`GET http://localhost:3001/health` mengembalikan `{"status":"ok"}`. Endpoint ini cek liveness saja, belum menyentuh database.

## Database

- RLS deny-all di `employee` dan `shift_type`: browser tidak pernah membaca tabel, satu-satunya jalan ke data adalah api lewat koneksi langsung sebagai owner tabel.
- Prinsip siap-ERP: UUID, `created_at`/`updated_at`/`created_by`, dan tidak ada hapus permanen (staf cukup dinonaktifkan).
- Jam `shift_type` disimpan sebagai `HH:MM` WITA di kolom `varchar(5)` dengan CHECK constraint, bukan kolom `time`, supaya tidak tergeser zona waktu sesi database.
