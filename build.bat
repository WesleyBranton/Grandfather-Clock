@echo off

:: Clean old build files
echo Starting build...
echo | set /p output="Cleaning old builds... "
rmdir build /s/q
echo Done!

:: Create directories
echo | set /p output="Creating directories... "
mkdir build
mkdir build\firefox
mkdir build\chromium
echo Done!

:: Add warnings
echo. > "build\DO NOT EDIT THESE FILES DIRECTLY"
echo. > "build\EDIT THE FILES IN THE SRC DIRECTORY AND RUN BUILD AGAIN"

:: Build Firefox
echo | set /p output="Creating Firefox files... "
xcopy src build\firefox /s/e/y/q > nul
del build\firefox\manifest-chromium.json /f/q
del build\firefox\audioPlayer-chromium.js /f/q
rename build\firefox\manifest-firefox.json manifest.json
rename build\firefox\audioPlayer-firefox.js audioPlayer.js
rmdir build\firefox\offscreen /s/q
echo Done!

:: Build Chromium
echo | set /p output="Creating Chromium files... "
xcopy src build\chromium /s/e/y/q > nul
del build\chromium\manifest-firefox.json /f/q
del build\chromium\lib\idb-file-storage.js /f/q
del build\chromium\lib\idb-file-storage.js.map /f/q
del build\chromium\audioPlayer-firefox.js /f/q
del build\chromium\icons\icon-animated.gif /f/q
rename build\chromium\manifest-chromium.json manifest.json
rename build\chromium\audioPlayer-chromium.js audioPlayer.js
echo Done!
echo Build complete!