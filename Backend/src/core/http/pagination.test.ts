import { describe, expect, it } from 'vitest';
import { paginationResponse } from './pagination.js';

describe('paginationResponse', () => {
  it('returns nested pagination metadata with calculated total pages', () => {
    expect(paginationResponse([{ id: 'one' }], 21, { page: 2, pageSize: 10 })).toEqual({
      items: [{ id: 'one' }],
      pagination: {
        page: 2,
        pageSize: 10,
        total: 21,
        totalPages: 3
      }
    });
  });

  it('returns zero total pages for an empty result', () => {
    expect(paginationResponse([], 0, { page: 1, pageSize: 20 })).toEqual({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0
      }
    });
  });
});
