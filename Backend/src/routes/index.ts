import { Router } from 'express';
import { authRoutes } from '../modules/auth/index.js';
import { catalogRoutes } from '../modules/catalog/index.js';
import { invoiceRoutes } from '../modules/invoices/index.js';
import { paymentTermRoutes } from '../modules/payment-terms/index.js';
import { quotationRoutes } from '../modules/quotations/index.js';
import { subscriptionRoutes } from '../modules/subscriptions/index.js';
import { userRoutes } from '../modules/users/index.js';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/catalog', catalogRoutes);
apiRoutes.use('/invoices', invoiceRoutes);
apiRoutes.use('/payment-terms', paymentTermRoutes);
apiRoutes.use('/quotations', quotationRoutes);
apiRoutes.use('/subscriptions', subscriptionRoutes);
