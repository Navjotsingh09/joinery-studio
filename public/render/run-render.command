#!/bin/sh
set -eu
cd "$(dirname "$0")"
if command -v blender >/dev/null 2>&1; then
  blender --background --disable-autoexec --python render.py -- scene.glb settings.json final.png
elif [ -x /Applications/Blender.app/Contents/MacOS/Blender ]; then
  /Applications/Blender.app/Contents/MacOS/Blender --background --disable-autoexec --python render.py -- scene.glb settings.json final.png
else
  echo 'Install Blender 4.x in Applications, then run this launcher again.'
  exit 1
fi
