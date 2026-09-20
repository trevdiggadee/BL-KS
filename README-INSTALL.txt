BLØKS – Level Music Update
==========================

Files included
--------------
• audio.js            → full replacement (uses Level-1.mp3 … Level-5.mp3)
• service-worker.js   → updated (caches the 5 MP3s + bumped to v12)
• game.js-PATCH.txt   → the exact lines you need to change in game.js

Installation steps
------------------
1. Put your five MP3 files in the ROOT of the repo (same folder as index.html):
     Level-1.mp3
     Level-2.mp3
     Level-3.mp3
     Level-4.mp3
     Level-5.mp3

2. Replace the existing audio.js with the one in this zip.

3. Replace the existing service-worker.js with the one in this zip.

4. Edit game.js:
   - Open game.js
   - Find the block that looks like this (around the level-up handling):

       if (leveledUp) {
         Audio_.sfx.levelUp();
         Effects.toast(`LEVEL ${level}`, 'levelup');
       }

   - Change it to:

       if (leveledUp) {
         Audio_.sfx.levelUp();
         Effects.toast(`LEVEL ${level}`, 'levelup');
         Audio_.setMusicLevel(level);   // ← ADD THIS LINE
       }

   - (Optional but recommended) Also update the two places that start music
     so they pass the current level:

       // in beginPlaying()
       if (saveData.settings.musicOn) Audio_.startMusic(level);

       // in togglePause() when resuming
       if (saveData.settings.musicOn) Audio_.startMusic(level);

5. Commit and push everything (including the five .mp3 files).

After the next deploy the game will automatically play the correct track
for the current level and switch when you level up.
