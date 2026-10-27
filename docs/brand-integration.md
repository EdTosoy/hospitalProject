# abox brand integration — Phase 2A

The existing application now uses **abox — Hospital Management Platform** on its
public and authenticated surfaces. The follow-up color request is included:
application teals are sampled from the approved wordmark. This is brand and
palette integration; page layouts, workflows, authentication, authorization,
backend logic, deployment resources, and repository identity are preserved.

## Supplied asset inventory and selection

Actual source directory: `apps/frontend/assets/` (not a repository-root directory).
It contains 61 files: `START-HERE.txt` plus four sets of 15 files. Every supplied
`SHA256SUMS.txt` matched before and after implementation. No supplied file was
modified. There are no SVG/vector sources, inverse wordmarks, or maskable icons.

| Supplied set | Master | Transparency, padding, and quality | Selection |
| --- | --- | --- | --- |
| `01-symbol` | `original.png`, PNG, 1254×1254 | RGBA, transparent background; gradient cube/cross, internal margins and scattered edge pixels remain in source. No baked-in checkerboard observed. | Browser ICO and 16/32/48px PNGs copied unchanged; `icon-256.png` copied as the compact/mobile UI symbol. |
| `02-light-tile` | `original.png`, PNG, 1254×1254 | Opaque white field, rounded light tile, baked-in shadow and wide outer margins. This is a tile composition, not a clean transparent UI logo. | Supplied 180px Apple and 192/512px Android icons copied unchanged. Their alpha channels are fully opaque; the white tile is intentional for device icons. |
| `03-dark-tile` | `original.png`, PNG, 1254×1254 | Opaque white outer field surrounding a dark rounded tile; substantial margins. It is not a transparent dark-surface logo. | Preserved, unused. Avoids introducing white margins into compact navigation. |
| `04-wordmark` | `original.png`, PNG, 2172×724 | Transparent horizontal symbol plus lowercase wordmark, dark lettering, transparent outer padding, and source edge speckling. Its device/favicons are square-padded and too small for readable browser text. | UI wordmark comes from this high-resolution original, never a small favicon. |

Each set contains the following complete inventory:

| Files in each set | Format / dimensions |
| --- | --- |
| `original.png` | Master dimensions above |
| `favicon.ico` | ICO with embedded 16×16, 32×32, and 48×48 images |
| `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` | PNG at the named dimensions |
| `apple-touch-icon.png` | PNG, 180×180 |
| `android-chrome-192x192.png`, `android-chrome-512x512.png` | PNG at the named dimensions |
| `icon-192.png`, `icon-256.png`, `icon-512.png` | Generic PNG at the named dimensions |
| `mstile-150x150.png` | PNG, 150×150; retained but not needed by this integration |
| `site.webmanifest` | Supplied sample; preserved rather than published with its sample colors/display mode |
| `README.txt`, `SHA256SUMS.txt` | Source instructions and integrity checks |

The deployed wordmark `public/brand/abox-wordmark.png` is a **lossless crop** of
`04-wordmark/original.png`: left 170, top 23, width 1898, height 661. This removes
only completely transparent outer rows/columns. Decoded pixels exactly match
that source rectangle. No visible pixels were retouched, no colors changed, no
logo was redrawn, and no source was upscaled. Conversion used Sharp already
installed with Next.js; no dependency was added. The source master remains intact.

The shared `BrandLogo` uses `next/image` with intrinsic dimensions to reserve
space and preserve aspect ratio. Wordmarks use the supplied dark lettering on
light surfaces. Under the existing `.dark` class, a plain white backing keeps the
same wordmark readable. The transparent symbol works on both surfaces. No
unapproved inverse/recolored logo is manufactured.

## Palette and branding locations

The wordmark's pixel at (480,160) supplies bright teal **#00ada7**; (620,440)
supplies deep teal **#02666e**. The brighter symbol master has a different gradient;
it is preserved as supplied. The app palette follows the horizontal wordmark.

- Filled primary actions use #00ada7 with #172d38 text, approximately **5.13:1**
  contrast. White text on that teal is approximately 2.79:1, so it is not used.
