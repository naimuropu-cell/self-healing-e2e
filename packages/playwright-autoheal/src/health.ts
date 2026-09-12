import * as fs from 'fs';
import * as path from 'path';

export type FragilityLevel = 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'BRITTLE' | 'CRITICAL';

export interface LocatorAuditResult {
  filePath: string;
  lineNumber: number;
  rawLocator: string;
  strategyType: string;
  score: number; // 0 - 100
  level: FragilityLevel;
  issues: string[];
  recommendation?: string;
  isDescriptor: boolean;
}

export interface HealthAuditSummary {
  totalScanned: number;
  overallScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    excellent: number;
    good: number;
    moderate: number;
    brittle: number;
    critical: number;
  };
  findings: LocatorAuditResult[];
  timestamp: string;
  summaryText: string;
}

export interface HealthOptions {
  targetDir?: string | string[];
  minScore?: number;
  strict?: boolean;
  verbose?: boolean;
}

export function getDefaultTargetDirs(): string[] {
  const cwd = process.cwd();
  if (path.basename(cwd) === 'tests' || path.basename(cwd) === 'test') {
    return [path.resolve(cwd, 'pages'), path.resolve(cwd, 'e2e')];
  }
  if (fs.existsSync(path.resolve(cwd, 'tests'))) {
    return [path.resolve(cwd, 'tests/pages'), path.resolve(cwd, 'tests/e2e')];
  }
  if (fs.existsSync(path.resolve(cwd, '../../tests'))) {
    return [path.resolve(cwd, '../../tests/pages'), path.resolve(cwd, '../../tests/e2e')];
  }
  return [path.resolve(cwd, 'tests/pages'), path.resolve(cwd, 'tests/e2e')];
}

