# Dynamic latest episode hero QA

final result: passed

Source visual truth: /workspace/scratch/65c98fbeeb92/generated_images/exec-d87b8a99-9b7c-405b-8f22-9d2e939d9938.png (1819 x 865).
Implementation screenshot: /workspace/scratch/65c98fbeeb92/hero-latest-desktop.jpg (1363 x 936 CSS viewport, density 1).
Mobile screenshot: /workspace/scratch/65c98fbeeb92/hero-latest-mobile.jpg (390 and 320 CSS px iframe viewports).
Combined comparison: /workspace/scratch/65c98fbeeb92/hero-comparison.jpg.

## Comparison
The supplied mock contains an illustrative sample title and an AI-adjusted hero crop. The implementation intentionally preserves the original production hero, trailer positioning, hero height and artwork. Compare the cartouche's relative width, lower-right placement, typography, controls and sketch language; the different hero crop and live title are expected, not defects. Combined full-view comparison inspected; focused player region inspected in browser screenshots and asset inspection.

- Fonts: existing Barlow Condensed italic 800 title and Inter controls retained. Live title is shorter than sample, full title wraps without truncation.
- Layout: compact lower-right panel, below Ago's face and chest, 24vw (320–440px). On mobile flows below trailer and artwork. No custom changes to original illustration.
- Tokens: production blue #0b57a3, white paper, dark ink. Disabled controls distinguish unavailable seeking until media metadata loads.
- Assets: reusable transparent raster paper artwork; existing supplied hero/logo unchanged; licensed Phosphor SVG icons retain geometry and fixed aspect ratios.
- Content: live latest published recorded episode from Spreaker; no sample title remains. Metadata duration switches to actual streaming duration once loaded (dynamic ad insertion may change duration).

## Comparison history
P2: at 320px, controls exceeded inner paper area; footer too close to torn edge. Fixed: hide redundant play label at <=360px, increase bottom inset, fixed square controls. Rechecked mobile screenshot at 320 and 390; all controls/footer inside paper. Desktop lower padding rechecked after fix.
Remaining P3: paper contour is a fresh reusable asset in the same approved style, not pixel-identical to mock. Existing site header at tablet widths is outside this change.

## Functional evidence
- Live API returned episode 75793653, Hera brucia tutto Governo ladro!, matching existing playlist.
- Real browser playback advanced; actual MP3 metadata loaded; pause, seek and +/- buttons tested.
- Trailer starts independently; starting latest episode changes trailer state to paused.
- Browser console checked: no player/application errors; unrelated browser extension metadata errors observed.
- Seven Node tests passed: latest selection, safe text rendering, refresh replaces idle episode, deferred replacement during listening, API fallback, outage retention, seek boundaries, matching stream and trailer-pause event.
- Syntax and git whitespace checks passed.

## Checklist
- [x] Approved compact sketch placement
- [x] Live automatic refresh on load, every 60 seconds, return-to-tab and reconnection
- [x] No listening interruption on newer publication
- [x] Mobile 320/390 layouts inspected
- [x] Playback and trailer coordination verified
- [x] No credentials, backend or manual CMS update needed
