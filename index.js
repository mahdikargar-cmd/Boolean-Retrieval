const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdf = require("pdf-parse");

const directorypath = process.argv[2];
let fileId = 1;
const postings = {};
const fileData = {};

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
        const pdfData = await pdf(pdfread);
        result = pdfData.text;
        break;
      case ".docx":
      case ".doc":
        const docxResult = await mammoth.extractRawText({ path: filepath });
        result = docxResult.value;
        break;
      default:
        break;
    }
    if (result) {
      const words = extractWords(result);
      const pathData = { [fileId]: filepath };
      fileData[fileId] = pathData;
      for (const word of words) {
        const lowerCaseWord = word.toLowerCase();
        if (!postings[lowerCaseWord]) {
          postings[lowerCaseWord] = [];
        }
        if (!postings[lowerCaseWord].includes(fileId)) {
          postings[lowerCaseWord].push(fileId);
        }
      }
      fileId++;
      return pathData;
    }
    return null;
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
        await searchInFile(filepath);
      }
    }
  } catch (e) {
    console.error(`Fail in search: ${e.message}`);
  }
}
function extractWords(text) {
  const cleanedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  const words = cleanedText.split(/\s+/).filter(word => word.length > 0);
  return words;
}
function not(arr, words) {
  return Object.keys(arr).reduce((result, key) => {
    let matched = true;
    for (const word of words) {
      if (arr[key].includes(word)) {
        matched = false;
        break;
      }
    }
    if (matched) {
      result[key] = arr[key];
    }
    return result;
  }, {});
}
async function searchForCondition(condition) {
  const tokens = condition.match(/\w+|&&|\|\||!/g);

  let resultFiles = new Set();

  let negateNext = false;

  for (const token of tokens) {
    if (token === "&&" || token==="AND") {
      const words = extractWords(condition);
      const filesContainingEachWord = words.map(word => {
        const lowerCaseWord = word.toLowerCase();
        if (postings[lowerCaseWord]) {
          return new Set(postings[lowerCaseWord]);
        }
        return new Set();
      });
          let filesContainingBothWords = new Set();
      for (let i = 0; i < filesContainingEachWord.length; i++) {
        const files = filesContainingEachWord[i];
        if (i === 0) {
          files.forEach(file => filesContainingBothWords.add(file));
        } else {
          filesContainingBothWords = new Set([...filesContainingBothWords].filter(file => files.has(file)));
        }
      }
          const filesObj = {};
      filesContainingBothWords.forEach(file => {
        filesObj[file] = fileData[file];
      });
    
      return filesObj;


    } else if (token === "||" || token==="OR") {
      const nextCondition = tokens[tokens.indexOf(token) + 1];
      const nextResult = await searchForCondition(nextCondition);
      for (const file of Object.keys(nextResult)) {
        resultFiles.add(file);
      }
      tokens.splice(tokens.indexOf(nextCondition), 1);
    } else if (token === "!" || token === "NOT") {
      negateNext = true;
    } else {
      const lowerCaseWord = token.toLowerCase();
      const files = postings[lowerCaseWord] || new Set();
      if (negateNext) {
        for (const file of files) {
          resultFiles.delete(file);
        }
        negateNext = false;
      } else {
        for (const file of files) {
          resultFiles.add(file);
        }
      }
    }
  }
  const filesObj = {};
  resultFiles.forEach(file => {
    filesObj[file] = fileData[file];
  });

  return filesObj;
}
async function getUserQuery() {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question("Enter your query: ", async query => {
    readline.close();
    console.log("User query:", query);
    const result = await evaluateQuery(query);
    if (Object.keys(result).length === 0) {
      console.log("No files found matching the query.");
    } else {
      console.log("Matching files:", result);
    }
  });
}
async function evaluateQuery(query) {
  const conditions = query.split(/\s*(?:(?<=\w)(?=\|\|)|(?<=\|\|)(?=\w)|(?<=\w)(?=&&)|(?<=&&)(?=\w)|(?<=\w)(?=AND)|(?<=AND)(?=\w)|(?<=\w)(?=OR)|(?<=OR)(?=\w)|(?<=\w)(?=\!)|(?<=\!)(?=\w))\s*/i);
  let result = {};
  let firstCondition = conditions.shift();
  result = await searchForCondition(firstCondition);
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const operator = condition.toUpperCase();
    const nextCondition = conditions[i + 1];
    if (!nextCondition) continue;
    switch (operator) {
      case 'AND':
      case '&&':
      case 'OR':
      case '||':
      case 'NOT':
      case '!':
        const nextResult = await searchForCondition(nextCondition);
        if (operator === 'AND' || operator === '&&') {
          result = { ...result, ...nextResult };
        } else if (operator === 'OR' || operator === '||') {
          result = { ...result, ...nextResult };
        } else if (operator === 'NOT' || operator === '!') {
          for (const fileId in nextResult) {
            delete result[fileId];
          }
        }
        break;
      case /^\d+(-\d+)?$/.test(condition):
        break;
      default:
        break;
    }
  }

  return result;
}
async function writeToFile() {
  try {
    const jsonData = {
      filepath: fileData,
      "posting list": postings
    };
    await fs.promises.writeFile('./Data.txt', JSON.stringify(jsonData, null, 2));
    console.log('Data has been successfully written to Data.txt');
  } catch (err) {
    console.error(`Error writing data to Data.txt: ${err.message}`);
  }
}
searchInDirectory(directorypath)
  .then(writeToFile)
  .then(getUserQuery)
  .catch(err => console.error(`Error: ${err.message}`));