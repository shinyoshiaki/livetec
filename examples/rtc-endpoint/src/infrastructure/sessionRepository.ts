import { whepSession } from "..";

export class SessionRepository {
  private sessions = new Map<string, whepSession.WhepMediaSession>();

  createSession({
    video,
    audio,
  }: {
    video?: whepSession.MediaStreamTrack[];
    audio?: whepSession.MediaStreamTrack;
  }) {
    const session = new whepSession.WhepMediaSession({
      video,
      audio,
      config: {
        codecs: {
          video: [
            new whepSession.RTCRtpCodecParameters({
              mimeType: "video/h264",
              clockRate: 90000,
              rtcpFeedback: [
                { type: "nack" },
                { type: "nack", parameter: "pli" },
                { type: "goog-remb" },
              ],
              parameters:
                "profile-level-id=42e01f;packetization-mode=1;level-asymmetry-allowed=1",
            }),
          ],
          audio: [
            new whepSession.RTCRtpCodecParameters({
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
