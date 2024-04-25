const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdf = require("pdf-parse");

const directorypath = process.argv[2];

async function searchInFile(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  try {
    let result = null;
    switch (ext) {
      case ".txt":
        result = await fs.promises.readFile(filepath, "utf-8");
        break;
      case ".pdf":
        const pdfread = await fs.promises.readFile(filepath);
        result = await pdf(pdfread);
        break;
      case ".docx":
      case ".doc":
        const docxResult = await mammoth.extractRawText({ path: filepath });
        result = docxResult.value;
        break;
      default:
        break;
    }
    return result ? { filepath, text: result.text || result } : null;
  } catch (e) {
    console.error(`Error reading file ${filepath}: ${e.message}`);
    return null;
  }
}

async function searchInDirectory(directorypath) {
  try {
    const files = await fs.promises.readdir(directorypath);
    for (const file of files) {
      const filepath = path.join(directorypath, file);
      const stats = await fs.promises.stat(filepath);
      if (stats.isDirectory()) {
        await searchInDirectory(filepath);
      } else {
        const result = await searchInFile(filepath);
        if (result) {
          const appendData = `${result.filepath}\n${result.text}\n${"=".repeat(50)}\n`;
          fs.appendFile('./Data.txt', appendData, err => {
            if (err) {
              console.error(`Error appending data to Data.txt: ${err.message}`);
            }
          });
        }
      }
    }
  } catch (e) {
    console.error(`Fail in search: ${e.message}`);
  }
}

searchInDirectory(directorypath);
