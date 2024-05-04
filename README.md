<!-- Information Retrieval and Indexing System README -->

# Information Retrieval and Indexing System

## Introduction
This system is a simple search and indexing system for text documents stored in TXT, PDF, and Docx/Doc files. With this system, users can search for their desired phrases and find files containing those phrases.

## Installation and Setup
1. **Install Dependencies**: To run this program, you need to install its dependencies first. Use the following command:
 
  ```bash
 npm install fs path mammoth pdf-parse readline


```

2.Run the Program: To execute the program, use the following command in the command line:

```bash
node search.js [path to directory]
```
Usage
After running the program, users can enter search queries and view the results.

Query Format
Search queries can include keywords, logical operators (AND, OR, NOT), and combined expressions. Queries can be separated by spaces, OR, AND, or logical operators.

Examples of Queries
<span style="color:green">Search for a single word: apple</span>
<span style="color:green">Search for two words together: apple AND orange</span>
<span style="color:green">Search for one word or another: apple OR orange</span>
<span style="color:green">Search for a word with a negation operator: apple NOT orange</span>
Program Structure
Files and Directories
The program searches through all text files, PDF files, and Docx/Doc files in a specified directory and its subdirectories.

Key Functions
<span style="color:green">searchInDirectory(directorypath): Searches files and subdirectories in a directory.</span>
<span style="color:green">searchInFile(filepath): Searches text content in a file.</span>
<span style="color:green">evaluateQuery(query): Evaluates search queries and returns matching results.</span>
Results
Search results include a list of files containing the searched phrases.

Errors and Issues
If any issues occur during program execution, an appropriate error message is displayed.

Authors
This program is written by <span style="color:green">[Your Name]</span>.

Version
Current Version: <span style="color:green">1.0.0</span>
