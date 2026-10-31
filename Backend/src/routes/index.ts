import { Router } from 'express';
import { authRoutes } from '../modules/auth/index.js';
import { catalogRoutes } from '../modules/catalog/index.js';
import { discountRoutes } from '../modules/discounts/index.js';
import { invoiceRoutes } from '../modules/invoices/index.js';
import { paymentTermRoutes } from '../modules/payment-terms/index.js';
import { portalRoutes } from '../modules/portal/index.js';
import { quotationRoutes } from '../modules/quotations/index.js';
import { reportRoutes } from '../modules/reports/index.js';
import { subscriptionRoutes } from '../modules/subscriptions/index.js';
import { userRoutes } from '../modules/users/index.js';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/catalog', catalogRoutes);
apiRoutes.use('/discounts', discountRoutes);
apiRoutes.use('/invoices', invoiceRoutes);
apiRoutes.use('/payment-terms', paymentTermRoutes);
apiRoutes.use('/portal', portalRoutes);
apiRoutes.use('/quotations', quotationRoutes);
apiRoutes.use('/reports', reportRoutes);
apiRoutes.use('/subscriptions', subscriptionRoutes);
