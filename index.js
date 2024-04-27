const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdf = require("pdf-parse");

const directorypath = process.argv[2];
let fileId = 1;
const postings = {};
const fileData = {};

// Function to read file content and search for patterns
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
        // Convert PDF data to string
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
      // Convert text to lowercase and then split into words
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

// Function to search files in a directory
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
// Function to extract words from text and convert them to lowercase
function extractWords(text) {
  // Remove punctuation and convert to lowercase
  const cleanedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  // Split text into words
  const words = cleanedText.split(/\s+/).filter(word => word.length > 0);
  return words;
}
// Function to perform NOT operation on a set
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
// Function to search for condition and return matching files
async function searchForCondition(condition) {
  // Split the condition into individual words or operators
  const tokens = condition.match(/\w+|&&|\|\||!/g);

  // Initialize an empty set to hold the resulting file IDs
  let resultFiles = new Set();

  // Track if NOT operation is applied
  let negateNext = false;

  for (const token of tokens) {
    if (token === "&&") {
      // Skip AND operator, as it's already handled by intersection
      const words = extractWords(condition);

      // Find the files containing each word separately
      const filesContainingEachWord = words.map(word => {
        const lowerCaseWord = word.toLowerCase();
        if (postings[lowerCaseWord]) {
          return new Set(postings[lowerCaseWord]);
        }
        return new Set();
      });
    
      // Find the intersection of files containing each word
      let filesContainingBothWords = new Set();
      for (let i = 0; i < filesContainingEachWord.length; i++) {
        const files = filesContainingEachWord[i];
        if (i === 0) {
          // If it's the first word, add all files
          files.forEach(file => filesContainingBothWords.add(file));
        } else {
          // Otherwise, keep only the files that exist in both sets
          filesContainingBothWords = new Set([...filesContainingBothWords].filter(file => files.has(file)));
        }
      }
    
      // Convert the intersection set to an object with file IDs as keys
      const filesObj = {};
      filesContainingBothWords.forEach(file => {
        filesObj[file] = fileData[file];
      });
    
      return filesObj;






    } else if (token === "||") {
      // Handle OR operator
      // Perform OR operation with the current result and the next condition's result
      const nextCondition = tokens[tokens.indexOf(token) + 1];
      const nextResult = await searchForCondition(nextCondition);
      // Merge the new files with the current result
      for (const file of Object.keys(nextResult)) {
        resultFiles.add(file);
      }
      // Skip the next token, as it has already been processed
      tokens.splice(tokens.indexOf(nextCondition), 1);
    } else if (token === "!") {
      // Handle NOT operator
      // Mark the next token to be negated
      negateNext = true;
    } else {
      // Handle word/token
      // Find the files containing this word
      const lowerCaseWord = token.toLowerCase();
      const files = postings[lowerCaseWord] || new Set();
      // If NOT operation is applied, remove files containing this word from the result
      if (negateNext) {
        for (const file of files) {
          resultFiles.delete(file);
        }
        // Reset the negate flag
        negateNext = false;
      } else {
        // Otherwise, perform OR operation with the current result and the files containing this word
        for (const file of files) {
          resultFiles.add(file);
        }
      }
    }
  }

  // Convert the resulting set to an object with file IDs as keys
  const filesObj = {};
  resultFiles.forEach(file => {
    filesObj[file] = fileData[file];
  });

  return filesObj;
}
// Function to read user input
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
// Function to evaluate the query and return matching files
async function evaluateQuery(query) {
  const conditions = query.split(/\s*(?:(?<=\w)(?=\|\|)|(?<=\|\|)(?=\w)|(?<=\w)(?=&&)|(?<=&&)(?=\w)|(?<=\w)(?=AND)|(?<=AND)(?=\w)|(?<=\w)(?=OR)|(?<=OR)(?=\w)|(?<=\w)(?=\!)|(?<=\!)(?=\w))\s*/i);
  let result = {};

  // Evaluate the first condition
  let firstCondition = conditions.shift();
  result = await searchForCondition(firstCondition);

  // Loop through other conditions
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const operator = condition.toUpperCase();
    const nextCondition = conditions[i + 1];

    // Skip if the next condition is not available
    if (!nextCondition) continue;

    // Switch based on operators
    switch (operator) {
      case 'AND':
      case '&&':
      case 'OR':
      case '||':
      case 'NOT':
      case '!':
        const nextResult = await searchForCondition(nextCondition);
        // Combine or modify the result based on the operator
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
        // Handle comparison between two file IDs
        // This part of the code remains unchanged
        break;
      default:
        break;
    }
  }

  return result;
}
// Function to write data to file
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
// Running the search operation in the directory and then getting user input for queries
searchInDirectory(directorypath)
  .then(writeToFile)
  .then(getUserQuery)
  .catch(err => console.error(`Error: ${err.message}`));