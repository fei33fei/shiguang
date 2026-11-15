const path=require('node:path');
const pathKey=(value,platform=process.platform)=>platform==='win32'?path.resolve(value).toLowerCase():path.resolve(value);
const protectedLibrary=name=>/\.(photoslibrary|photolibrary)$/i.test(name);
module.exports={pathKey,protectedLibrary};
