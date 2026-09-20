BLØKS – Menu UI Fix
===================

What this fixes
---------------
1. Background image no longer stretched (uses background-size: cover)
2. Proper positioning on mobile / different aspect ratios
3. Big “BLØKS” title at the top is removed
4. Theme / Block Style / Mode buttons moved to the bottom and
   combined with Stats / Achievements / Settings into one clean panel

Files
-----
• menu-ui-fix.css     → append to the END of style.css
• index-HTML-CHANGE.txt → small optional HTML tweak (recommended)

Install steps
-------------
1. Open style.css and paste the entire contents of menu-ui-fix.css
   at the very bottom of the file.

2. (Recommended) Make the tiny HTML change described in
   index-HTML-CHANGE.txt so the bottom controls sit inside a single
   wrapper. The CSS still works without it, but the DOM is cleaner
   with the wrapper.

3. Commit & push. Hard-refresh the page (or bump the service-worker
   cache version) to see the changes.

That’s it – no JavaScript changes required.
