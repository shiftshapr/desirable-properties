#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const STRUCTURED_DIR = path.join(__dirname, '../submissions/structured');
const ALLSTRUCTURED_FILE = path.join(__dirname, '../web-app/data/allstructured.json');
const PRODUCTION_FILE = '/var/www/app.themetalayer.org/public/data/allstructured.json';

function getNextSubmissionNumber() {
  const files = fs.readdirSync(STRUCTURED_DIR);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  const numbers = jsonFiles.map(file => parseInt(file.replace('.json', '')));
  return Math.max(...numbers, 0) + 1;
}

function updateAllStructuredJson(submissionData, submissionNumber) {
  // Read current data
  const data = JSON.parse(fs.readFileSync(ALLSTRUCTURED_FILE, 'utf8'));
  
  // Update meta information
  data.meta.total_submissions = submissionNumber;
  data.meta.generated_at = new Date().toISOString();
  
  // Add new submission
  data.submissions.push(submissionData);
  
  // Write back to file
  fs.writeFileSync(ALLSTRUCTURED_FILE, JSON.stringify(data, null, 2));
  
  // Copy to production
  fs.copyFileSync(ALLSTRUCTURED_FILE, PRODUCTION_FILE);
  
  console.log(`✅ Updated allstructured.json with submission ${submissionNumber}`);
  console.log(`✅ Copied to production: ${PRODUCTION_FILE}`);
}

function saveIndividualSubmission(submissionData, submissionNumber) {
  const filePath = path.join(STRUCTURED_DIR, `${submissionNumber}.json`);
  fs.writeFileSync(filePath, JSON.stringify(submissionData, null, 2));
  console.log(`✅ Saved individual submission: ${filePath}`);
}

function addSubmission(submissionData) {
  try {
    const nextNumber = getNextSubmissionNumber();
    
    // Update metadata
    submissionData._metadata = {
      source_file: `${nextNumber}.json`,
      file_number: nextNumber
    };
    
    // Save individual submission
    saveIndividualSubmission(submissionData, nextNumber);
    
    // Update allstructured.json
    updateAllStructuredJson(submissionData, nextNumber);
    
    console.log(`\n🎉 Successfully added submission ${nextNumber}!`);
    console.log(`📊 Total submissions: ${nextNumber}`);
    console.log(`\n💡 The app will automatically reload the data on the next request.`);
    console.log(`   No server restart needed!`);
    
  } catch (error) {
    console.error('❌ Error adding submission:', error);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node add-submission.js <submission-json-file>');
    console.log('Example: node add-submission.js new-submission.json');
    process.exit(1);
  }
  
  const jsonFile = args[0];
  const submissionData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  
  addSubmission(submissionData);
}

module.exports = { addSubmission, getNextSubmissionNumber }; 