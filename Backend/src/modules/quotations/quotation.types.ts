export type QuotationLineInput = {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice?: number;
  taxRate: number;
  sortOrder: number;
};

export type QuotationInput = {
  name: string;
  description?: string;
  validityDays: number;
  planId?: string;
  isActive: boolean;
  lines: QuotationLineInput[];
};

export type QuotationUpdateInput = {
  name?: string;
  description?: string | null;
  validityDays?: number;
  planId?: string | null;
  isActive?: boolean;
  lines?: QuotationLineInput[];
};

export type QuotationListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
};
