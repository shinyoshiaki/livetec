import { WhepMediaSession, MediaStreamTrack } from ".";

export class SessionRepository {
  sessions = new Map<string, WhepMediaSession>();

  createSession(tracks: MediaStreamTrack[]) {
    const session = new WhepMediaSession({ tracks });
    this.sessions.set(session.id, session);
    return session;
  }
}
