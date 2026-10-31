import type { NextFunction, Request, Response } from 'express';
import { getFinanceReport, getOverdueInvoices } from './report.services.js';

export async function finance(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getFinanceReport(request.query) });
  } catch (error) {
    next(error);
  }
}

export async function overdue(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getOverdueInvoices(request.query) });
  } catch (error) {
    next(error);
  }
}
