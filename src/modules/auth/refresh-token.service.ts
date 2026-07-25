import { prisma } from '../../config/database.config';
import crypto from 'crypto';

export const RefreshTokenService = {
  /**
   * Hashes a plain string token using SHA-256
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  /**
   * Creates a new refresh token record in the database
   */
  async createToken(userId: string, tokenString: string, expiresInDays: number = 7) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const tokenHash = this.hashToken(tokenString);

    return prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  },

  /**
   * Finds a refresh token by its plain string value
   */
  async findToken(tokenString: string) {
    const tokenHash = this.hashToken(tokenString);
    return prisma.refreshToken.findFirst({
      where: { tokenHash },
    });
  },

  /**
   * Marks a refresh token as revoked
   */
  async revokeToken(tokenId: string) {
    return prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revoked: true },
    });
  },

  /**
   * Revokes all refresh tokens for a given user
   */
  async revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  },

  /**
   * Validates if a refresh token is valid (exists, not expired, not revoked)
   */
  isValid(tokenRecord: { expiresAt: Date; revoked: boolean } | null): boolean {
    if (!tokenRecord) return false;
    if (tokenRecord.revoked) return false;
    if (new Date() > tokenRecord.expiresAt) return false;
    return true;
  },

  /**
   * Increments the user's tokenVersion
   */
  async incrementTokenVersion(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }
};
