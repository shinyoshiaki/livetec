import { MediaStreamTrack, getUserMedia } from "werift";

export class MediaSource {
  audio!: MediaStreamTrack;
  video: MediaStreamTrack[] = [];

  async setup() {
    const high = await getUserMedia({
      path: "~/Downloads/test.mp4",
      loop: true,
    });
    this.audio = high.audio;
    await high.start();

    // const low = await getUserMedia({
    //   path: "~/Downloads/test.mp4",
    //   loop: true,
    //   width: 320,
    //   height: 240,
    // });
    this.video = [
      high.video,
      //  low.video
    ];
  }
}
