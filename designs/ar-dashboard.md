# AR Dashboard Management & R2 Upload Implementation Plan

We need to implement a fully functional AR administration dashboard under `/dashboard/ar`. This includes:
- **Cloudflare R2 Integration**: Uploading 3D models (`.glb`), audio tracks (`.mp3`), videos, and compiled target files (`.mind`) via a Next.js server-side API.
- **Model CRUD**: Managing the pool of reusable 3D models (stored in the `models` Firestore collection).
- **Collection CRUD**: Creating and editing AR collections (stored in the `ar` Firestore collection).
- **Reorderable Item Selection**: Adding models from the pool into a collection, reordering them to align with MindAR `targetIndex` locations, and uploading local assets (e.g. audios, videos) specific to that collection item.

---

## User Review Required

> [!IMPORTANT]
> - **Dependency Additions**: We will install `@aws-sdk/client-s3` to allow Next.js server-side API endpoints to upload files to Cloudflare R2.
> - **Defensive Environment Variable Verification**: The server will check for R2 credentials immediately when initialization starts. It will **throw an error immediately** with a detailed message identifying the missing variable if any of the following are undefined:
>   - `CLOUDFLARE_R2_ACCESS_KEY_ID`
>   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
>   - `CLOUDFLARE_R2_ENDPOINT`
>   - `CLOUDFLARE_R2_BUCKET_NAME`
>   - `CLOUDFLARE_R2_TOKEN`
> - **Per-Action Role Authorization**: All backend routes under `/api/admin/ar` will verify the caller's bearer token identity and only permit access if their Firestore profile role is `admin`, applied rigorously to every action (GET, POST, PUT, DELETE).
> - **Validation Schemes**: We define strict Zod schemas for all uploads and database inputs.
> - **Sonner Toasts**: All state transitions, success events, and failures will trigger toast notifications using the `sonner` package, displaying the raw error message to facilitate admin-level debugging.

---

## Proposed Changes

### 1. Dependencies

#### [MODIFY] [package.json](file:///Users/snow/Projects/bm/package.json)
- Add `@aws-sdk/client-s3` for Cloudflare R2 file uploads.

---

### 2. Validation & Schemas

#### [MODIFY] [data.ts (AR and Model Schemas)](file:///Users/snow/Projects/bm/src/app/(works)/ar/data.ts)
Ensure schemas are ready for CRUD validation:
- Define `UploadTypeScheme` as `z.enum(["model", "audio", "video", "target"])`.
- Ensure `ModelWriteScheme` and `ARWriteScheme` can be easily parsed by client and server.

---

### 3. Backend API Setup

#### [NEW] [route.ts (R2 Upload)](file:///Users/snow/Projects/bm/src/app/api/admin/ar/upload/route.ts)
A secure multipart/form-data upload route:
- Validates the token and verifies the role is `admin` (per-action verification).
- Asserts that all R2 environment variables (`CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_TOKEN`) are present, otherwise throws a descriptive error immediately.
- Validates `type` parameter using `UploadTypeScheme` (`"model" | "audio" | "video" | "target"`).
- Connects to Cloudflare R2 using AWS S3 SDK.
- Uploads the file into the bucket with a key format: `ar/<type>/<timestamp>-<filename>`.
- Returns `{ path: "/ar/<type>/<timestamp>-<filename>" }`.

#### [NEW] [route.ts (Collections List/Create)](file:///Users/snow/Projects/bm/src/app/api/admin/ar/collections/route.ts)
- `GET`: Fetches and returns all documents in the `ar` collection (authorized, per-action verification).
- `POST`: Validates payload with `ARWriteScheme`, creates a document in the `ar` collection (authorized, per-action verification).

#### [NEW] [route.ts (Collection Mutations)](file:///Users/snow/Projects/bm/src/app/api/admin/ar/collections/%5Bid%5D/route.ts)
- `PUT`: Validates payload with `ARWriteScheme`, updates an existing collection document by `id` (authorized, per-action verification).
- `DELETE`: Removes a collection document by `id` (authorized, per-action verification).

#### [NEW] [route.ts (Models List/Create)](file:///Users/snow/Projects/bm/src/app/api/admin/ar/models/route.ts)
- `GET`: Fetches and returns all documents in the `models` collection (authorized, per-action verification).
- `POST`: Validates payload with `ModelWriteScheme`, creates a model document (authorized, per-action verification).

#### [NEW] [route.ts (Model Mutations)](file:///Users/snow/Projects/bm/src/app/api/admin/ar/models/%5Bid%5D/route.ts)
- `PUT`: Validates payload with `ModelWriteScheme`, updates an existing model document by `id` (authorized, per-action verification).
- `DELETE`: Removes a model document by `id` (authorized, per-action verification).

---

### 4. Front-End Admin UI (Two-Tab Layout)

#### [MODIFY] [page.tsx](file:///Users/snow/Projects/bm/src/app/dashboard/ar/page.tsx)
Replace the current placeholder stub with a dashboard rendering two main tabs:
1. **專案管理 (Collections)**:
   - Lists collections with titles, versions, and item counts.
   - Dialogs to Create, Edit, and Delete collections.
   - Collection Creation/Editing Form:
     - Name, description, version inputs.
     - Direct upload button for MindAR `.mind` targets file.
     - **專案角色項目 (Collection Items)** editor:
       - Dropdown to select a model from the **3D 模型庫 (Models Pool)**.
       - A list of added items showing model name and path.
       - Inputs/Upload buttons to upload specific audios (`audioPath`, `audioPathZh`) and videos (`videoPath`) for each item in the collection.
       - **Reorder buttons (Move Up / Move Down)**: to align collection items directly with target index mapping in the `.mind` file.
       - Remove item option.
2. **3D 模型庫 (Models Pool)**:
   - Lists all models in the database.
   - Dialog to Add Model: upload `.glb` file, input title & titleZh.
   - Actions to edit titles or delete models.

Toasts:
- Using `sonner` to report success/error for every action.
- Print raw errors in error toasts (e.g. `toast.error(error.message || String(error))`).

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to ensure compile-time safety and type completeness.

### Manual Verification
- Verify that uploads fail gracefully with descriptive error messages when required environment variables are unset.
- Try uploading a sample `.glb` and `.mind` file.
- Verify creation, update, item reordering, and deletion of a collection.
- Ensure the collection can select and display models.
