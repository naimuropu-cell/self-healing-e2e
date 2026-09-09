# Defect Issue Harness & Autonomous Self-Healing Protocol

This directory contains markdown-based defect tickets and regression specs consumed by the Autonomous QA Engineer.

## Autonomous Resolution Protocol
When a defect ticket is placed in `bug-reports/`:

1. **Ingest Defect Spec**: Read the symptom description, expected vs actual behavior, and steps to reproduce.
2. **Script Reproduction Test**: Create or update an E2E test in `tests/e2e/reproductions/` reproducing the exact failure scenario.
3. **Capture Failure Trace**: Run the test suite and confirm failure, capturing DOM snapshots, console logs, and Playwright traces.
4. **Self-Heal / Code Fix**:
   - If caused by brittle locators or UI markup evolution: self-heal the test locators to match updated semantic `data-testid`s.
   - If caused by an application bug (state, logic, validation): inspect and repair the source code in `app/src/`.
5. **Verify Fix**: Re-run the reproduction test and full regression suite until green.
6. **Ticket Status**: Update the defect ticket with the resolution summary and git commit hash.
