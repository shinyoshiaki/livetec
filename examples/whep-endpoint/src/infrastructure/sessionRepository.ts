import { WhepMediaSession, MediaStreamTrack, RTCRtpCodecParameters } from "..";

export class SessionRepository {
  private sessions = new Map<string, WhepMediaSession>();

  createSession(tracks: MediaStreamTrack[]) {
    const session = new WhepMediaSession({
      tracks,
      config: {
        codecs: {
          video: [
            new RTCRtpCodecParameters({
              mimeType: "video/H264",
              clockRate: 90000,
              rtcpFeedback: [
                { type: "nack" },
                { type: "nack", parameter: "pli" },
                { type: "goog-remb" },
              ],
            }),
          ],
          audio: [
            new RTCRtpCodecParameters({
              mimeType: "audio/opus",
              clockRate: 48000,
              channels: 2,
            }),
          ],
        },
      },
    });
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string) {
    return this.sessions.get(id);
  }
}
