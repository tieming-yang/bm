## Domains && Sub Domains
beyond-media.art              -> Vercel site
www.beyond-media.art          -> Vercel site / redirect
ar-assets.beyond-media.art    -> Cloudflare R2 bucket
shop.beyond-media.art         -> Shopify, unchanged

## AR
### User visit flow
```text
Scan QR code -> /vr/ (one target file match 23 character for now 04-23-2026 Thursday)
```


### R2 Path
/ar-assets/characters/[character]/[version]
```text
e.g. /ar-assets/characters/adam/v0
```

/ar-assets/targets/[collection]/[version]
```text
e.g. ar-assets/targets/collection-00/v0/
```

### Firestore Path
#### AR
/(default)/ar/[id]

#### Models
/(default)/models/[id]

### Create new AR item
Currently we use Firestore directly as CMS, we have a script for create:
```shell
node src/scripts/admin/create-ar.ts
node src/scripts/admin/create-model.ts
```
