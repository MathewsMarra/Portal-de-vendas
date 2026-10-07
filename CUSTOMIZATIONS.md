# Portal Home-Screen Customizations

This file documents manual customizations made directly to the core portal webapp
(`portal/menu/`), **not** through the `dts#custom` drop-in mechanism. This means
these changes live in files that ship with the base TOTVS Datasul portal product,
so **they will be silently lost/overwritten the next time the base system is
upgraded**. If that happens, reapply the changes described below (or restore the
files from git history / this repo).

Everything here affects the portal home/desktop screen — the screen shown at
`.../portal/menu/#/` (AngularJS state `blank`), rendered by:

- `portal/menu/html/desktop.html`

## Files touched

| File | What |
|---|---|
| `portal/menu/html/desktop.html` | Layout/markup changes described below |
| `portal/menu/assets/img/main-page-banner.jpg` | New banner image asset (added, not part of base product) |

## 1. Sidebar banner image

**What:** Added a banner image below the app list in the left sidebar menu.

**Why:** Marketing/communication banner for the home screen.

**Details / gotchas encountered while building this:**

- The banner is `menu/assets/img/main-page-banner.jpg` — a 293 KB JPEG
  (1280×1600, portrait), converted down from an original 4.3 MB PNG for
  production size. If replacing this image, keep it reasonably small
  (compressed JPEG) since it's loaded on every home-screen visit.
- The image is **portrait** (taller than wide, 4:5 ratio). This mattered a lot
  for layout — see below.
