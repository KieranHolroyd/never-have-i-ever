// questions.test.ts — legacy tests for questions.ts which was deleted.
// Question selection is now handled by Redis SPOP in GameStateService.

import { describe, it, expect } from 'bun:test';

describe('Questions (legacy)', () => {
  it('placeholder - questions are now selected via Redis SPOP', () => {
    expect(true).toBe(true);
  });
});
