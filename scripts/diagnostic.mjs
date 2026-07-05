#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const diagnostics = {
  errors: [],
  warnings: [],
  info: [],
  passed: [],
};

function log(type, message) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'error':
      console.log(`${COLORS.red}${prefix} ❌ ERROR${COLORS.reset}: ${message}`);
      diagnostics.errors.push(message);
      break;
    case 'warning':
      console.log(`${COLORS.yellow}${prefix} ⚠️  WARNING${COLORS.reset}: ${message}`);
      diagnostics.warnings.push(message);
      break;
    case 'info':
      console.log(`${COLORS.blue}${prefix} ℹ️  INFO${COLORS.reset}: ${message}`);
      diagnostics.info.push(message);
      break;
    case 'pass':
      console.log(`${COLORS.green}${prefix} ✅ PASS${COLORS.reset}: ${message}`);
      diagnostics.passed.push(message);
      break;
    case 'section':
      console.log(`\n${COLORS.cyan}${'='.repeat(80)}${COLORS.reset}`);
      console.log(`${COLORS.cyan}${message}${COLORS.reset}`);
      console.log(`${COLORS.cyan}${'='.repeat(80)}${COLORS.reset}\n`);
      break;
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log('pass', `${description} exists at ${filePath}`);
    return true;
  } else {
    log('error', `${description} NOT FOUND at ${filePath}`);
    return false;
  }
}

function checkEnvVar(varName) {
  const value = process.env[varName];
  if (value) {
    log('pass', `Environment variable ${varName} is set`);
    return true;
  } else {
    log('error', `Environment variable ${varName} is NOT set`);
    return false;
  }
}

function checkLogs(logFile, description, errorPatterns) {
  const logPath = path.join(projectRoot, '.manus-logs', logFile);
  
  if (!fs.existsSync(logPath)) {
    log('warning', `${description} log file not found at ${logPath}`);
    return;
  }

  try {
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n');
    
    let errorCount = 0;
    let warningCount = 0;
    
    for (const pattern of errorPatterns) {
      const matches = content.match(new RegExp(pattern, 'gi'));
      if (matches) {
        errorCount += matches.length;
      }
    }

    // Check for ERROR level logs
    const errorLogs = lines.filter(line => line.includes('"level":"ERROR') || line.includes('ERROR'));
    errorCount += errorLogs.length;

    // Check for WARNING level logs
    const warningLogs = lines.filter(line => line.includes('"level":"WARN') || line.includes('WARNING'));
    warningCount += warningLogs.length;

    if (errorCount > 0) {
      log('error', `${description}: Found ${errorCount} error(s) in logs`);
      // Show last few errors
      const recentErrors = errorLogs.slice(-3);
      recentErrors.forEach(err => {
        if (err.length < 200) {
          log('info', `  └─ ${err.substring(0, 150)}`);
        }
      });
    } else {
      log('pass', `${description}: No critical errors found`);
    }

    if (warningCount > 0) {
      log('warning', `${description}: Found ${warningCount} warning(s) in logs`);
    }

  } catch (error) {
    log('error', `Failed to read ${description} log: ${error.message}`);
  }
}

function checkProjectConfig() {
  const configPath = path.join(projectRoot, '.project-config.json');
  
  if (!fs.existsSync(configPath)) {
    log('error', 'Project config file not found');
    return;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    const requiredFields = [
      'VITE_APP_ID',
      'DATABASE_URL',
      'OWNER_OPEN_ID',
      'VITE_APP_TITLE',
    ];

    for (const field of requiredFields) {
      if (config[field]) {
        log('pass', `Project config has ${field}`);
      } else {
        log('error', `Project config missing ${field}`);
      }
    }

  } catch (error) {
    log('error', `Failed to parse project config: ${error.message}`);
  }
}

function checkPackageJson() {
  const packagePath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    log('error', 'package.json not found');
    return;
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    
    const requiredScripts = ['dev', 'build', 'start', 'test'];
    
    for (const script of requiredScripts) {
      if (pkg.scripts && pkg.scripts[script]) {
        log('pass', `package.json has "${script}" script`);
      } else {
        log('error', `package.json missing "${script}" script`);
      }
    }

    const requiredDeps = [
      'express',
      '@trpc/server',
      'react',
      'vite',
      'drizzle-orm',
    ];

    for (const dep of requiredDeps) {
      if (pkg.dependencies && pkg.dependencies[dep]) {
        log('pass', `Dependency ${dep} is installed`);
      } else {
        log('error', `Dependency ${dep} is NOT installed`);
      }
    }

  } catch (error) {
    log('error', `Failed to parse package.json: ${error.message}`);
  }
}

function checkDatabaseConnection() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    log('error', 'DATABASE_URL environment variable not set');
    return;
  }

  try {
    // Basic validation of connection string format
    if (dbUrl.includes('mysql://') || dbUrl.includes('postgres://')) {
      log('pass', 'DATABASE_URL has valid format');
    } else {
      log('warning', 'DATABASE_URL format might be invalid');
    }

    // Check if it's a local or remote database
    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
      log('info', 'Using local database');
    } else {
      log('info', 'Using remote database');
    }

  } catch (error) {
    log('error', `Failed to validate database connection: ${error.message}`);
  }
}

function checkOAuthConfig() {
  const appId = process.env.VITE_APP_ID;
  const oauthUrl = process.env.OAUTH_SERVER_URL;
  
  if (!appId) {
    log('error', 'VITE_APP_ID not configured');
  } else {
    log('pass', `VITE_APP_ID configured: ${appId}`);
  }

  if (!oauthUrl) {
    log('error', 'OAUTH_SERVER_URL not configured');
  } else {
    log('pass', `OAUTH_SERVER_URL configured: ${oauthUrl}`);
  }
}

