import { AudioTranscoder, VideoTranscoder } from "./container/base";
import { Mp4Audio, Mp4TranscoderProps, Mp4Video } from "./container/mp4";
import { DashTranscoder } from "./dash";
import Event from "rx.mini";
import { AdaptionConfig } from "./mpd";

export type Rtp2DashProps = {
  codecs?: AdaptionConfig[];
  container: Mp4TranscoderProps & { format: "mp4" };
  basePath: string;
};

export class Rtp2Dash {
  audio: AudioTranscoder;
  video: VideoTranscoder;
  dash: DashTranscoder;
  onOutput = new Event<
    [
      {
        filename: string;
        data: Buffer;
        operation: "append" | "write";
      }
    ]
  >();

  constructor(private props: Rtp2DashProps) {}

  start() {
    this.audio = new Mp4Audio(this.props.container);
    this.video = new Mp4Video(this.props.container);

    this.dash = new DashTranscoder({
      ...this.props,
      container: this.props.container.format,
      basePath: this.props.basePath,
    });
    const videoIndex = this.dash.mpd.adaptions.findIndex((c) =>
      c.mimeType.includes("video")
    );
    this.video.onOutput.subscribe((output) => {
      this.dash.input({ ...output, index: videoIndex });
    });
    const audioIndex = this.dash.mpd.adaptions.findIndex((c) =>
      c.mimeType.includes("audio")
    );
    this.audio.onOutput.subscribe((output) => {
      this.dash.input({ ...output, index: audioIndex });
    });

    this.dash.onOutput.subscribe((o) => {
      this.onOutput.execute(o);
    });

    this.audio.start();
    this.video.start();
  }
}
