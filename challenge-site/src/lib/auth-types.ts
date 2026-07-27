export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  verifierId: string;
  profileImage?: string | null;
}
