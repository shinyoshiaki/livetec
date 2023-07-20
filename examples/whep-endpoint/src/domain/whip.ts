import { whepSession, whipSession } from "..";

export class WhipSource {
  audio!: whepSession.MediaStreamTrack;
  video: whepSession.MediaStreamTrack[] = [];
  session!: whipSession.WhepMediaSession;

  setup(session: whipSession.WhepMediaSession) {
    this.session = session;
    session.onTrack.subscribe((track) => {
      if (track.kind === "audio") {
        this.audio = track;
      } else {
        this.video.push(track);
      }
    });
  }
}
