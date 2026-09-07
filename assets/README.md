# Space asset library

The asset tree separates website-ready files from master campaign archives:

```text
assets/
  brand/
    campaigns/          Space-owned campaign media
    identity/           Logos and watermark
    people/             Team portraits
    portfolio/logos/    Partner logo tiles and transparent marks
  editorial/
    about/              About-page editorial images
    brands/             Brand portfolio hover scenes
    expertise/          Expertise-page editorial images
    regions/
      context/          General regional imagery
      markets/          The 19 interactive-map scenes
      offices/          Dubai, Nairobi, New Delhi and Nice
    ventures/           Subsidiary and retail-venture imagery
  media/
    source/brands/      Original brand campaign archive (not deployed)
    generated/catalog/  Generated development indexes
    generated/derivatives/ Web-ready display, mobile and thumbnail files
    runtime/             Browser manifests, taxonomy and curation state
```

Page code must reference `brand/`, `editorial/`, `media/generated/derivatives/` or
`media/runtime/`. Never link a public page directly to `media/source/brands/`.

New campaign masters belong under `media/source/brands/<brand>/`. Run the media commands below
to publish derived files and refresh the manifests. Large or unsupported masters remain archived
but are marked `webReady: false` until converted.

## Review and shortlist

Open `/tools/media/library/index.html` while the local server is running. It shows the exact Hero and Carousel candidate pools, with filters for brand, format, and publication status. Excluding an item only writes its stable ID to `media/runtime/media-curation.json`; it never deletes or moves the master file.

Hero boards automatically reject detected white or light backgrounds and always pair assets from different top-level brand folders. An editor can override the automatic light-background decision from the review screen.

## Web derivatives

Run `npm run optimize:media` after adding source images, followed by `npm run generate:media` and `npm run generate:hero-mobile`. The commands create lightweight display copies, thumbnails and mobile hero files under `media/generated/derivatives/`, then connect them to the public manifest.

The master library is an archive, not a production delivery layer. A future CMS should upload masters to object storage, generate responsive image sizes and video renditions asynchronously, and publish only CDN URLs plus metadata to this manifest contract.
