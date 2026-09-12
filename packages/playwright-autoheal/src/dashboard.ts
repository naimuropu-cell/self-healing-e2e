import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { HealingAuditEntry } from './types';
import { getDefaultAuditFilePath } from './engine';

export interface DashboardOptions {
  auditFilePath?: string;
  outputPath?: string;
  title?: string;
  autoOpen?: boolean;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getDefaultDashboardOutputPath(): string {
  if (process.env.HEALING_DASHBOARD_FILE) {
    return path.resolve(process.env.HEALING_DASHBOARD_FILE);
  }
  const cwd = process.cwd();
  if (path.basename(cwd) === 'tests' || path.basename(cwd) === 'test') {
    return path.resolve(cwd, 'test-results/autoheal-report.html');
  }
  return path.resolve(cwd, 'tests/test-results/autoheal-report.html');
}

export function openInBrowser(filePath: string): void {
  const normalizedPath = path.resolve(filePath);
  const platform = process.platform;
  let cmd = '';

  if (platform === 'win32') {
    cmd = `start "" "${normalizedPath}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${normalizedPath}"`;
  } else {
    cmd = `xdg-open "${normalizedPath}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.warn('⚠️ Could not automatically launch browser:', err.message);
    }
  });
}

function renderCards(entries: HealingAuditEntry[]): string {
  if (entries.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
        <h3>Ledger Clean • No Broken Selectors</h3>
        <p>All Playwright tests are resolving directly on their primary locators. Run your suite with mutated selectors to observe self-healing events.</p>
      </div>
    `;
  }

  return entries.map((entry, index) => {
    const isAi = entry.recoveryEngine && entry.recoveryEngine !== 'heuristic';
    const engineType = isAi ? 'ai' : 'heuristic';
    const engineBadgeClass = isAi ? 'badge-engine-ai' : 'badge-engine-heuristic';
    const engineText = isAi ? `AI Semantic (${entry.recoveryEngine === 'ai-local' ? 'Local' : 'Remote'})` : 'Heuristic Fallback';
    
    const failedVal = entry.primaryFailed?.value || '';
    const failedType = entry.primaryFailed?.type || 'selector';
    const healedVal = entry.healedWith?.value || '';
    const healedType = entry.healedWith?.type || 'selector';
    const confidence = entry.healedWith?.confidence ? `• Confidence: ${(entry.healedWith.confidence * 100).toFixed(0)}%` : '';
    const formattedDate = new Date(entry.timestamp).toLocaleString();
    const searchable = `${entry.elementName} ${entry.pageUrl} ${failedVal} ${healedVal}`.toLowerCase();

    const patchPayload = JSON.stringify({
      element: entry.elementName,
      from: { type: failedType, value: failedVal },
      to: { type: healedType, value: healedVal }
    });

    return `
      <article class="event-card" data-engine="${engineType}" data-search="${escapeHtml(searchable)}">
        <div class="event-header">
          <div class="event-title-area">
            <h4>
              <span>#${index + 1}</span>
              ${escapeHtml(entry.elementName)}
            </h4>
            <div class="event-meta">
              <span class="meta-tag">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                ${formattedDate}
              </span>
              <span class="meta-tag">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                ${escapeHtml(entry.pageUrl)}
              </span>
            </div>
          </div>
          <div class="badge-group">
            <span class="badge badge-success">Resolved</span>
            <span class="badge ${engineBadgeClass}">${engineText}</span>
            <span class="badge badge-time">${entry.resolutionTimeMs}ms</span>
          </div>
        </div>

        <div class="diff-container">
          <div class="diff-box diff-failed">
            <div class="diff-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              Failed Primary Strategy [${escapeHtml(failedType)}]
            </div>
            <div class="diff-code">${escapeHtml(failedVal)}</div>
            <div class="diff-footer">
              <span>Status: TIMED_OUT</span>
            </div>
          </div>

          <div class="diff-box diff-healed">
            <div class="diff-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              Healed Strategy [${escapeHtml(healedType)}]
            </div>
            <div class="diff-code">${escapeHtml(healedVal)}</div>
            <div class="diff-footer">
              <span>${confidence || 'Strategy Verified'}</span>
              <span>Duration: ${entry.resolutionTimeMs}ms</span>
            </div>
          </div>
        </div>

        <div class="event-actions">
          <button class="btn-sm btn-copy-locator" data-copy="${escapeHtml(healedVal)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            Copy Healed Locator
          </button>
          <button class="btn-sm btn-copy-patch" data-copy="${escapeHtml(patchPayload)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
            Copy Patch JSON
          </button>
        </div>
      </article>
    `;
  }).join('\n');
}

export function generateHtmlDashboard(options: DashboardOptions = {}): string {
  const auditFile = options.auditFilePath || getDefaultAuditFilePath();
  const pageTitle = options.title || 'Playwright AutoHeal • Autonomous Telemetry & Diagnostics';

  let entries: HealingAuditEntry[] = [];
  if (fs.existsSync(auditFile)) {
    try {
      entries = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
    } catch {
      entries = [];
    }
  }

  const totalInterventions = entries.length;
  const totalDuration = entries.reduce((acc, curr) => acc + (curr.resolutionTimeMs || 0), 0);
  const avgDuration = totalInterventions > 0 ? Math.round(totalDuration / totalInterventions) : 0;

  const heuristicEntries = entries.filter((e) => !e.recoveryEngine || e.recoveryEngine === 'heuristic');
  const aiEntries = entries.filter((e) => e.recoveryEngine && e.recoveryEngine !== 'heuristic');

  const heuristicCount = heuristicEntries.length;
  const aiCount = aiEntries.length;

  const cardsHtml = renderCards(entries);
  const rawJsonData = JSON.stringify(entries).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    :root {
      --bg-base: #0a0e17;
      --bg-surface: #111827;
      --bg-surface-elevated: #1a2234;
      --bg-surface-card: rgba(22, 30, 46, 0.75);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(59, 130, 246, 0.35);
      --text-main: #f3f4f6;
      --text-muted: #94a3b8;
      --text-subtle: #64748b;
      --accent-blue: #3b82f6;
      --accent-cyan: #06b6d4;
      --accent-emerald: #10b981;
      --accent-purple: #8b5cf6;
      --accent-amber: #f59e0b;
      --accent-rose: #ef4444;
      --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg-base);
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 85% 25%, rgba(139, 92, 246, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 50% 85%, rgba(16, 185, 129, 0.05) 0%, transparent 50%);
      background-attachment: fixed;
      color: var(--text-main);
      font-family: var(--font-family);
      min-height: 100vh;
      line-height: 1.5;
      padding-bottom: 60px;
    }

