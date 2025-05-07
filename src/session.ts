import { randomBytes } from 'node:crypto';

interface Session {
  id: string;
  userId?: string | number;
  createdAt: Date;
  expiresAt: Date;
  data: Record<string, any>;
}

class SessionManager {
  private sessions = new Map<string, Session>();

  createSession(userId?: string, duration = 24 * 60 * 60 * 1000 /* 24h */) {
    const session: Session = {
      id: randomBytes(32).toString('hex'),
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + duration),
      data: {}
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string) {
    const session = this.sessions.get(id);
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      this.sessions.delete(id);
      return null;
    }
    return session;
  }

  // Add more session management methods as needed
}

let currentSession: SessionManager;
export const useSession = () => {
  if (!currentSession) {
    currentSession = new SessionManager();
  }
  return currentSession;
}
