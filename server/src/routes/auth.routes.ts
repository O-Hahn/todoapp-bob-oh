import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { Config } from '../config.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../schemas/index.js';

export function createAuthRoutes(
  authService: AuthService,
  config: Config,
): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
    // Cookie options
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: config.COOKIE_SECURE,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    };

    fastify.post(
      '/register',
      {
        config: {
          rateLimit: {
            max: 10,
            timeWindow: '1 minute',
          },
        },
      },
      async (request, reply) => {
        const parsed = registerSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: parsed.error.issues[0].message,
          });
        }

        try {
          const user = await authService.register(
            parsed.data.email,
            parsed.data.password,
          );
          const loginRes = await authService.login(
            parsed.data.email,
            parsed.data.password,
          );

          reply.setCookie('session_token', loginRes.sessionToken, cookieOptions);
          return reply.status(201).send({ user });
        } catch (err: any) {
          if (err.statusCode === 409) {
            return reply.status(409).send({
              error: 'EMAIL_EXISTS',
              message: 'An account with this email address already exists',
            });
          }
          request.log.error(err, 'Registration error');
          return reply.status(500).send({
            error: 'INTERNAL_ERROR',
            message: 'Unable to complete registration',
          });
        }
      },
    );

    fastify.post(
      '/login',
      {
        config: {
          rateLimit: {
            max: 15,
            timeWindow: '1 minute',
          },
        },
      },
      async (request, reply) => {
        const parsed = loginSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: parsed.error.issues[0].message,
          });
        }

        try {
          const res = await authService.login(
            parsed.data.email,
            parsed.data.password,
          );
          reply.setCookie('session_token', res.sessionToken, cookieOptions);
          return reply.send({ user: res.user });
        } catch (err: any) {
          if (err.statusCode === 401) {
            return reply.status(401).send({
              error: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            });
          }
          request.log.error(err, 'Login error');
          return reply.status(500).send({
            error: 'INTERNAL_ERROR',
            message: 'Unable to complete login',
          });
        }
      },
    );

    fastify.post('/logout', async (request, reply) => {
      const token = request.cookies.session_token;
      if (token) {
        await authService.logout(token);
      }
      reply.clearCookie('session_token', { path: '/' });
      return reply.send({ message: 'Logged out successfully' });
    });

    fastify.get(
      '/me',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        return reply.send({ user: request.user });
      },
    );

    fastify.post(
      '/change-password',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const parsed = changePasswordSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: parsed.error.issues[0].message,
          });
        }

        try {
          const updatedUser = await authService.changePassword(
            request.user!.id,
            parsed.data.currentPassword,
            parsed.data.newPassword,
          );
          // Re-login after password change
          const newSession = await authService.login(
            updatedUser.email,
            parsed.data.newPassword,
          );
          reply.setCookie(
            'session_token',
            newSession.sessionToken,
            cookieOptions,
          );

          return reply.send({
            message: 'Password changed successfully',
            user: updatedUser,
          });
        } catch (err: any) {
          if (err.statusCode === 400) {
            return reply.status(400).send({
              error: 'INVALID_CURRENT_PASSWORD',
              message: 'Current password does not match',
            });
          }
          request.log.error(err, 'Change password error');
          return reply.status(500).send({
            error: 'INTERNAL_ERROR',
            message: 'Unable to change password',
          });
        }
      },
    );
  };
}
