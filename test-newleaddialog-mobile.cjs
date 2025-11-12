/**
 * Mobile-First Testing Script for NewLeadDialog Component
 * Tests at 375px, 768px, 1440px viewports with comprehensive validation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const APP_URL = 'http://localhost:8081';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-results', 'newleaddialog-mobile-test');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 812, priority: 'PRIMARY' },
  { name: 'iPad', width: 768, height: 1024, priority: 'SECONDARY' },
  { name: 'Desktop', width: 1440, height: 900, priority: 'TERTIARY' }
];

// Test results
const results = {
  viewports: {},
  touchTargets: {},
  layout: {},
  typography: {},
  navigation: {},
  userFlows: {},
  performance: {},
  issues: []
};

async function measureElement(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const styles = window.getComputedStyle(el);
    return {
      width: rect.width,
      height: rect.height,
      fontSize: styles.fontSize,
      visible: rect.width > 0 && rect.height > 0
    };
  }, selector);
}

async function checkHorizontalScroll(page) {
  return await page.evaluate(() => {
    return {
      hasScroll: document.documentElement.scrollWidth > window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    };
  });
}

async function getAllButtonMeasurements(page) {
  return await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.map(btn => {
      const rect = btn.getBoundingClientRect();
      const text = btn.textContent.trim().substring(0, 30);
      return {
        text,
        width: rect.width,
        height: rect.height,
        meets48px: rect.height >= 48 && rect.width >= 48
      };
    });
  });
}

async function testViewport(browser, viewport) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height}) - ${viewport.priority}`);
  console.log('='.repeat(60));

  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height });

  const viewportResults = {
    name: viewport.name,
    dimensions: `${viewport.width}x${viewport.height}`,
    priority: viewport.priority,
    screenshots: [],
    tests: {}
  };

  try {
    // Navigate to application
    console.log('1. Navigating to application...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${viewport.name.replace(' ', '-')}-01-landing.png`),
      fullPage: false
    });
    viewportResults.screenshots.push('01-landing.png');

    // Check if auth required
    const needsAuth = await page.evaluate(() => {
      return window.location.pathname.includes('/login') ||
             window.location.pathname.includes('/auth');
    });

    if (needsAuth) {
      console.log('   Auth required, attempting auto-login...');
      // Try to fill login form if present
      const hasEmailInput = await page.$('input[type="email"]');
      if (hasEmailInput) {
        await page.type('input[type="email"]', 'test@example.com');
        await page.type('input[type="password"]', 'password123');
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
        }
      }
    }

    // Navigate to Dashboard
    console.log('2. Navigating to Dashboard...');
    await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle2' }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${viewport.name.replace(' ', '-')}-02-dashboard.png`),
      fullPage: false
    });
    viewportResults.screenshots.push('02-dashboard.png');

    // Check for horizontal scroll on dashboard
    const dashboardScroll = await checkHorizontalScroll(page);
    viewportResults.tests.dashboardNoHorizontalScroll = !dashboardScroll.hasScroll;
    if (dashboardScroll.hasScroll) {
      results.issues.push({
        viewport: viewport.name,
        severity: 'HIGH',
        issue: 'Horizontal scroll detected on dashboard',
        details: `Scroll width: ${dashboardScroll.scrollWidth}px, Viewport: ${dashboardScroll.viewportWidth}px`
      });
    }

    // Find and click "+ New Lead" button
    console.log('3. Looking for "+ New Lead" button...');
    const newLeadButton = await page.$('button:has-text("New Lead"), button:has-text("+ New Lead"), [aria-label*="New Lead"]');

    if (!newLeadButton) {
      // Try alternative selectors
      const allButtons = await page.$$('button');
      let foundButton = null;
      for (const btn of allButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('New Lead') || text.includes('+ New')) {
          foundButton = btn;
          break;
        }
      }
      if (foundButton) {
        console.log('   Found "+ New Lead" button via text search');
        await foundButton.click();
      } else {
        throw new Error('Could not find "+ New Lead" button');
      }
    } else {
      console.log('   Found "+ New Lead" button');
      await newLeadButton.click();
    }

    await new Promise(r => setTimeout(r, 500));

    // Screenshot: LeadTypeSelector step
    console.log('4. Capturing LeadTypeSelector screen...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${viewport.name.replace(' ', '-')}-03-leadTypeSelector.png`),
      fullPage: false
    });
    viewportResults.screenshots.push('03-leadTypeSelector.png');

    // Check for horizontal scroll in dialog
    const dialogScroll = await checkHorizontalScroll(page);
    viewportResults.tests.dialogNoHorizontalScroll = !dialogScroll.hasScroll;
    if (dialogScroll.hasScroll) {
      results.issues.push({
        viewport: viewport.name,
        severity: 'CRITICAL',
        issue: 'Horizontal scroll in dialog',
        details: `Scroll width: ${dialogScroll.scrollWidth}px, Viewport: ${dialogScroll.viewportWidth}px`
      });
    }

    // Measure type selector buttons
    console.log('5. Measuring type selector buttons...');
    const typeSelectorButtons = await getAllButtonMeasurements(page);
    const typeButtons = typeSelectorButtons.filter(btn =>
      btn.text.includes('HiPages') || btn.text.includes('Normal Lead')
    );

    viewportResults.tests.typeSelectorButtonsHeight = typeButtons.every(btn => btn.height >= 120);
    typeButtons.forEach(btn => {
      console.log(`   ${btn.text}: ${btn.width}x${btn.height}px`);
      if (btn.height < 120) {
        results.issues.push({
          viewport: viewport.name,
          severity: 'HIGH',
          issue: 'Type selector button too short',
          details: `Button "${btn.text}" height: ${btn.height}px (minimum: 120px)`
        });
      }
    });

    // Click HiPages Lead button
    console.log('6. Testing HiPages Lead flow...');
    const hipagesButton = await page.$('button:has-text("HiPages")');
    if (hipagesButton) {
      await hipagesButton.click();
      await new Promise(r => setTimeout(r, 500));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `${viewport.name.replace(' ', '-')}-04-hipagesForm.png`),
        fullPage: false
      });
      viewportResults.screenshots.push('04-hipagesForm.png');

      // Measure input fields
      const inputs = await page.$$('input');
      console.log(`   Found ${inputs.length} input fields`);

      for (let i = 0; i < inputs.length; i++) {
        const measurements = await page.evaluate((input) => {
          const rect = input.getBoundingClientRect();
          const styles = window.getComputedStyle(input);
          return {
            height: rect.height,
            fontSize: parseFloat(styles.fontSize),
            type: input.type,
            placeholder: input.placeholder
          };
        }, inputs[i]);

        console.log(`   Input ${i + 1} (${measurements.type}): ${measurements.height}px height, ${measurements.fontSize}px font`);

        if (measurements.height < 48) {
          results.issues.push({
            viewport: viewport.name,
            severity: 'CRITICAL',
            issue: 'Input field too short',
            details: `Input (${measurements.placeholder}) height: ${measurements.height}px (minimum: 48px)`
          });
        }

        if (measurements.fontSize < 16) {
          results.issues.push({
            viewport: viewport.name,
            severity: 'CRITICAL',
            issue: 'Input font size too small (causes iOS auto-zoom)',
            details: `Input (${measurements.placeholder}) font-size: ${measurements.fontSize}px (minimum: 16px)`
          });
        }
      }

      // Go back
      const backButton = await page.$('button:has-text("Back")');
      if (backButton) {
        await backButton.click();
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Click Normal Lead button
    console.log('7. Testing Normal Lead flow...');
    const normalButton = await page.$('button:has-text("Normal Lead")');
    if (normalButton) {
      await normalButton.click();
      await new Promise(r => setTimeout(r, 500));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `${viewport.name.replace(' ', '-')}-05-normalLeadForm.png`),
        fullPage: true  // Full page to see entire form
      });
      viewportResults.screenshots.push('05-normalLeadForm.png');

      // Check character counter visibility
      const hasCharCounter = await page.evaluate(() => {
        const counter = Array.from(document.querySelectorAll('*')).find(el =>
          el.textContent.includes('/500') || el.textContent.includes('characters')
        );
        return counter !== undefined;
      });
      viewportResults.tests.characterCounterVisible = hasCharCounter;

      // Measure all buttons in form
      const formButtons = await getAllButtonMeasurements(page);
      console.log('   Form button measurements:');
      formButtons.forEach(btn => {
        console.log(`   "${btn.text}": ${btn.width}x${btn.height}px - ${btn.meets48px ? '✓' : '✗ TOO SMALL'}`);
        if (!btn.meets48px) {
          results.issues.push({
            viewport: viewport.name,
            severity: 'CRITICAL',
            issue: 'Touch target too small',
            details: `Button "${btn.text}" dimensions: ${btn.width}x${btn.height}px (minimum: 48x48px)`
          });
        }
      });

      // Test validation error state
      console.log('8. Testing validation error state...');
      const submitButton = await page.$('button:has-text("Create Lead")');
      if (submitButton) {
        await submitButton.click();
        await new Promise(r => setTimeout(r, 500));

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `${viewport.name.replace(' ', '-')}-06-validationErrors.png`),
          fullPage: true
        });
        viewportResults.screenshots.push('06-validationErrors.png');
      }

      // Close dialog
      const closeButton = await page.$('[aria-label="Close"]') || await page.$('button[aria-label="Close"]');
      if (closeButton) {
        await closeButton.click();
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Performance check
    console.log('9. Performance metrics...');
    const performanceMetrics = await page.metrics();
    viewportResults.tests.performance = {
      jsHeapSize: Math.round(performanceMetrics.JSHeapUsedSize / 1024 / 1024) + ' MB',
      layoutDuration: Math.round(performanceMetrics.LayoutDuration * 1000) + 'ms',
      scriptDuration: Math.round(performanceMetrics.ScriptDuration * 1000) + 'ms'
    };

  } catch (error) {
    console.error(`Error testing ${viewport.name}:`, error.message);
    viewportResults.tests.error = error.message;
    results.issues.push({
      viewport: viewport.name,
      severity: 'CRITICAL',
      issue: 'Test execution failed',
      details: error.message
    });
  } finally {
    await page.close();
  }

  results.viewports[viewport.name] = viewportResults;
  console.log(`✓ Completed ${viewport.name} testing`);
}

async function generateReport() {
  const reportPath = path.join(SCREENSHOTS_DIR, 'TEST-REPORT.md');

  let report = `# NewLeadDialog Mobile-First Testing Report\n\n`;
  report += `**Test Date:** ${new Date().toISOString()}\n`;
  report += `**Application URL:** ${APP_URL}\n`;
  report += `**Test Viewports:** ${VIEWPORTS.map(v => v.name).join(', ')}\n\n`;

  report += `## Executive Summary\n\n`;
  report += `- **Total Issues Found:** ${results.issues.length}\n`;
  report += `- **Critical Issues:** ${results.issues.filter(i => i.severity === 'CRITICAL').length}\n`;
  report += `- **High Priority Issues:** ${results.issues.filter(i => i.severity === 'HIGH').length}\n`;
  report += `- **Primary Viewport (375px) Status:** ${results.issues.filter(i => i.viewport === 'iPhone SE').length === 0 ? '✅ PASS' : '❌ FAIL'}\n\n`;

  report += `## Viewport Testing Results\n\n`;

  for (const [vpName, vpData] of Object.entries(results.viewports)) {
    report += `### ${vpName} (${vpData.dimensions}) - ${vpData.priority}\n\n`;

    if (vpData.tests.error) {
      report += `❌ **Test Failed:** ${vpData.tests.error}\n\n`;
      continue;
    }

    report += `**Screenshots Captured:** ${vpData.screenshots.length}\n`;
    vpData.screenshots.forEach(screenshot => {
      report += `- ${screenshot}\n`;
    });
    report += `\n`;

    report += `**Tests:**\n`;
    report += `- Dashboard horizontal scroll: ${vpData.tests.dashboardNoHorizontalScroll ? '✅ PASS (no scroll)' : '❌ FAIL (has scroll)'}\n`;
    report += `- Dialog horizontal scroll: ${vpData.tests.dialogNoHorizontalScroll ? '✅ PASS (no scroll)' : '❌ FAIL (has scroll)'}\n`;
    report += `- Type selector buttons (≥120px): ${vpData.tests.typeSelectorButtonsHeight ? '✅ PASS' : '❌ FAIL'}\n`;
    report += `- Character counter visible: ${vpData.tests.characterCounterVisible ? '✅ PASS' : '❌ FAIL'}\n\n`;

    if (vpData.tests.performance) {
      report += `**Performance:**\n`;
      report += `- JS Heap Size: ${vpData.tests.performance.jsHeapSize}\n`;
      report += `- Layout Duration: ${vpData.tests.performance.layoutDuration}\n`;
      report += `- Script Duration: ${vpData.tests.performance.scriptDuration}\n\n`;
    }
  }

  if (results.issues.length > 0) {
    report += `## Issues Found\n\n`;

    const criticalIssues = results.issues.filter(i => i.severity === 'CRITICAL');
    const highIssues = results.issues.filter(i => i.severity === 'HIGH');

    if (criticalIssues.length > 0) {
      report += `### 🚨 Critical Issues (${criticalIssues.length})\n\n`;
      criticalIssues.forEach((issue, idx) => {
        report += `${idx + 1}. **[${issue.viewport}]** ${issue.issue}\n`;
        report += `   - ${issue.details}\n\n`;
      });
    }

    if (highIssues.length > 0) {
      report += `### ⚠️ High Priority Issues (${highIssues.length})\n\n`;
      highIssues.forEach((issue, idx) => {
        report += `${idx + 1}. **[${issue.viewport}]** ${issue.issue}\n`;
        report += `   - ${issue.details}\n\n`;
      });
    }
  } else {
    report += `## ✅ All Tests Passed!\n\n`;
    report += `No issues found. The NewLeadDialog component meets all mobile-first requirements.\n\n`;
  }

  report += `## Mobile-First Checklist\n\n`;
  report += `### Touch Targets\n`;
  report += `- [ ] All buttons ≥48px height\n`;
  report += `- [ ] Type selector buttons ≥120px height\n`;
  report += `- [ ] Input fields ≥48px height\n`;
  report += `- [ ] Adequate spacing between elements\n\n`;

  report += `### Typography\n`;
  report += `- [ ] Input fields use font-size ≥16px\n`;
  report += `- [ ] Labels clearly readable\n`;
  report += `- [ ] Error messages visible\n\n`;

  report += `### Layout\n`;
  report += `- [ ] No horizontal scrolling at any viewport\n`;
  report += `- [ ] Vertical scrolling smooth\n`;
  report += `- [ ] Dialog fits within viewport\n\n`;

  report += `### Performance\n`;
  report += `- [ ] Dialog opens quickly (<500ms)\n`;
  report += `- [ ] No render blocking\n`;
  report += `- [ ] Smooth transitions\n\n`;

  report += `## Recommendations\n\n`;

  if (results.issues.length > 0) {
    report += `Based on the issues found, the following fixes are recommended:\n\n`;

    // Group recommendations by issue type
    const inputIssues = results.issues.filter(i => i.issue.includes('Input'));
    const buttonIssues = results.issues.filter(i => i.issue.includes('button') || i.issue.includes('Touch target'));
    const scrollIssues = results.issues.filter(i => i.issue.includes('scroll'));

    if (inputIssues.length > 0) {
      report += `### Input Fields\n`;
      report += `- Ensure all input fields use \`h-12\` (48px) Tailwind class\n`;
      report += `- Use \`text-base\` (16px) or larger for input font size\n`;
      report += `- Verify no custom CSS overrides reducing height\n\n`;
    }

    if (buttonIssues.length > 0) {
      report += `### Buttons and Touch Targets\n`;
      report += `- Ensure all clickable elements use \`min-h-[48px]\` at minimum\n`;
      report += `- Type selector buttons should use \`min-h-[120px]\`\n`;
      report += `- Add adequate padding: \`px-4 py-3\` or equivalent\n\n`;
    }

    if (scrollIssues.length > 0) {
      report += `### Layout and Scrolling\n`;
      report += `- Add \`max-w-full overflow-x-hidden\` to dialog container\n`;
      report += `- Use \`w-full\` instead of fixed widths\n`;
      report += `- Test with \`overflow-x: hidden\` on body during dialog open\n\n`;
    }
  } else {
    report += `All tests passed! No recommendations needed.\n\n`;
  }

  report += `---\n\n`;
  report += `*Generated by mobile-tester agent*\n`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n✅ Report generated: ${reportPath}`);

  return reportPath;
}

async function main() {
  console.log('NewLeadDialog Mobile-First Testing Script');
  console.log('==========================================\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const viewport of VIEWPORTS) {
      await testViewport(browser, viewport);
    }

    const reportPath = await generateReport();

    console.log('\n' + '='.repeat(60));
    console.log('Testing Complete!');
    console.log('='.repeat(60));
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log(`Report saved to: ${reportPath}`);
    console.log(`\nTotal Issues: ${results.issues.length}`);
    console.log(`Critical: ${results.issues.filter(i => i.severity === 'CRITICAL').length}`);
    console.log(`High: ${results.issues.filter(i => i.severity === 'HIGH').length}`);

    if (results.issues.filter(i => i.viewport === 'iPhone SE').length > 0) {
      console.log('\n❌ PRIMARY VIEWPORT (375px) FAILED');
      console.log('The component does NOT meet mobile-first requirements.');
    } else {
      console.log('\n✅ PRIMARY VIEWPORT (375px) PASSED');
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
