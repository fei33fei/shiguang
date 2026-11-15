#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/prepare-mobile.cjs
node scripts/generate-ios-project.cjs
if [[ "${1:-simulator}" == simulator ]]; then
  xcodebuild -project ios/Shiguang.xcodeproj -scheme Shiguang -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO build
else
  : "${APPLE_TEAM_ID:?请设置自己的 Apple 开发团队 ID}"
  xcodebuild -project ios/Shiguang.xcodeproj -scheme Shiguang -configuration Release -destination 'generic/platform=iOS' -archivePath ios/build/Shiguang.xcarchive DEVELOPMENT_TEAM="$APPLE_TEAM_ID" -allowProvisioningUpdates archive
fi
