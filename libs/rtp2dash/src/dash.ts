import Event from "rx.mini";
import { MPD } from "./mpd";
import { ContainerOutput } from "./container/base";

export interface DashTranscoderProps {
  dashCodecs?: string[];
  container: "webm" | "mp4";
}

export class DashTranscoder {
  timestamp = 0;
  number = -1;
  mpd: MPD;
  onOutput = new Event<
    [{ filename: string; data: Buffer; operation: "append" | "write" }]
  >();

  constructor(private props: DashTranscoderProps) {
    const codecs = props.dashCodecs ?? ["vp8", "opus"];

    this.mpd = new MPD({
      codecs,
      minBufferTime: 5,
      minimumUpdatePeriod: 1,
    });
  }

  input({ init, chunk, operation, previousDuration }: ContainerOutput) {
    if (init) {
      this.onOutput.execute({
        filename: "init." + this.props.container,
        data: init,
        operation: "write",
      });
    }

    if (chunk) {
      if (operation === "write") {
        if (previousDuration! > 0) {
          // MPDにクラスターの長さを書き込む
          this.mpd.segmentationTimeLine.push({
            d: previousDuration!,
            t: this.timestamp,
          });
          this.onOutput.execute({
            filename: "dash.mpd",
            data: Buffer.from(this.mpd.build()),
            operation: "write",
          });

          this.timestamp += previousDuration!;
        }

        this.number++;
        this.onOutput.execute({
          filename: `media${this.number}.${this.props.container}`,
          data: chunk,
          operation: "write",
        });
      } else if (operation === "append") {
        if (this.number < 0) {
          return;
        }
        this.onOutput.execute({
          filename: `media${this.number}.${this.props.container}`,
          data: chunk,
          operation: "append",
        });
      }
    }
  }
}
