// Shared token store for magic link authentication
// In production, this should be replaced with Redis or a database

class TokenStore {
  private activeTokens = new Set<string>();
  private invalidatedSessionTokens = new Set<string>();

  addToken(token: string): void {
    this.activeTokens.add(token);
  }

  hasToken(token: string): boolean {
    return this.activeTokens.has(token);
  }

  removeToken(token: string): void {
    this.activeTokens.delete(token);
  }

  // Session token management
  invalidateSessionToken(token: string): void {
    this.invalidatedSessionTokens.add(token);
  }

  isSessionTokenInvalid(token: string): boolean {
    return this.invalidatedSessionTokens.has(token);
  }

  // Clean up expired tokens (call this periodically)
  cleanup(): void {
    // In a real implementation, you'd check token expiration here
    // For now, we rely on JWT expiration
  }
}

// Export singleton instance
export const tokenStore = new TokenStore();