function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const stat = fs.statSync(dir);
  if (stat.isFile()) return [dir];

  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const s = fs.statSync(fullPath);
    if (s.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.js')) {
      if (!item.endsWith('.d.ts') && !item.endsWith('.config.ts')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

export function scoreSelector(
  rawSelector: string,
  strategyHint: string = 'css',
  isDescriptor: boolean = false
): { score: number; level: FragilityLevel; issues: string[]; recommendation?: string } {
  let score = 70;
  const issues: string[] = [];
  const s = rawSelector.trim();

  // 1. Check for Rock-Solid Test Attributes
  if (
    strategyHint === 'testid' ||
    s.includes('data-testid=') ||
    s.includes('data-test=') ||
    s.includes('data-cy=') ||
    s.includes('data-qa=')
  ) {
    score = 100;
  } else if (strategyHint === 'role') {
    score = 94;
  } else if (strategyHint === 'label' || strategyHint === 'placeholder') {
    score = 88;
  } else if (strategyHint === 'text') {
    score = 80;
    if (s.length > 30) {
      score -= 10;
      issues.push('Long text matching is vulnerable to minor copy or localization updates.');
    }
  } else {
    // Standard CSS or XPath Analysis
    score = 70;

    // Absolute XPath
    const isAbsoluteXpath = (s.startsWith('/') && !s.startsWith('//')) || /^\/(?:html|body)/i.test(s);
    if (isAbsoluteXpath) {
      score -= 55;
      issues.push('Absolute DOM hierarchy in XPath is extremely fragile to layout shifts.');
    } else if (s.startsWith('//') || s.startsWith('xpath=')) {
      score -= 20;
      issues.push('Broad XPath expressions can lead to unintended matches and high fragility.');
    }

    // Deep CSS Hierarchy (> 2 child combinators)
    const childCombinators = (s.match(/>/g) || []).length;
    if (childCombinators >= 2) {
      score -= 30;
      issues.push(`Deep CSS nesting (${childCombinators} child combinators) is brittle to structural refactoring.`);
    }

    // Positional / Indexing Selectors
    const isPositional = s.includes(':nth-child(') || s.includes(':nth-of-type(') || s.includes(':eq(') || /\[\d+\]/.test(s);
    if (isPositional) {
      score -= 30;
      issues.push('Positional index selector (:nth-child / index) will break if sibling elements shift.');
    }

    // Generated / Hashed CSS Classes (e.g., css-1a2b3c, styled_9f8e2, _2xY7z)
    const hasDynamicHash = /css-[a-z0-9]{4,}|_[0-9a-zA-Z]{5,}|(?:[a-zA-Z]+[0-9]{2,}[a-zA-Z0-9]*)/.test(s) && !s.includes('data-testid');
    if (hasDynamicHash) {
      score -= 35;
      issues.push('Selector targets dynamically hashed or compiled CSS classes that drift between builds.');
    }

    // Generic HTML tags without specificity
    if (/^(?:button|input|div|span|a|p|select|table)$/i.test(s)) {
      score -= 30;
      issues.push('Generic tag selector without scoping or test attributes causes ambiguity.');
    }
  }

  // Bonus for multi-strategy descriptors (built-in resilience net)
  if (isDescriptor) {
    score = Math.min(100, score + 10);
  }

  score = Math.max(0, Math.min(100, score));

  let level: FragilityLevel = 'MODERATE';
  if (score >= 90) level = 'EXCELLENT';
  else if (score >= 75) level = 'GOOD';
  else if (score >= 50) level = 'MODERATE';
  else if (score >= 25) level = 'BRITTLE';
  else level = 'CRITICAL';

  let recommendation: string | undefined;
  if (score < 75) {
    if (issues.some((i) => i.includes('data-testid') || i.includes('Deep') || i.includes('index'))) {
      recommendation = 'Replace with dedicated [data-testid="..."] or wrap in a multi-strategy SelfHealingDescriptor.';
    } else {
      recommendation = 'Consider upgrading to getByRole() or adding fallback locator strategies.';
    }
  }

  return { score, level, issues, recommendation };
}

function calculateGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 95) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 78) return 'B';
  if (score >= 68) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function scanFile(filePath: string): LocatorAuditResult[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: LocatorAuditResult[] = [];

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    // 1. Check getByTestId
    for (const match of lineText.matchAll(/getByTestId\(\s*['"`]([^'"`]+)['"`]/g)) {
      const evaluation = scoreSelector(match[1], 'testid', false);
      results.push({
        filePath,
        lineNumber: lineNum,
        rawLocator: `getByTestId("${match[1]}")`,
        strategyType: 'testid',
        score: evaluation.score,
        level: evaluation.level,
        issues: evaluation.issues,
        recommendation: evaluation.recommendation,
        isDescriptor: false,
      });
    }

    // 2. Check getByRole
    for (const match of lineText.matchAll(/getByRole\(\s*['"`]([^'"`]+)['"`]/g)) {
      const evaluation = scoreSelector(match[1], 'role', false);
      results.push({
        filePath,
        lineNumber: lineNum,
        rawLocator: `getByRole("${match[1]}")`,
        strategyType: 'role',
        score: evaluation.score,
        level: evaluation.level,
        issues: evaluation.issues,
        recommendation: evaluation.recommendation,
        isDescriptor: false,
      });
    }

    // 3. Check getByPlaceholder & getByLabel
    for (const match of lineText.matchAll(/getByPlaceholder\(\s*['"`]([^'"`]+)['"`]/g)) {
      const evaluation = scoreSelector(match[1], 'placeholder', false);
      results.push({
        filePath,
        lineNumber: lineNum,
        rawLocator: `getByPlaceholder("${match[1]}")`,
        strategyType: 'placeholder',
        score: evaluation.score,
        level: evaluation.level,
        issues: evaluation.issues,
        recommendation: evaluation.recommendation,
        isDescriptor: false,
      });
    }

    for (const match of lineText.matchAll(/getByLabel\(\s*['"`]([^'"`]+)['"`]/g)) {
      const evaluation = scoreSelector(match[1], 'label', false);
      results.push({
        filePath,
        lineNumber: lineNum,
        rawLocator: `getByLabel("${match[1]}")`,
        strategyType: 'label',
        score: evaluation.score,
        level: evaluation.level,
        issues: evaluation.issues,
        recommendation: evaluation.recommendation,
        isDescriptor: false,
      });
    }

    // 4. Check getByText
    for (const match of lineText.matchAll(/getByText\(\s*['"`]([^'"`]+)['"`]/g)) {
      const evaluation = scoreSelector(match[1], 'text', false);
      results.push({
        filePath,
        lineNumber: lineNum,
        rawLocator: `getByText("${match[1]}")`,
        strategyType: 'text',
        score: evaluation.score,
        level: evaluation.level,
        issues: evaluation.issues,
        recommendation: evaluation.recommendation,
        isDescriptor: false,
      });
    }

    // 5. Check page.locator(...)
    for (const match of lineText.matchAll(/locator\(\s*['"`]([^'"`]+)['"`]/g)) {
      const val = match[1];
      const hint = val.startsWith('//') || val.startsWith('xpath=') ? 'xpath' : 'css';
      const evaluation = scoreSelector(val, hint, false);
      results.push({
        filePath,
        lineNumber: lineNum,
        rawLocator: `locator("${val}")`,
        strategyType: hint,
        score: evaluation.score,
        level: evaluation.level,
        issues: evaluation.issues,
        recommendation: evaluation.recommendation,
        isDescriptor: false,
      });
    }

    // 6. Check SelfHealingDescriptor primary definitions
    for (const match of lineText.matchAll(/primary:\s*\{\s*type:\s*['"]([^'"]+)['"],\s*value:\s*['"]([^'"]+)['"]/g)) {
      const type = match[1];
      const val = match[2];
      const evaluation = scoreSelector(val, type, true);
      results.push({
        filePath,
        lineNumber: lineNum,
        rawLocator: `primary: [${type}] "${val}"`,
        strategyType: `descriptor:${type}`,
        score: evaluation.score,
        level: evaluation.level,
        issues: evaluation.issues,
        recommendation: evaluation.recommendation,
        isDescriptor: true,
      });
    }
  });

  return results;
}

export function analyzeLocatorHealth(options: HealthOptions = {}): HealthAuditSummary {
  const targetDirs = options.targetDir
    ? (Array.isArray(options.targetDir) ? options.targetDir : [options.targetDir])
    : getDefaultTargetDirs();

  const allFiles: string[] = [];

  targetDirs.forEach((dir) => {
    allFiles.push(...getFilesRecursively(path.resolve(dir)));
  });

  const uniqueFiles = Array.from(new Set(allFiles));
  const findings: LocatorAuditResult[] = [];

  uniqueFiles.forEach((file) => {
    findings.push(...scanFile(file));
  });

  const totalScanned = findings.length;
  const totalScore = findings.reduce((acc, f) => acc + f.score, 0);
  const overallScore = totalScanned > 0 ? Math.round(totalScore / totalScanned) : 100;
  const grade = calculateGrade(overallScore);

  const breakdown = {
    excellent: findings.filter((f) => f.level === 'EXCELLENT').length,
    good: findings.filter((f) => f.level === 'GOOD').length,
    moderate: findings.filter((f) => f.level === 'MODERATE').length,
    brittle: findings.filter((f) => f.level === 'BRITTLE').length,
    critical: findings.filter((f) => f.level === 'CRITICAL').length,
  };

  const lines: string[] = [];
  lines.push('\n================================================================');
  lines.push('🏥   AUTONOMOUS QA: LOCATOR HEALTH & FRAGILITY AUDIT');
  lines.push('================================================================\n');

  lines.push(`Overall Health Score : ${overallScore}/100  [Grade: ${grade}]`);
  lines.push(`Total Locators Scanned: ${totalScanned}`);
  lines.push(`Audited Directories  : ${targetDirs.map((d) => path.relative(process.cwd(), d) || d).join(', ')}\n`);

  lines.push('Breakdown by Resilience Tier:');
  lines.push(`  🟢 Excellent (90-100%) : ${breakdown.excellent}`);
  lines.push(`  🔵 Good      (75-89%)  : ${breakdown.good}`);
  lines.push(`  🟡 Moderate  (50-74%)  : ${breakdown.moderate}`);
  lines.push(`  🟠 Brittle   (25-49%)  : ${breakdown.brittle}`);
  lines.push(`  🔴 Critical  (0-24%)   : ${breakdown.critical}\n`);

  const riskyLocators = findings.filter((f) => f.score < 75);
  if (riskyLocators.length > 0) {
    lines.push('⚠️  Flagged High-Risk & Brittle Selectors:');
    lines.push('----------------------------------------------------------------');
    riskyLocators.forEach((loc, idx) => {
      const relPath = path.relative(process.cwd(), loc.filePath);
      lines.push(`[#${idx + 1}] ${relPath}:${loc.lineNumber} (${loc.score}% - ${loc.level})`);
      lines.push(`     Selector : ${loc.rawLocator}`);
      if (loc.issues.length > 0) {
        loc.issues.forEach((issue) => lines.push(`     Issue    : ${issue}`));
      }
      if (loc.recommendation) {
        lines.push(`     Fix      : ${loc.recommendation}`);
      }
      lines.push('');
    });
  } else {
    lines.push('🎉 Outstanding! Zero brittle or high-risk locators found across your test suite.\n');
  }

  const summaryText = lines.join('\n');

  return {
    totalScanned,
    overallScore,
    grade,
    breakdown,
    findings,
    timestamp: new Date().toISOString(),
    summaryText,
  };
}
