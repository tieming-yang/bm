# Agent Instructions

## Collaboration Rules

- Do not edit code or documentation directly unless the user ends the request with `edit`.
- Ask questions when requirements are unclear. Do not guess on product, security, payment, or data-model behavior.
- Work in small, reviewable chunks. Prefer phased implementation over one large change.
- Do not revert user changes unless the user explicitly asks for that exact operation.
- Use English for non-user-facing errors. User-facing copy may follow the product language requirements.

## Defensive Implementation Style

- Validate every trust boundary: persisted data, callable input, scheduled-job input, provider payloads, and client-readable documents.
- Throw immediately when data is malformed or invariants are broken. Do not silently coerce invalid state.
- Prefer runtime schemas for persisted or external data. Derive TypeScript types from those schemas when runtime validation is required.
- Keep canonical server-owned state separate from client-readable state.
- Never expose private provider identifiers, purchase tokens, transaction IDs, or internal audit fields through client-readable documents unless explicitly required.
- Make mutation helpers enforce invariants such as stable `uid`, immutable `createdAtMs`, monotonic `updatedAtMs`, and valid state transitions.
- Read existing state inside transactions before writing when stale overwrites or concurrent updates are possible.
- Keep error messages concrete enough to identify the broken invariant.

## When to Abstract and When to Inline

**Inline when:**
- The expression is obvious and short, like `readAppEnvironment() === "dev"`.
- It is used once or twice in nearby code.
- The helper name would only restate the expression, like `shouldWritePurchaseTrace`.
- There is no shared policy beyond the condition itself.
- The abstraction would force the reader to jump files to understand one boolean.

**Abstract when:**
- The condition has 3+ clauses or non-obvious domain meaning.
- It is reused across modules and must stay consistent.
- It protects a security/payment/data boundary.
- It has validation, normalization, logging, or error behavior.
- It is likely to change in one place, for example later adding `diagnosticOverride`.
- The helper name explains domain intent better than the raw expression.

For this case, use inline:

```ts
if (readAppEnvironment() !== "dev") {
  return;
}
```

Do not add:

```ts
shouldWritePurchaseTrace()
```

because it hides a simple condition and adds cognitive load.

## Documentation Style

- Document exported backend functions, schemas, and policy helpers with concise JSDoc.
- Include examples only when they clarify expected behavior or caller usage.
- Keep comments focused on non-obvious policy, invariants, or security boundaries.
- Avoid comments that restate what the code already says.

## Testing Expectations

- Cover happy paths and failure paths.
- Test malformed persisted data and invalid cross-field state.
- Test stale writes, backwards timestamps, changed identifiers, and privilege boundary mistakes.
- Test derived client-readable views to ensure private fields are not leaked.
- For scheduled or automated backend behavior, include concrete tests for timing boundaries and idempotency.
- Prefer small fake adapters for unit tests when emulator coverage would be too heavy for the current chunk.