function checkBrowserLogs() {
  const logPath = path.join(projectRoot, '.manus-logs', 'browserConsole.log');
  
  if (!fs.existsSync(logPath)) {
    log('warning', 'Browser console logs not available');
    return;
  }

  try {
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n');

    // Check for specific error patterns
    const errorPatterns = [
      'ERR_',
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'NetworkError',
      'CORS',
      'blocked',
      'failed',
      'unauthorized',
      '403',
      '401',
      '404',
    ];

    let foundErrors = [];
    
    for (const line of lines) {
      for (const pattern of errorPatterns) {
        if (line.toLowerCase().includes(pattern.toLowerCase())) {
          foundErrors.push(line);
          break;
        }
      }
    }

    if (foundErrors.length > 0) {
      log('error', `Browser console has ${foundErrors.length} error(s)`);
      foundErrors.slice(-5).forEach(err => {
        if (err.length < 200) {
          log('info', `  └─ ${err.substring(0, 150)}`);
        }
      });
    } else {
      log('pass', 'No critical errors in browser console');
    }

  } catch (error) {
    log('error', `Failed to check browser logs: ${error.message}`);
  }
}

function checkNetworkLogs() {
  const logPath = path.join(projectRoot, '.manus-logs', 'networkRequests.log');
  
  if (!fs.existsSync(logPath)) {
    log('warning', 'Network request logs not available');
    return;
  }

  try {
    const content = fs.readFileSync(logPath, 'utf-8');
    
    // Count failed requests
    const failedRequests = content.match(/"status":(40[0-9]|50[0-9])/g) || [];
    
    if (failedRequests.length > 0) {
      log('error', `Network has ${failedRequests.length} failed request(s)`);
      
      // Group by status code
      const statusCodes = {};
      failedRequests.forEach(req => {
        const status = req.match(/\d{3}/)[0];
        statusCodes[status] = (statusCodes[status] || 0) + 1;
      });

      for (const [status, count] of Object.entries(statusCodes)) {
        log('info', `  └─ ${count} request(s) with status ${status}`);
      }
    } else {
      log('pass', 'No failed network requests');
    }

  } catch (error) {
    log('error', `Failed to check network logs: ${error.message}`);
  }
}

// Run all diagnostics
async function runDiagnostics() {
  log('section', 'ENTERPRISE DASHBOARD DIAGNOSTIC REPORT');

  log('section', '1. PROJECT STRUCTURE');
  checkFile(path.join(projectRoot, 'package.json'), 'package.json');
  checkFile(path.join(projectRoot, 'vite.config.ts'), 'vite.config.ts');
  checkFile(path.join(projectRoot, 'server/_core/index.ts'), 'Server entry point');
  checkFile(path.join(projectRoot, 'client/src/App.tsx'), 'Client entry point');
  checkFile(path.join(projectRoot, 'drizzle/schema.ts'), 'Database schema');

  log('section', '2. ENVIRONMENT VARIABLES');
  checkEnvVar('VITE_APP_ID');
  checkEnvVar('DATABASE_URL');
  checkEnvVar('JWT_SECRET');
  checkEnvVar('OAUTH_SERVER_URL');
  checkEnvVar('OWNER_OPEN_ID');
  checkEnvVar('NODE_ENV');

  log('section', '3. PROJECT CONFIGURATION');
  checkProjectConfig();

  log('section', '4. PACKAGE.JSON VALIDATION');
  checkPackageJson();

  log('section', '5. DATABASE CONNECTION');
  checkDatabaseConnection();

  log('section', '6. OAUTH CONFIGURATION');
  checkOAuthConfig();

  log('section', '7. SERVER LOGS');
  checkLogs('devserver.log', 'Dev Server', [
    'error',
    'failed',
    'ECONNREFUSED',
    'ENOTFOUND',
    'Cannot find module',
  ]);

  log('section', '8. BROWSER CONSOLE LOGS');
  checkBrowserLogs();

  log('section', '9. NETWORK REQUEST LOGS');
  checkNetworkLogs();

  log('section', 'DIAGNOSTIC SUMMARY');
  console.log(`\n${COLORS.green}✅ Passed: ${diagnostics.passed.length}${COLORS.reset}`);
  console.log(`${COLORS.yellow}⚠️  Warnings: ${diagnostics.warnings.length}${COLORS.reset}`);
  console.log(`${COLORS.red}❌ Errors: ${diagnostics.errors.length}${COLORS.reset}\n`);

  if (diagnostics.errors.length > 0) {
    console.log(`${COLORS.red}ERRORS TO FIX:${COLORS.reset}`);
    diagnostics.errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err}`);
    });
  }

  if (diagnostics.warnings.length > 0) {
    console.log(`\n${COLORS.yellow}WARNINGS:${COLORS.reset}`);
    diagnostics.warnings.forEach((warn, i) => {
      console.log(`${i + 1}. ${warn}`);
    });
  }

  // Write report to file
  const reportPath = path.join(projectRoot, 'DIAGNOSTIC_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
  log('info', `Full diagnostic report saved to ${reportPath}`);

  process.exit(diagnostics.errors.length > 0 ? 1 : 0);
}

runDiagnostics().catch(error => {
  console.error('Diagnostic failed:', error);
  process.exit(1);
});
