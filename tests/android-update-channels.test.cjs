const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
function selector(variant){const src=fs.readFileSync(`variants/${variant}/android/src/local/shiguang/album/AppUpdater.java`,'utf8');const literal=src.match(/Pattern\.compile\("((?:\\.|[^"\\])*)"\)/)[1];return new RegExp('^'+JSON.parse('"'+literal+'"')+'$');}
test('Android release channels select their own APK assets, never the other branch',()=>{
 const generic=selector('android-universal'),xiaomi=selector('xiaomi');
 assert.ok(generic.test('Shiguang-Android-0.3.6-universal.apk'));assert.ok(!generic.test('Shiguang-Android-0.3.6-Xiaomi-Civi4.apk'));
 assert.ok(xiaomi.test('Shiguang-Android-0.3.6-Xiaomi-Civi4.apk'));assert.ok(!xiaomi.test('Shiguang-Android-0.3.6-universal.apk'));
 for(const pattern of [generic,xiaomi])assert.ok(!pattern.test('Shiguang-macOS-0.3.6-arm64-unsigned.zip'));
});
