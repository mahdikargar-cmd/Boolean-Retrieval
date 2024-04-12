const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdf = require("pdf-parse");
const { error } = require("console");

const directorypath = process.argv[2];
async function searchInFile(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  try {
    switch (ext) {
      case ".txt":
        const textread = await fs.promises.readFile(filepath, "utf-8");
        return { filepath, text: textread };
      case ".pdf":
        const pdfreaad = await fs.promises.readFile(filepath);
        const pdfresult = await pdf(pdfreaad);
        return { path: filepath, text: pdfresult.text };
      case ".docx":
        const docxResult = await mammoth.extractRawText({ path: filepath });
        return { filepath, text: docxResult.value };
      case ".doc":
        const docResult=await mammoth.extractRawText({path:filepath});
        return {filepath,text:docResult.value};
        default:
          return null;
    }
  } catch (e) {
    console.log(e);
  }
}

async function searchInDirectory(directorypath){
try{
const files=await fs.promises.readdir(directorypath);
for(const file of files ){
const filepath=path.resolve(directorypath,file);
const stats=await fs.promises.stat(filepath);
if(stats.isDirectory()){
await searchInDirectory(filepath);
}else{
  const result=await searchInFile(filepath)
  if(result){
    console.log(`text is: ${result.filepath}`);
    console.log(result.text);
    console.log("=".repeat(50))
  }
}

}




}
catch(e){

console.error(`fail in search : ${error.message}`);
}


}



searchInDirectory(directorypath);