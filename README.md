## Domains
beyond-media.art              -> Vercel site
www.beyond-media.art          -> Vercel site / redirect
ar-assets.beyond-media.art    -> Cloudflare R2 bucket
shop.beyond-media.art         -> Shopify, unchanged

## AR
### User visit flow
Scan QR code -> /vr/[id]

*e.g. /vr/adam*

### R2 Path
/ar-assets/characters/[character]/[version]

*e.g. /ar-assets/characters/adam/v0*

### Firestore Path
/(default)/ar/[id]

### Create new AR item
Currently we use Firestore directly as CMS, we have a script for create:
```shell
node src/scripts/admin/create-ar.ts
```
