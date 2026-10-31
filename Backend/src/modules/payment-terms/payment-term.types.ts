export type PaymentTermInput = {
  name: string;
  dueDays: number;
  isActive: boolean;
};

export type PaymentTermUpdateInput = Partial<PaymentTermInput>;

export type PaymentTermListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
};
