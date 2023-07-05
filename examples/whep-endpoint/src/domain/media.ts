import { MediaStreamTrack, getUserMedia } from "werift";

export class MediaSource {
  audio!: MediaStreamTrack;
  video!: MediaStreamTrack;

  async setup() {
    const player = await getUserMedia("~/Downloads/test.mp4", true);
    this.audio = player.audio;
    this.video = player.video;
    await player.start();
  }
}
