import { whepSession, whipSession } from "..";

export class WhipSource {
  audio!: whepSession.MediaStreamTrack;
  video: whepSession.MediaStreamTrack[] = [];
  session!: whipSession.WhipMediaSession;

  setup(session: whipSession.WhipMediaSession) {
    this.audio = undefined as any;
    this.video = [];

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
