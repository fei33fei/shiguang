const test=require('node:test'),assert=require('node:assert/strict');
const {pathKey,protectedLibrary}=require('../desktop/paths.cjs');
test('case-sensitive libraries do not merge photos whose names differ only in case',()=>{
 assert.notEqual(pathKey('/Pictures/A.jpg','darwin'),pathKey('/Pictures/a.jpg','darwin'));
 assert.equal(pathKey('C:/Pictures/A.jpg','win32'),pathKey('C:/Pictures/a.jpg','win32'));
});
test('Apple photo library package is excluded instead of walking its private files',()=>{
 assert.equal(protectedLibrary('Photos Library.photoslibrary'),true);
 assert.equal(protectedLibrary('iPhoto.photolibrary'),true);assert.equal(protectedLibrary('Holiday'),false);
});
