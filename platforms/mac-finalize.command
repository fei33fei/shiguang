#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
app_path="$PWD/Shiguang.app"
if [[ ! -d "$app_path" ]]; then echo '请先将 ZIP 完整解压，脚本必须与 Shiguang.app 放在同一文件夹。'; exit 1; fi
echo '为你下载的拾光相册应用做本机 ad-hoc 签名；不修改系统安全设置。'
/usr/bin/codesign --force --deep --sign - "$app_path"
/usr/bin/codesign --verify --deep --strict --verbose=2 "$app_path"
echo '本机签名完成。可以将 Shiguang.app 拖入应用程序。此包尚未经过开发者签名、公证或 Mac 真机验证。'
read -r -p '按回车退出…'
