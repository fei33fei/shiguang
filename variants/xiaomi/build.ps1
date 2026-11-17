$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$variantRoot = $PSScriptRoot
$nativeRoot = Join-Path $variantRoot "android"
Set-Location $projectRoot
$jdkPath = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { 'C:\Program Files\JetBrains\PyCharm 2025.2.1.1\jbr' }
$env:JAVA_HOME = $jdkPath
$platformJar = Join-Path $projectRoot '.tools\platform\android-35\android.jar'
$buildTools = Join-Path $projectRoot '.tools\build-tools\android-15'
$outputPath = Join-Path $nativeRoot 'build'
function Run-Checked([string]$Exe, [string[]]$Arguments) { & $Exe @Arguments; if ($LASTEXITCODE -ne 0) { throw "Build failed: $Exe ($LASTEXITCODE)" } }
New-Item -ItemType Directory -Force "$outputPath\classes","$outputPath\dex","$outputPath\assets\web","$projectRoot\android\signing","$projectRoot\release" | Out-Null
Copy-Item "$variantRoot\web\*" "$outputPath\assets\web" -Force
$sources = @(Get-ChildItem "$nativeRoot\src" -Recurse -Filter '*.java' | ForEach-Object FullName)
Run-Checked "$jdkPath\bin\javac.exe" (@('--release','8','-encoding','UTF-8','-classpath',$platformJar,'-d',"$outputPath\classes") + $sources)
$classes = @(Get-ChildItem "$outputPath\classes" -Recurse -Filter '*.class' | ForEach-Object FullName)
Run-Checked "$buildTools\d8.bat" (@('--lib',$platformJar,'--min-api','30','--output',"$outputPath\dex") + $classes)
Run-Checked "$buildTools\aapt.exe" @('package','-f','-M',"$nativeRoot\AndroidManifest.xml",'-S',"$nativeRoot\res",'-A',"$outputPath\assets",'-I',$platformJar,'-F',"$outputPath\unsigned.apk")
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$zipFile = [System.IO.Compression.ZipFile]::Open("$outputPath\unsigned.apk", [System.IO.Compression.ZipArchiveMode]::Update)
try { [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipFile,"$outputPath\dex\classes.dex",'classes.dex') | Out-Null } finally { $zipFile.Dispose() }
Run-Checked "$buildTools\zipalign.exe" @('-f','-p','4',"$outputPath\unsigned.apk","$outputPath\aligned.apk")
$keyPath = "$projectRoot\android\signing\shiguang.jks"
$passwordPath = "$projectRoot\android\signing\password.txt"
if (!(Test-Path $keyPath)) {
    $keyPassword = [Guid]::NewGuid().ToString('N')
    [System.IO.File]::WriteAllText($passwordPath,$keyPassword)
    Run-Checked "$jdkPath\bin\keytool.exe" @('-genkeypair','-keystore',$keyPath,'-storepass:file',$passwordPath,'-keypass:file',$passwordPath,'-alias','shiguang','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Shiguang Local Album')
}
$apk = "$projectRoot\release\Shiguang-Android-0.3.6-Xiaomi-Civi4.apk"
Run-Checked "$buildTools\apksigner.bat" @('sign','--ks',$keyPath,'--ks-key-alias','shiguang','--ks-pass',"file:$passwordPath",'--out',$apk,"$outputPath\aligned.apk")
Run-Checked "$buildTools\apksigner.bat" @('verify','--verbose',$apk)
Write-Output "APK ready: $apk"
