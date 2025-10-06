#!/usr/bin/env node

// Test script to verify area name extraction logic
function extractAreaName(locationString) {
  if (!locationString) return null;
  
  const locationParts = locationString.split(', ');
  if (locationParts.length > 0) {
    return locationParts[0].trim();
  }
  return null;
}

// Test cases
const testCases = [
  'Hyderabad, Telangana, India',
  'Banjara Hills, Hyderabad, Telangana, India',
  'Gachibowli, Hyderabad, Telangana, India',
  'Madhapur, Hyderabad, Telangana, India',
  'Secunderabad, Telangana, India',
  'Warangal, Telangana, India',
  'Karimnagar, Telangana, India',
  'Nizamabad, Telangana, India',
  'Adilabad, Telangana, India',
  'Khammam, Telangana, India',
];

console.log('🧪 Testing Area Name Extraction Logic\n');

testCases.forEach((testCase, index) => {
  const areaName = extractAreaName(testCase);
  console.log(`Test ${index + 1}:`);
  console.log(`  Input: "${testCase}"`);
  console.log(`  Extracted Area: "${areaName}"`);
  console.log('');
});

console.log('✅ Area name extraction test completed!');
console.log('\n📝 This shows how area names will be stored in the city column of your database.'); 