import { Router } from 'express'
import {
  createLead,
  getLeadById,
  getAllLeads,
  updateLead,
  deleteLead,
  deleteManyLeads,
  generateMessages,
  bulkImportLeads,
  verifyEmails,
} from '../controllers/leads'

const router = Router()

// Lead CRUD operations
router.post('/', createLead)
router.get('/:id', getLeadById)
router.get('/', getAllLeads)
router.patch('/:id', updateLead)
router.delete('/:id', deleteLead)
router.delete('/', deleteManyLeads)

// Lead operations
router.post('/generate-messages', generateMessages)
router.post('/bulk', bulkImportLeads)
router.post('/verify-emails', verifyEmails)

export default router
