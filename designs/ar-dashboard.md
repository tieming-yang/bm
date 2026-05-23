# Walkthrough - AR Dashboard Management & R2 Upload

I have implemented the complete administration portal for AR experience management under `/dashboard/ar` along with the corresponding backend APIs, database CRUD operations, and Cloudflare R2 file upload integration.

---

## Changes Made

### 1. Cloudflare R2 File Upload Integration
#### [route.ts (Upload)](file:///Users/snow/Projects/bm/src/app/api/admin/ar/upload/route.ts) [NEW]
Created a secure `POST` API route to upload assets to Cloudflare R2 bucket:
- **Authorization**: Verifies bearer ID token and asserts the user profile has the `admin` role. Returns `404 Not Found` for unauthorized calls to mask the endpoint's existence.
- **Defensive Environment Checks**: Checks all R2 environment variables (`CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_TOKEN`) immediately, throwing descriptive exceptions on any omission.
- **Payload Validation**: Validates the upload type parameter using `UploadTypeScheme` (`"model" | "audio" | "video" | "target"`).
- **Size Limits**: Enforces 100MB size limit for GLB models and videos, and 20MB for audio tracks and `.mind` target files.
- **R2 Storage Key**: Formats keys as `ar/<type>/<timestamp>-<sanitized-filename>` using `@aws-sdk/client-s3`.
- **Return Value**: Returns JSON `{ path: "/ar/<type>/<timestamp>-<filename>" }`.

---

### 2. Firestore CRUD Endpoints & Auth Helpers
#### [auth.ts](file:///Users/snow/Projects/bm/src/app/api/admin/ar/auth.ts) [NEW]
- Added a reusable server-side authorization check `verifyAdmin(request)` to decode ID tokens and verify that the user's Firestore profile has `role === "admin"`. If unauthorized, it throws a "Not Found" error to respond with a `404` status.

#### [route.ts (Collections List/Create)](file:///Users/snow/Projects/bm/src/app/api/admin/ar/collections/route.ts) [NEW]
- `GET`: Lists all documents in the `ar` collection (admin-only, ordered by `createdAt` descending). Serializes Firestore `Timestamp` objects into serialize-friendly `{ seconds, nanoseconds }` format.
- `POST`: Validates the payload using `ARWriteScheme` and saves the collection document.

#### [route.ts (Collection Mutations)](file:///Users/snow/Projects/bm/src/app/api/admin/ar/collections/[id]/route.ts) [NEW]
- `PUT`: Updates an existing collection document, validating parameters via `ARWriteScheme` and updating the `updatedAt` server timestamp.
- `DELETE`: Deletes the specified collection document and cleans up its `.mind` target file from Cloudflare R2 bucket.

#### [route.ts (Models Pool List/Create)](file:///Users/snow/Projects/bm/src/app/api/admin/ar/models/route.ts) [NEW]
- `GET`: Lists all models in the pool (admin-only, ordered by `createdAt` descending).
- `POST`: Validates model metadata using `ModelWriteScheme` and saves the model.

#### [route.ts (Model Mutations)](file:///Users/snow/Projects/bm/src/app/api/admin/ar/models/[id]/route.ts) [NEW]
- `PUT`: Updates an existing model's metadata (titles, modelPath) in the pool.
- `DELETE`: Deletes the model if it is not referenced by any collection. Blocks deletion with a `400` error if referenced. If deletion is allowed, recursively deletes all assets under the model's `characters/${sanitizedTitle}/` prefix in Cloudflare R2 before removing the model document.

---

### 3. Front-End Admin UI
#### [page.tsx](file:///Users/snow/Projects/bm/src/app/dashboard/ar/page.tsx) [MODIFY]
Replaced the stub with a comprehensive management console featuring a two-tab layout in Traditional Chinese (`zh-TW`):
- **專案管理 (Collections Tab)**:
  - Lists collections showing their titles, versions, and item counts.
  - Dialog modal for adding/editing a collection. Supports updating title, description, version, and uploading `.mind` files.
  - **Collection Items Editor**: Allows select-and-add of 3D models from the Models Pool.
  - **Ordering Controls**: Implements "Move Up" and "Move Down" buttons for collection items to match target index sequences in compiling.
  - **Asset Uploads**: Inline upload inputs for Default/English audio (`audioPath`), Chinese audio (`audioPathZh`), and video (`videoPath`).
- **3D 模型庫 (Models Pool Tab)**:
  - Lists models in a table showing their names (Chinese/English), types, and GLB paths.
  - Dialog modal for adding/editing models to upload `.glb` files and specify titles.
  - **Delete Operation**: Allowed if the model is not referenced by any collection. Confirms via a warning dialog and displays toast error if rejected.
- **UX & Safety**:
  - Leverages a custom `FileUploader` rendering upload progress, supporting file extension constraints, size limits, and a clear button.
  - Tracks active uploads to block form submissions (`儲存`) while uploads are in progress.
  - Displays confirmation dialogs before collection deletions.
  - Triggers toasts via `sonner` reporting success or printing raw error details to aid debugging.

---

## Verification

### 1. Compile Verification
- Ran TypeScript checks (`npx tsc --noEmit`) to verify compiler safety. The new pages, models, and endpoints compile cleanly.

### 2. Manual Verification Checklist
- [x] Assert R2 configurations populate correctly in `.env.local`.
- [x] Test model upload (`.glb`) and targets upload (`.mind`) via the UI file picker.
- [x] Test item adding, reordering (Move Up / Move Down), audio/video uploads, and form submission.
- [x] Test collection deletion prompt, R2 target file cleanup, and Firestore document deletion.
- [x] Test model deletion: successfully blocks deletion when the model is in a collection (toasts Chinese error) and successfully deletes the model and R2 files when it is not in use.


