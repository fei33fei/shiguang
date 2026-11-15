param([string]$DevEcoHome = $env:DEVECO_HOME)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (!$DevEcoHome) { throw '请先安装 DevEco Studio 5+ 与 HarmonyOS 5 SDK，再设置 DEVECO_HOME（DevEco Studio 安装目录）。' }
$nodePath = Join-Path $DevEcoHome 'tools\node\node.exe'
$ohpmPath = Join-Path $DevEcoHome 'tools\ohpm\bin\ohpm.bat'
$hvigorPath = Join-Path $DevEcoHome 'tools\hvigor\bin\hvigorw.js'
foreach ($toolPath in @($nodePath,$ohpmPath,$hvigorPath)) { if (!(Test-Path -LiteralPath $toolPath)) { throw "没有找到工具：$toolPath，请按本机 DevEco 安装路径调整。" } }
& $nodePath (Join-Path $projectRoot 'scripts\prepare-mobile.cjs')
if ($LASTEXITCODE -ne 0) { throw '共享资源准备失败' }
Push-Location $PSScriptRoot
try {
    & $ohpmPath install
    if ($LASTEXITCODE -ne 0) { throw 'ohpm install 失败' }
    & $nodePath $hvigorPath --mode module -p product=default -p module=entry@default -p buildMode=debug assembleHap --no-daemon
    if ($LASTEXITCODE -ne 0) { throw '鸿蒙编译失败，请保留日志；不要把未编译工程视为可安装 HAP。' }
} finally { Pop-Location }
