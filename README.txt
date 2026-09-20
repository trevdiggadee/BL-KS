WHY NOTHING CHANGED
===================
Your live style.css on GitHub STILL has:
  url('./menu-background.png')
  background-size: 100% 100%

The MenuBG.JPG file IS on the server, and service-worker was updated,
but style.css was never edited. That is why the old image and old UI remain.

WHAT TO DO (pick one)
=====================

OPTION A – Full menu fix (recommended)
1. Open style.css on GitHub
2. Scroll to the bottom to the block titled:
     BLØKS CINEMATIC MENU ART BACKDROP
3. DELETE that whole block
4. Paste the entire contents of style-END-REPLACE.css at the end of style.css
5. Commit & push
6. Open the site in a PRIVATE/INCOGNITO window

OPTION B – Background only (quick test)
Follow MINIMAL-BG-ONLY.txt (change 2 lines)

GAMEPLAY
========
style-END-REPLACE.css only uses .start-screen ... selectors.
It does not hide or alter the game board / playing screen.
If gameplay is still invisible after this, say so — that is a separate issue
(likely JS or a different CSS rule).