- Originally the banner was placed inside `#menu-content` (the main white
  content area), sized at `width: 100%`. This caused the portrait image to
  balloon to ~1100px+ tall (since the content area is wide), blowing out the
  page and creating a spurious scrollbar/sidebar-shift effect ("adding the
  sidebar" symptom the user first reported).
- It was then moved into the left sidebar (`#menu-lateral`), below the
  applications list (`#menu-structure`), so it visually reads as "part of the
  menu column" rather than the content area.
- Getting it to **fill the exact remaining vertical space** (from the bottom
  of the app list to the bottom of the viewport, with no page scroll) required
  converting `#menu-lateral` into a flex column and giving it an **explicit,
  viewport-anchored height** — see "Root cause of the sizing bug" below. Simply
  using percentage heights (`height: 100%`) was not enough because of a broken
  CSS height chain in the base app's own markup (see next section) — the
  browser has no definite height to compute percentages against, so
  `flex-grow`/`height: 100%` on the image silently fall back to the image's
  own intrinsic (portrait) aspect ratio instead of the available space,
  reproducing the overflow bug.
- The banner is guarded with `ng-if="controller.menuoptions.length"`. The app
  list (`controller.menuoptions`) loads asynchronously from a REST call and
  starts out empty; without this guard, the banner rendered large before the
  app list populated, then visibly shrank once the list loaded a moment
  later. Waiting for `menuoptions.length` means the banner only ever appears
  already-correctly-sized.

**Root cause of the sizing bug (for future reference):** In
`portal/menu/index.jsp`, `#menu-wrapper` is only given `min-height: 100%`
(not `height: 100%`). Everything below it in the DOM
(`#menu-container` → `#menu-contents` → `#menu-view` (`ui-view`) →
`#menu-desktop`) sizes itself via **percentage heights** relative to its
parent. A percentage height against a parent whose own height is `auto`
(which `min-height` does not fix) resolves to indefinite/`auto` per the CSS
spec — so the whole chain is, and always has been, effectively height:auto.
This never caused visible problems before because nothing downstream
actually depended on a definite height (everything used `overflow: hidden`
and just displayed however tall its content was). It only surfaced once the
banner needed real "fill remaining space" behavior (`flex: 1` / `height:
100%` on the image). The fix was to stop relying on that percentage chain and
give `#menu-desktop` an explicit `height: calc(100vh - 40px)` (40px = the
topbar's fixed height, `@topbar-height-sm` in `standard.less`), so
`#menu-lateral` and its flex children have a real, definite height to work
with.

**Final markup** (`portal/menu/html/desktop.html`):

```html
<div class="no-gutter total-height" id="menu-desktop" style="padding-left: 10px; height: calc(100vh - 40px);">

	<!-- MENU LATERAL -->
	<div class="col-lg-3 col-md-3 col-sm-4 col-xs-12" id="menu-lateral"
		 style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">

		<!-- LOGOTIPO -->
		<div class="menu-block hidden-xs" id="menu-logo" style="flex: 0 0 auto;">
			<img src="assets/img/totvs.png" alt="TOTVS"/>
		</div>

		<!-- ESTRUTURA DO MENU -->
		<div class="menu-block disable-select" id="menu-structure"
			 style="height: auto; flex: 0 0 auto;">
			<!-- APLICATIVOS -->
			<div class="menu-title" id="apps" style="cursor: default;">
				<span class="glyphicon glyphicon-menu-hamburger" aria-hidden="true"></span>
				&nbsp;&nbsp;&nbsp;{{'applications'|i18n}}
			</div>

			<div id="menu-applications" ng-init="controller.selectedModule = []" style="height: auto;">
				<div ng-repeat="module in controller.menuoptions">
					<div class="menu-group" id="{{ module.moduleId }}" ng-click="controller.setSelectedModule(module)">
						{{module.moduleName}}
					</div>
				</div>

				<!-- VÍDEOS DE APOIO (item fixo) -->
				<div class="menu-group" style="height: 30px; padding: 5px 0 5px 15px;">
					<a href="https://www.youtube.com/playlist?list=PLKordBJ87GZo"
					   target="_blank"
					   rel="noopener noreferrer"
					   style="color: #28a745; display: block; text-decoration: none;">
						Vídeos de Apoio
					</a>
				</div>
			</div>
		</div>

		<!-- BANNER -->
		<div class="hidden-xs" ng-if="controller.menuoptions.length" style="flex: 1 1 auto; min-height: 0; overflow: hidden; margin-top: 10px;">
			<img src="assets/img/main-page-banner.jpg"
				 alt="Banner"
				 style="display: block; width: 100%; height: 100%; object-fit: cover;"/>
		</div>
	</div>

	<!-- CONTEÚDO DO MENU -->
	<div id="menu-workspace"
		 class="col-lg-9 col-md-9 col-sm-8 col-xs-12"
		 style="padding-bottom: 10px">

		<div id="menu-content"
			 class="menu-block"
			 style="overflow: auto; height: auto;">

			<ul class="list-unstyled"
				style="margin-bottom: 0;">
				<li ng-repeat="ttProgram in controller.selectedModule.ttPrograms">
					<a href="#/{{ttProgram.programId}}">
						<h5>{{ttProgram.programName}}</h5>
					</a>
				</li>
			</ul>
		</div>
	</div>

</div>
```

**To reapply after an upgrade:**
1. Re-add `portal/menu/assets/img/main-page-banner.jpg` (pull it from this git
   repo's history if the file is gone).
2. Replace the contents of `portal/menu/html/desktop.html` with the markup
   above, adjusting only if the base product's `desktop.html` structure itself
   changed in the upgrade (in which case, re-apply the same *concepts*: flex
   column on `#menu-lateral`, explicit `height: calc(100vh - 40px)` on
   `#menu-desktop`, banner as a `flex: 1 1 auto` item with `object-fit: cover`,
   and the `ng-if="controller.menuoptions.length"` guard).

## 2. "Vídeos de Apoio" fixed menu item

**What:** Added a static (non-data-driven) entry at the bottom of the
applications list in the sidebar, labeled "Vídeos de Apoio", that opens
`https://www.youtube.com/playlist?list=PLKordBJ87GZo` in a new browser tab.

**Why:** Quick access to a support/training video playlist, always visible
regardless of what the backend's module list (`controller.menuoptions`)
returns.

**Implementation notes:**
- It's a plain `<a target="_blank" rel="noopener noreferrer">` link, not an
  Angular `ng-click` handler — this was a deliberate choice to avoid
  AngularJS's expression sandbox, which can block direct `window` access in
  `ng-click` expressions depending on the Angular version in use.
- It sits inside `#menu-applications` but **outside** the
  `ng-repeat="module in controller.menuoptions"` loop, so it's always present
  even before/regardless of the REST-driven module list loading.
- Styling: uses the same `menu-group` class as the real module entries so it
  matches their layout/background, only the link text color is overridden to
  green (`#28a745`, Bootstrap's "success" green) to stand out positively. An
  earlier version used a solid red background — this was changed per
  feedback to instead keep the normal background and just color the text
  green.

## Build/deploy notes

There is no `jar`/`zip`/`java` CLI available in the environment these changes
were made in, so the WAR was rebuilt using PowerShell's `Compress-Archive`
(zipping the contents of `portal/`, excluding the local `.claude/` directory)
and renaming the resulting `.zip` to `.war`. This produces a standard zip
archive, which is functionally fine for deployment, though it doesn't have
the JAR-specific manifest-first entry ordering that the `jar` tool produces.
If reapplying these changes as part of a real build pipeline, prefer that
pipeline's normal packaging step over manual zipping.
