#!/bin/bash
set -e

echo "🔨 Manual build starting..."

# Kill any hanging processes
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "esbuild" 2>/dev/null || true

# Clean dist
rm -rf dist
mkdir -p dist

# Build with timeout using expect/timeout alternative
echo "📦 Running vite build..."
(npx vite build 2>&1 & BUILD_PID=$!; sleep 30; kill -9 $BUILD_PID 2>/dev/null) &
WRAPPER_PID=$!

# Wait for build
sleep 35

# Check if _worker.js exists
if [ ! -f "dist/_worker.js" ]; then
    echo "❌ Build failed - _worker.js not found"
    exit 1
fi

# Run post-build
bash build.sh

echo "✅ Manual build complete!"
ls -lh dist/
