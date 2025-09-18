import { Request, Response } from 'express'
import { Connection, Client } from '@temporalio/client'
import { verifyEmailWorkflow } from '../../workflows'
import prisma from '../../database/prisma'

export const verifyEmails = async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body is required and must be valid JSON' })
  }

  const { leadIds } = req.body as { leadIds?: number[] }

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'leadIds must be a non-empty array' })
  }

  try {
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds.map((id) => Number(id)) } },
    })

    if (leads.length === 0) {
      return res.status(404).json({ error: 'No leads found with the provided IDs' })
    }

    const connection = await Connection.connect({ address: 'localhost:7233' })
    const client = new Client({ connection, namespace: 'default' })

    let verifiedCount = 0
    const results: Array<{ leadId: number; emailVerified: boolean }> = []
    const errors: Array<{ leadId: number; leadName: string; error: string }> = []

    for (const lead of leads) {
      try {
        const isVerified = await client.workflow.execute(verifyEmailWorkflow, {
          taskQueue: 'myQueue',
          workflowId: `verify-email-${lead.id}-${Date.now()}`,
          args: [lead.email],
        })

        await prisma.lead.update({
          where: { id: lead.id },
          data: { emailVerified: Boolean(isVerified) },
        })

        results.push({ leadId: lead.id, emailVerified: isVerified })
        verifiedCount += 1
      } catch (error) {
        errors.push({
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName}`.trim(),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    await connection.close()

    res.json({ success: true, verifiedCount, results, errors })
  } catch (error) {
    console.error('Error verifying emails:', error)
    res.status(500).json({ error: 'Failed to verify emails' })
  }
}
