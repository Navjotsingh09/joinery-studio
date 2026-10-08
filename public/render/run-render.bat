@echo off
setlocal
cd /d "%~dp0"
set "JOINERY_BLENDER="
for /f "delims=" %%B in ('where blender 2^>nul') do set "JOINERY_BLENDER=%%B"
if not defined JOINERY_BLENDER for /d %%D in ("C:\Program Files\Blender Foundation\Blender*") do if exist "%%D\blender.exe" set "JOINERY_BLENDER=%%D\blender.exe"
if not defined JOINERY_BLENDER (
  echo Install Blender 4.x, then run this launcher again.
  pause
  exit /b 1
)
"%JOINERY_BLENDER%" --background --disable-autoexec --python render.py -- scene.glb settings.json final.png
if errorlevel 1 (echo Rendering failed. Review the message above.) else (echo Finished: final.png)
pause
