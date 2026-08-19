import type {
  PBLSession,
  SessionEvent,
  PBLEventType,
} from '../../../types/pbl';

export type PBLEventListener = (event: SessionEvent) => void;

export class PBLSessionManager {
  private currentSession: PBLSession | null = null;
  private listeners: Map<PBLEventType | '*', Set<PBLEventListener>> = new Map();

  public getCurrentSession(): PBLSession | null {
    return this.currentSession;
  }

  public setSession(session: PBLSession | null): void {
    this.currentSession = session;
  }

  public subscribe(eventType: PBLEventType | '*', listener: PBLEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  public emit(eventType: PBLEventType, payload: Record<string, any>): void {
    if (!this.currentSession) return;

    const event: SessionEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventType,
      sessionId: this.currentSession.sessionId,
      userId: this.currentSession.userId,
      competencyRef: this.currentSession.currentCompetencyRef,
      questionRef: this.currentSession.currentQuestionRef,
      timestamp: new Date().toISOString(),
      payload,
    };

    // Notify specific listeners
    this.listeners.get(eventType)?.forEach((fn) => fn(event));
    // Notify wildcard listeners
    this.listeners.get('*')?.forEach((fn) => fn(event));
  }
}

export const pblSessionManager = new PBLSessionManager();
