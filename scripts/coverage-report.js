#!/usr/bin/env node

/**
 * Coverage aggregation script for monorepo
 * Collects and displays coverage statistics from all packages
 */

const fs = require('fs');
const path = require('path');

const packages = [
  'packages/cli',
  'packages/relay-server',
  'packages/shared',
  'packages/web-sdk'
];

function loadCoverageSummary(packagePath) {
  const coveragePath = path.join(packagePath, 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coveragePath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(coveragePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to read coverage for ${packagePath}:`, error.message);
    return null;
  }
}

function formatPercentage(value) {
  return `${value.toFixed(2)}%`;
}

function getColorForPercentage(percentage) {
  if (percentage >= 80) return '\x1b[32m'; // Green
  if (percentage >= 60) return '\x1b[33m'; // Yellow
  return '\x1b[31m'; // Red
}

function aggregateCoverage() {
  const results = {};
  const totals = {
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 }
  };

  for (const packagePath of packages) {
    const packageName = path.basename(packagePath);
    const summary = loadCoverageSummary(packagePath);
    
    if (summary && summary.total) {
      results[packageName] = summary.total;
      
      // Aggregate totals
      totals.statements.covered += summary.total.statements.covered;
      totals.statements.total += summary.total.statements.total;
      totals.branches.covered += summary.total.branches.covered;
      totals.branches.total += summary.total.branches.total;
      totals.functions.covered += summary.total.functions.covered;
      totals.functions.total += summary.total.functions.total;
      totals.lines.covered += summary.total.lines.covered;
      totals.lines.total += summary.total.lines.total;
    }
  }

  return { results, totals };
}

function displayCoverageReport() {
  console.log('\n' + '='.repeat(80));
  console.log('                          COVERAGE REPORT SUMMARY');
  console.log('='.repeat(80) + '\n');

  const { results, totals } = aggregateCoverage();
  
  // Display per-package coverage
  console.log('Package Coverage:');
  console.log('-'.repeat(80));
  console.log('Package         | Statements | Branches | Functions | Lines    |');
  console.log('-'.repeat(80));
  
  for (const [packageName, coverage] of Object.entries(results)) {
    const stmtPct = (coverage.statements.pct || 0);
    const branchPct = (coverage.branches.pct || 0);
    const funcPct = (coverage.functions.pct || 0);
    const linePct = (coverage.lines.pct || 0);
    
    const stmtColor = getColorForPercentage(stmtPct);
    const branchColor = getColorForPercentage(branchPct);
    const funcColor = getColorForPercentage(funcPct);
    const lineColor = getColorForPercentage(linePct);
    const reset = '\x1b[0m';
    
    console.log(
      `${packageName.padEnd(15)} | ` +
      `${stmtColor}${formatPercentage(stmtPct).padStart(10)}${reset} | ` +
      `${branchColor}${formatPercentage(branchPct).padStart(8)}${reset} | ` +
      `${funcColor}${formatPercentage(funcPct).padStart(9)}${reset} | ` +
      `${lineColor}${formatPercentage(linePct).padStart(8)}${reset} |`
    );
  }
  
  // Calculate and display overall coverage
  console.log('-'.repeat(80));
  
  const overallStmtPct = totals.statements.total > 0 
    ? (totals.statements.covered / totals.statements.total) * 100 : 0;
  const overallBranchPct = totals.branches.total > 0 
    ? (totals.branches.covered / totals.branches.total) * 100 : 0;
  const overallFuncPct = totals.functions.total > 0 
    ? (totals.functions.covered / totals.functions.total) * 100 : 0;
  const overallLinePct = totals.lines.total > 0 
    ? (totals.lines.covered / totals.lines.total) * 100 : 0;
  
  const overallStmtColor = getColorForPercentage(overallStmtPct);
  const overallBranchColor = getColorForPercentage(overallBranchPct);
  const overallFuncColor = getColorForPercentage(overallFuncPct);
  const overallLineColor = getColorForPercentage(overallLinePct);
  const reset = '\x1b[0m';
  
  console.log(
    `${'OVERALL'.padEnd(15)} | ` +
    `${overallStmtColor}${formatPercentage(overallStmtPct).padStart(10)}${reset} | ` +
    `${overallBranchColor}${formatPercentage(overallBranchPct).padStart(8)}${reset} | ` +
    `${overallFuncColor}${formatPercentage(overallFuncPct).padStart(9)}${reset} | ` +
    `${overallLineColor}${formatPercentage(overallLinePct).padStart(8)}${reset} |`
  );
  
  console.log('='.repeat(80));
  
  // Display threshold status
  console.log('\nThreshold Status (Target: 80% statements, 75% branches, 80% functions, 80% lines):');
  console.log('-'.repeat(80));
  
  const thresholds = {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80
  };
  
  const checkMark = '\x1b[32m✓\x1b[0m';
  const crossMark = '\x1b[31m✗\x1b[0m';
  
  console.log(`Statements: ${overallStmtPct >= thresholds.statements ? checkMark : crossMark} ${formatPercentage(overallStmtPct)} (${totals.statements.covered}/${totals.statements.total})`);
  console.log(`Branches:   ${overallBranchPct >= thresholds.branches ? checkMark : crossMark} ${formatPercentage(overallBranchPct)} (${totals.branches.covered}/${totals.branches.total})`);
  console.log(`Functions:  ${overallFuncPct >= thresholds.functions ? checkMark : crossMark} ${formatPercentage(overallFuncPct)} (${totals.functions.covered}/${totals.functions.total})`);
  console.log(`Lines:      ${overallLinePct >= thresholds.lines ? checkMark : crossMark} ${formatPercentage(overallLinePct)} (${totals.lines.covered}/${totals.lines.total})`);
  
  console.log('='.repeat(80) + '\n');
  
  // Check if thresholds are met
  const allThresholdsMet = 
    overallStmtPct >= thresholds.statements &&
    overallBranchPct >= thresholds.branches &&
    overallFuncPct >= thresholds.functions &&
    overallLinePct >= thresholds.lines;
  
  if (!allThresholdsMet) {
    console.log('\x1b[31mWarning: Coverage thresholds not met!\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32mAll coverage thresholds met! ✓\x1b[0m\n');
  }
}

// Run the report
displayCoverageReport();