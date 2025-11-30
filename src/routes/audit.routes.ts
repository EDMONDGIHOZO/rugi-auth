import { Router } from 'express';
import { listAuditController } from '../controllers/audit.controller';
import { validateQuery } from '../middleware/validation.middleware';
import { auditValidators } from '../utils/validators';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All audit routes require authentication
router.use(authMiddleware);

/**
 * GET /audit
 * List audit logs with filtering and pagination
 */
router.get(
  '/',
  validateQuery(auditValidators.list),
  listAuditController
);

export default router;

