#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export LD_LIBRARY_PATH=/apdcephfs_zwfy2/share_303204533/yiqun/tmp/flexpart-browser-libs/usr/lib64:/opt/conda/envs/torch-base/lib
export PLAYWRIGHT_BROWSERS_PATH=/apdcephfs_zwfy2/share_303204533/yiqun/tmp/flexpart-browsers
exec node scripts/render-film.mjs "$@"
