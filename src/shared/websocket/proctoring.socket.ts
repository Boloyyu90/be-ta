// src/shared/websocket/proctoring.socket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { env } from '@/config/env';
import { verifyAccessToken } from '@/shared/utils/jwt';
import { logger } from '@/shared/utils/logger';
import { getFaceAnalyzer } from '@/features/proctoring/ml/analyzer.factory';
import { prisma } from '@/config/database';

export const initializeProctoringSocket = (httpServer: Server) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN || '*',
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  // Namespace untuk proctoring
  const proctoringNamespace = io.of('/proctoring');

  // Authentication middleware
  proctoringNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.userRole = payload.role;

      logger.info({ userId: payload.userId }, 'Proctoring socket authenticated');
      next();
    } catch (error) {
      logger.error({ error }, 'Socket authentication failed');
      next(new Error('Invalid token'));
    }
  });

  proctoringNamespace.on('connection', (socket) => {
    const userId = socket.data.userId;
    logger.info({ userId, socketId: socket.id }, 'Client connected to proctoring');

    // Join room berdasarkan exam session
    socket.on('join-exam', async (data: { userExamId: number }) => {
      try {
        const { userExamId } = data;

        // Verify user owns this exam session
        const userExam = await prisma.userExam.findUnique({
          where: { id: userExamId },
          select: { userId: true, status: true },
        });

        if (!userExam || userExam.userId !== userId) {
          socket.emit('error', { message: 'Unauthorized exam session' });
          return;
        }

        if (userExam.status !== 'IN_PROGRESS') {
          socket.emit('error', { message: 'Exam is not in progress' });
          return;
        }

        // Join room
        const roomName = `exam-${userExamId}`;
        await socket.join(roomName);

        logger.info({ userId, userExamId, roomName }, 'User joined exam room');

        socket.emit('joined', {
          userExamId,
          message: 'Connected to proctoring'
        });

      } catch (error) {
        logger.error({ error, userId }, 'Failed to join exam');
        socket.emit('error', { message: 'Failed to join exam session' });
      }
    });

    // Handle frame analysis
    socket.on('analyze-frame', async (data: {
      userExamId: number;
      imageBase64: string;
      timestamp: number;
    }) => {
      const startTime = Date.now();

      try {
        const { userExamId, imageBase64, timestamp } = data;

        // Verify ownership
        const userExam = await prisma.userExam.findUnique({
          where: { id: userExamId },
          select: { userId: true, status: true },
        });

        if (!userExam || userExam.userId !== userId) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        // Analyze face
        const analyzer = getFaceAnalyzer();
        const analysis = await analyzer.analyze(imageBase64);

        // Log violations
        const hasViolations = analysis.violations.some(
          v => v !== 'FACE_DETECTED'
        );

        if (hasViolations) {
          const eventType = analysis.violations[0]; // Primary violation

          await prisma.proctoringEvent.create({
            data: {
              userExamId,
              eventType: eventType as any,
              severity: determineSeverity(eventType),
              metadata: {
                confidence: analysis.confidence,
                violations: analysis.violations,
                clientTimestamp: timestamp,
                processingTimeMs: Date.now() - startTime,
              },
            },
          });
        }

        // Send result back to client
        socket.emit('analysis-result', {
          userExamId,
          timestamp,
          analysis: {
            status: analysis.status,
            violations: analysis.violations,
            confidence: analysis.confidence,
            message: analysis.message,
          },
          hasViolations,
          processingTimeMs: Date.now() - startTime,
        });

        logger.debug({
          userId,
          userExamId,
          hasViolations,
          processingTimeMs: Date.now() - startTime,
        }, 'Frame analyzed');

      } catch (error) {
        logger.error({ error, userId }, 'Frame analysis failed');
        socket.emit('analysis-error', {
          message: 'Analysis failed',
          timestamp: data.timestamp,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, 'Client disconnected');
    });
  });

  return io;
};

// Helper function
const determineSeverity = (violation: string): string => {
  switch (violation) {
    case 'NO_FACE_DETECTED':
    case 'MULTIPLE_FACES':
      return 'HIGH';
    case 'LOOKING_AWAY':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
};