- Links, light-surface labels, icons, and focus rings use #02666e; contrast on
  white is approximately **6.71:1**. Dark-surface primary accents use #00ada7.
- Sidebar, selection, pale feature panels, and positive/active status badges use
  related teal tints. Destructive and waiting/error status meanings are retained.
  These measurements cover the selected brand pairs, not a full accessibility audit.

Branding appears in the landing header and footer, landing product descriptor,
login/register desktop and mobile shells, login copy, sidebar wordmark and role
subtitle, collapsed-sidebar symbol, mobile workspace header, browser title,
description, application name, icons, and manifest. Every role uses the same
sidebar/header, so all six workspaces inherit the brand without dashboard rewrites.
Loading and empty-state copy had no old product name and remains unchanged.

## Browser metadata and icons

- `src/app/layout.tsx`: title `abox — Hospital Management Platform`,
  `applicationName: "abox"`, product description, and explicit 16/32/48px PNG links
  plus the 180px Apple link. `viewport.themeColor` is #00ada7.
- `src/app/favicon.ico`: the sole file-convention ICO, copied from `01-symbol`.
  There is no second public ICO, explicit duplicate ICO declaration, or generated
  `icon.tsx` competing with it. The browser received one ICO link and three PNG
  links, all from the same approved symbol set.
- `public/apple-touch-icon.png` and `public/android-chrome-{192x192,512x512}.png`:
  supplied light-tile device assets. All served bytes match their supplied sources.
- `src/app/manifest.ts`: the sole live manifest, served automatically as
  `/manifest.webmanifest`. Name/short name are `abox`, description is
  `Hospital Management Platform`, start/scope are `/`, display is `browser`, theme
  color is #00ada7, and background is the existing #f5f8fa. Icons declare only
  `purpose: "any"`. No maskable, offline, service-worker, or installability claim
  is made. The manifest supplies Android/home-screen metadata for the website.

Implementation was checked against the installed Next.js **16.4.1** guides under
`node_modules/next/dist/docs/`: `app-icons.md`, `manifest.md`,
`generate-metadata.md`, `generate-viewport.md`, and the Image component guide.
Theme color uses the viewport export rather than the deprecated metadata field.

## Changed files

Paths below are relative to `apps/frontend/` unless specified otherwise.

| Files | Change |
| --- | --- |
| `src/components/brand-logo.tsx`, `public/brand/abox-{wordmark,symbol}.png` | Reusable approved images and their deployed sources |
| `src/app/page.tsx`, `src/components/auth-shell.tsx` | Public/auth wordmarks, product copy, footer, mobile branding, and teal surfaces |
| `src/components/app-sidebar.tsx`, `team-switcher.tsx`, `workspace-header.tsx` | Expanded/compact/mobile branding; existing role navigation remains |
| `src/components/login-form.tsx`, `register-form.tsx`, `add-patient-modal.tsx`, `ui/button.tsx`, `care-ui.tsx`, `src/app/globals.css` | Product copy and requested logo-matched color tokens/classes; form/validation logic is unchanged |
| `src/app/layout.tsx`, `manifest.ts`, `favicon.ico`; six public favicon/device PNGs | Browser metadata and approved icon variants |
| `test/workflows.spec.ts` | Existing keyboard test expects “Back to abox”; assertions and workflow coverage remain |
| Root `README.md`, frontend `README.md`, root `docs/api/Hospital Project API.postman_collection.json` | Current product docs and Postman description; API requests unchanged |
| Root `docs/brand-integration.md` | Asset provenance, verification, and limitations |

## Executed verification

Local Node: 24.21.0; package manager: repository-pinned pnpm 9 via the existing
Corepack wrapper on PATH. No new dependencies were installed.

