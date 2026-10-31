import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type Pagination = z.infer<typeof paginationSchema>;

export function paginationResponse<T>(items: T[], total: number, pagination: Pagination) {
  return {
    items,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize)
    }
  };
}

export function paginationArgs(pagination: Pagination) {
  return {
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize
  };
}
