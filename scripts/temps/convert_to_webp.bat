@echo off
setlocal

set OUTPUT_DIR=%~dp0temps

if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%"
    echo Created output folder: %OUTPUT_DIR%
)

echo Converting .jpg files to .webp (1024px wide, quality 50)...
magick mogrify -format webp -quality 50 -resize 1024x "%~dp0*.jpg"

if %errorlevel% neq 0 (
    echo ERROR: Conversion failed. Is ImageMagick installed?
    pause
    exit /b 1
)

echo Moving .webp files to %OUTPUT_DIR%...
move "%~dp0*.webp" "%OUTPUT_DIR%\"

echo Done! Check: %OUTPUT_DIR%
pause