| Command / scenario | Outcome |
| --- | --- |
| `pnpm --filter frontend typecheck` | **PASS**, exit 0 |
| Installed Biome `check` through the documented Nix loader | **PASS**, exit 0, 78 files; unchanged sidebar preference-cookie warning, no errors |
| Installed Biome `format` through the same loader | **PASS**, exit 0, 78 files; no writes |
| `pnpm --filter frontend build` after final palette changes | **PASS**, exit 0; TypeScript passed and 16 routes generated, including the manifest |
| Supplied SHA-256 checks, deployed icon byte comparisons, wordmark decoded-pixel comparison, device opacity/dimension checks | **PASS**; all 61 supplied files preserved |
| `node /tmp/abox-phase2a/verify-brand.cjs` against standalone port 33102 | **PASS**, exit 0; 19 states plus icon comparison sheet, 26 synthetic API reads, zero API writes, zero runtime/console/HTTP/image errors |
| Screenshot inspection | **PASS** for brand placement, palette, proportions, desktop/compact/mobile navigation, light/dark wordmarks, and 16/32px icon recognition |
| `git diff --check` and before/after file preservation checks | **PASS**; Phase 1A and unrelated changes retained |
| Backend/database-mutating E2E, backend checks, deployment, hosted CI, native Safari/Android installation | **SKIPPED / NOT RUN**; outside this frontend brand change |

Exact NixOS equivalents, from `apps/frontend`:

```sh
ABOX_LOADER=/nix/store/lm3pknxi0ipypy3lxh1wmm8wvvavdwrn-glibc-2.42-84/lib/ld-linux-x86-64.so.2
ABOX_BIOME=/mnt/storage/projects/hospitalProject/node_modules/.pnpm/@biomejs+cli-linux-x64@2.2.0/node_modules/@biomejs/cli-linux-x64/biome
"$ABOX_LOADER" "$ABOX_BIOME" check
"$ABOX_LOADER" "$ABOX_BIOME" format
```

The browser probe used installed Playwright 1.56.1 and Nix Chromium 153.0.8010.52
with Chromium's sandbox enabled. It loaded the real production frontend and
intercepted external API requests with synthetic users and empty lists. It did
not log in to or mutate any database. It verifies rendering/navigation/branding,
not authentication or hospital business behavior.

Evidence is local at `/tmp/abox-phase2a/browser-results.json` and
`/tmp/abox-phase2a/screenshots/`. Public/login/register pages were checked at
320/390/1280px; all six role dashboards at 1280px; compact sidebar at 1280px;
mobile header/drawer at 390px; and manually enabled dark branding at 1280px.
Observed layout shift was 0 in all 19 states; no horizontal overflow occurred.
The mobile login Back → Email keyboard sequence and drawer Escape close passed.
The served favicon links, ICO/PNG bytes, Apple link, and manifest were verified in
Chromium; native browser tab chrome and device installation were not captured.

## Remaining references and quality limits

- Historical `docs/ui-ux.md` retains “Pulse UI and UX” as the record of that
  earlier redesign. Historical audit reports and original source asset guidance
  remain unchanged.
- `docker-compose.yml` retains `pulse_db_data` / `pulse_pgadmin_data` volume names;
  `scripts/sync-to-ec2.sh` retains its historical database example; and
  `pgadmin/servers.json` retains the `pulse-local` connection label. Renaming
  databases, volumes, or infrastructure is explicitly outside scope.
- Unreferenced `public/logo.png` retains the previous medical-cross graphic.
  Nothing in the current app or metadata points to it. Other unused framework
  starter assets are also preserved. CSS `animate-pulse` is an animation utility,
  not old branding. No user-facing Pulse text remains in application source.
- The supplied transparent masters have edge speckling/partial-alpha artifacts;
  none was silently retouched. At 16px, the cube silhouette remains recognizable
  but fine cross/gradient detail softens, particularly on dark backgrounds; 32px
  is clearer. A cleaner approved vector/transparent export would improve this.
- Tile files include white fields and padding; the light tile also has a baked
  shadow. They are used only as supplied device compositions. No maskable safe
  area was certified. No inverse wordmark exists, so dark branding uses a white
  backing. Existing manually enabled dark-theme secondary-control contrast issues
  remain outside the brand integration; no theme switch or full dark redesign
  was added.

No commit, push, deployment, cloud operation, or Hallmark audit was performed.
