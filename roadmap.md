# Tasks

- [x] Add accurate ESV labels and question marks to note conversion.
- [x] Verify abbreviated references and repeated conversion remain safe.
- [x] Add one-click header Go Live with Reader preparation and audience window.
- [x] Verify live startup, late audience joins, and fullscreen fallback.
- [x] Add saved Quick Live settings with secondary-screen and fullscreen defaults.
- [x] Verify screen selection rules, saved settings, permission fallback, and authenticated live startup. Physical second-screen placement and automatic fullscreen require a supported browser with screen access; unavailable in the single-screen test environment.
- [x] Prevent secondary-screen launches from falling back silently to the main display; verified setup gating on the real note, fresh-window target coordinates with simulated displays, and eight passing tests. Physical second-screen placement remains unavailable in the test environment.
- [x] Make Next Verse follow clicked passages with a nearby action and persistent consecutive insertion in Edit/Reader/Live.
- [x] Verify real ESV Matthew 7:12 → 7:13 → 7:14 in Edit and → 7:15 → 7:16 in Reader, unchanged scroll position, unrelated-click sequence persistence, and saved reload on an authenticated temporary note; remove the test note afterward. Four navigation tests pass and latest preview build is clean.