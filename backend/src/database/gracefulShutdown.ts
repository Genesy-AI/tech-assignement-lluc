import prisma from './prisma'

export const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...')
  
  try {
    await prisma.$disconnect()
    console.log('Database connection closed')
  } catch (error) {
    console.error('Error during database disconnection:', error)
  }
  
  process.exit(0)
}

// Handle graceful shutdown
process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)