    .container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }

    header {
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-subtle);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 70px;
    }

    .logo-area { display: flex; align-items: center; gap: 12px; }

    .logo-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
    }

    .logo-icon svg { width: 20px; height: 20px; fill: #ffffff; }

    .logo-text h1 {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-badge {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .header-actions { display: flex; align-items: center; gap: 12px; }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
      text-decoration: none;
    }

    .btn-subtle {
      background: var(--bg-surface-elevated);
      color: var(--text-main);
      border-color: var(--border-subtle);
    }

    .btn-subtle:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-blue), #2563eb);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .btn-primary:hover {
      box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
      transform: translateY(-1px);
    }

    .hero {
      padding: 32px 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
    }

    .hero-title h2 {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 6px;
    }

    .hero-title p { color: var(--text-muted); font-size: 0.95rem; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .kpi-card {
      background: var(--bg-surface-card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.16);
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }

    .card-blue::before { background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); }
    .card-purple::before { background: linear-gradient(90deg, var(--accent-purple), #d946ef); }
    .card-emerald::before { background: linear-gradient(90deg, var(--accent-emerald), #34d399); }
    .card-amber::before { background: linear-gradient(90deg, var(--accent-amber), #fbbf24); }

    .kpi-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      color: var(--text-subtle);
      margin-bottom: 8px;
    }

    .kpi-value {
      font-size: 2.1rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
      line-height: 1;
      margin-bottom: 8px;
    }

    .kpi-subtext {
      font-size: 0.82rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .kpi-subtext .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-emerald);
      box-shadow: 0 0 8px var(--accent-emerald);
    }

    .insights-card {
      background: var(--bg-surface-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 32px;
    }

    .insights-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }

    .insights-header h3 { font-size: 1.1rem; font-weight: 700; }

    .progress-bar-container {
      height: 12px;
      border-radius: 9999px;
      background: var(--bg-surface-elevated);
      overflow: hidden;
      display: flex;
      margin-bottom: 16px;
    }

    .progress-segment {
      height: 100%;
      transition: width 0.4s ease;
    }

    .segment-heuristic { background: linear-gradient(90deg, #0284c7, var(--accent-cyan)); }
    .segment-ai { background: linear-gradient(90deg, var(--accent-purple), #c084fc); }

    .insights-legend { display: flex; flex-wrap: wrap; gap: 20px; }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .legend-color { width: 12px; height: 12px; border-radius: 3px; }

    .controls-panel {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: space-between;
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 260px;
    }

    .search-box svg {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      fill: var(--text-subtle);
    }

    .search-input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      color: var(--text-main);
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus { border-color: var(--accent-blue); }

    .filter-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .chip {
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.825rem;
      font-weight: 500;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }

    .chip:hover { color: var(--text-main); border-color: rgba(255, 255, 255, 0.2); }

    .chip.active {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.4);
      color: #93c5fd;
      font-weight: 600;
    }

    .event-list { display: flex; flex-direction: column; gap: 16px; }

    .event-card {
      background: var(--bg-surface-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 20px;
      transition: all 0.2s ease;
    }

    .event-card:hover {
      border-color: var(--border-accent);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .event-title-area h4 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .event-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 0.825rem;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .meta-tag { display: inline-flex; align-items: center; gap: 6px; }

    .badge-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .badge-success {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-engine-heuristic {
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.3);
    }

    .badge-engine-ai {
      background: rgba(139, 92, 246, 0.15);
      color: #c084fc;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }

    .badge-time {
      background: rgba(245, 158, 11, 0.15);
      color: var(--accent-amber);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .diff-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }

    @media (max-width: 768px) {
      .diff-container { grid-template-columns: 1fr; }
    }

    .diff-box {
      border-radius: 10px;
      padding: 14px;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      position: relative;
    }

    .diff-failed {
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .diff-healed {
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .diff-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .diff-failed .diff-label { color: #f87171; }
    .diff-healed .diff-label { color: #34d399; }

    .diff-code { word-break: break-all; line-height: 1.4; }

    .diff-failed .diff-code {
      color: #fca5a5;
      text-decoration: line-through;
      opacity: 0.85;
    }

    .diff-healed .diff-code { color: #6ee7b7; font-weight: 600; }

    .diff-footer {
      font-size: 0.75rem;
      margin-top: 8px;
      color: var(--text-subtle);
      display: flex;
      justify-content: space-between;
    }

    .event-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 12px;
    }

    .btn-sm {
      padding: 5px 12px;
      font-size: 0.775rem;
      border-radius: 6px;
      cursor: pointer;
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .btn-sm:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.25);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: var(--bg-surface-card);
      border: 1px dashed var(--border-subtle);
      border-radius: 16px;
    }

    .empty-icon {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .empty-icon svg { width: 28px; height: 28px; fill: var(--accent-emerald); }
    .empty-state h3 { font-size: 1.25rem; margin-bottom: 8px; }
    .empty-state p { color: var(--text-muted); max-width: 480px; margin: 0 auto 20px; font-size: 0.9rem; }

    .hub-card {
      margin-top: 36px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.8));
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 14px;
      padding: 24px;
    }

    .hub-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .hub-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .hub-item {
      background: rgba(0, 0, 0, 0.3);
      padding: 16px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .hub-item h5 { font-size: 0.9rem; margin-bottom: 6px; color: #93c5fd; }
    .hub-item p { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px; }

    .code-chip {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      background: #0b0f19;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #e2e8f0;
    }

    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 10px;
      border: 1px solid rgba(59, 130, 246, 0.4);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.875rem;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 100;
    }

    #toast.show { transform: translateY(0); opacity: 1; }
  </style>
</head>
<body>

  <header>
    <div class="container nav-content">
      <div class="logo-area">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        </div>
        <div class="logo-text">
          <h1>Playwright AutoHeal <span class="logo-badge">Telemetry Live</span></h1>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-subtle" id="btnExportJson">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          Export JSON
        </button>
        <button class="btn btn-primary" id="btnCopyPatches">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          Copy All Patches
        </button>
      </div>
    </div>
  </header>

  <main class="container">
    <section class="hero">
      <div class="hero-title">
        <h2>Self-Healing Test Diagnostics</h2>
        <p>Real-time audit telemetry capturing locator drift, heuristic fallbacks, and AI semantic recoveries.</p>
      </div>
    </section>

    <section class="kpi-grid">
      <div class="kpi-card card-blue">
        <div class="kpi-label">Total Interventions</div>
        <div class="kpi-value" id="statTotalInterventions">${totalInterventions}</div>
        <div class="kpi-subtext"><span class="dot"></span> 100% Test Stability Protected</div>
      </div>

      <div class="kpi-card card-purple">
        <div class="kpi-label">AI Semantic Recoveries</div>
        <div class="kpi-value" id="statAiCount">${aiCount}</div>
        <div class="kpi-subtext">${totalInterventions > 0 ? ((aiCount / totalInterventions) * 100).toFixed(0) : 0}% of total recoveries</div>
      </div>

      <div class="kpi-card card-emerald">
        <div class="kpi-label">Heuristic Fallbacks</div>
        <div class="kpi-value" id="statHeuristicCount">${heuristicCount}</div>
        <div class="kpi-subtext">${totalInterventions > 0 ? ((heuristicCount / totalInterventions) * 100).toFixed(0) : 0}% resolved instantly</div>
      </div>

      <div class="kpi-card card-amber">
        <div class="kpi-label">Avg Resolution Time</div>
        <div class="kpi-value" id="statAvgLatency">${avgDuration}<span style="font-size: 1.1rem; font-weight: 500;">ms</span></div>
        <div class="kpi-subtext">Zero manual triage delay</div>
      </div>
    </section>

    ${totalInterventions > 0 ? `
    <section class="insights-card">
      <div class="insights-header">
        <h3>Autonomous Recovery Engine Distribution</h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${totalInterventions} locator events recorded</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-segment segment-heuristic" style="width: ${(heuristicCount / totalInterventions) * 100}%;" title="Heuristic: ${heuristicCount}"></div>
        <div class="progress-segment segment-ai" style="width: ${(aiCount / totalInterventions) * 100}%;" title="AI Semantic: ${aiCount}"></div>
      </div>
      <div class="insights-legend">
        <div class="legend-item">
          <div class="legend-color" style="background: var(--accent-cyan);"></div>
          <span>Heuristic Fallback: <strong>${heuristicCount}</strong> (${((heuristicCount / totalInterventions) * 100).toFixed(1)}%)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: var(--accent-purple);"></div>
          <span>AI Semantic Engine: <strong>${aiCount}</strong> (${((aiCount / totalInterventions) * 100).toFixed(1)}%)</span>
        </div>
      </div>
    </section>
    ` : ''}

    <section class="controls-panel">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <input type="text" class="search-input" id="searchInput" placeholder="Search element name, selector value, or page URL..." />
      </div>

      <div class="filter-chips">
        <button class="chip active" data-filter="all">All (<span id="chipCountAll">${totalInterventions}</span>)</button>
        <button class="chip" data-filter="heuristic">Heuristic (<span id="chipCountHeuristic">${heuristicCount}</span>)</button>
        <button class="chip" data-filter="ai">AI Semantic (<span id="chipCountAi">${aiCount}</span>)</button>
      </div>
    </section>

    <section class="event-list" id="eventList">
      ${cardsHtml}
      <div id="noResultsNotice" class="empty-state" style="display: none;">
        <h3>No Matching Events Found</h3>
        <p>Try adjusting your search query or filter chips.</p>
      </div>
    </section>

    <section class="hub-card">
      <div class="hub-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
        Autonomous Patch & Maintenance Automation
      </div>
      <div class="hub-grid">
        <div class="hub-item">
          <h5>1. Apply Verified Patches to Code</h5>
          <p>Permanently rewrites Page Object source files with healed locators:</p>
          <div class="code-chip">
            <span>npm run heal:apply</span>
            <button class="btn-sm btn-chip-copy" data-copy="npm run heal:apply">Copy</button>
          </div>
        </div>

        <div class="hub-item">
          <h5>2. Autonomous Git PR Bot</h5>
          <p>Branches, commits patches, and creates an automated Pull Request:</p>
          <div class="code-chip">
            <span>npm run heal:pr</span>
            <button class="btn-sm btn-chip-copy" data-copy="npm run heal:pr">Copy</button>
          </div>
        </div>

        <div class="hub-item">
          <h5>3. Executive Defect Triage</h5>
          <p>Scans bug tickets and verifies reproduction test specs:</p>
          <div class="code-chip">
            <span>npm run bug:triage</span>
            <button class="btn-sm btn-chip-copy" data-copy="npm run bug:triage">Copy</button>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div id="toast">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
    <span id="toastMsg">Copied to clipboard!</span>
  </div>

  <script id="rawAuditData" type="application/json">${rawJsonData}</script>
  <script>
    const auditData = JSON.parse(document.getElementById('rawAuditData').textContent || '[]');
    let currentFilter = 'all';
    let currentQuery = '';

    const cards = document.querySelectorAll('.event-card');
    const searchInput = document.getElementById('searchInput');
    const filterChips = document.querySelectorAll('.chip');
    const emptyNotice = document.getElementById('noResultsNotice');

    function showToast(msg) {
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toastMsg');
      toastMsg.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2400);
    }

    function copyText(text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
      }).catch(() => {
        showToast('Copied!');
      });
    }

    function updateVisibility() {
      let visibleCount = 0;
      cards.forEach(card => {
        const engine = card.getAttribute('data-engine') || 'heuristic';
        const search = card.getAttribute('data-search') || '';
        const matchesFilter = (currentFilter === 'all') || (currentFilter === engine);
        const matchesSearch = !currentQuery || search.includes(currentQuery);
        if (matchesFilter && matchesSearch) {
          card.style.display = 'block';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });
      if (emptyNotice) {
        emptyNotice.style.display = visibleCount === 0 && cards.length > 0 ? 'block' : 'none';
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentQuery = e.target.value.trim().toLowerCase();
        updateVisibility();
      });
    }

    filterChips.forEach(btn => {
      btn.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter || 'all';
        updateVisibility();
      });
    });

    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        const text = copyBtn.getAttribute('data-copy');
        if (text) copyText(text);
      }
    });

    const btnExport = document.getElementById('btnExportJson');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'playwright-autoheal-telemetry.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Telemetry JSON exported!');
      });
    }

    const btnCopyPatches = document.getElementById('btnCopyPatches');
    if (btnCopyPatches) {
      btnCopyPatches.addEventListener('click', () => {
        const patches = auditData.map(e => ({
          element: e.elementName,
          primaryFailed: e.primaryFailed,
          healedWith: e.healedWith
        }));
        copyText(JSON.stringify(patches, null, 2));
      });
    }
  </script>
</body>
</html>`;
}

export function writeHtmlDashboard(options: DashboardOptions = {}): string {
  const outPath = options.outputPath || getDefaultDashboardOutputPath();
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const html = generateHtmlDashboard(options);
  fs.writeFileSync(outPath, html, 'utf-8');

  if (options.autoOpen) {
    openInBrowser(outPath);
  }

  return outPath;
}
