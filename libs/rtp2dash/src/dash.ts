import Event from "rx.mini";
import { WebmOutput } from "werift-rtp";
import { MPD } from "./mpd";

export interface DashTranscoderProps {
  dashCodecs?: string[];
}

export class DashTranscoder {
  timestamp = 0;
  number = -1;
  mpd: MPD;
  onOutput = new Event<
    [{ filename: string; data: Buffer; operation: "append" | "write" }]
  >();

  constructor(props: DashTranscoderProps = {}) {
    const codecs = props.dashCodecs ?? ["vp8", "opus"];

    this.mpd = new MPD({
      codecs,
      minBufferTime: 5,
      minimumUpdatePeriod: 1,
    });
  }

  input({ saveToFile, kind, previousDuration }: WebmOutput) {
    if (saveToFile && kind) {
      switch (kind) {
        case "initial":
          {
            this.onOutput.execute({
              filename: "init.webm",
              data: saveToFile,
              operation: "write",
            });
          }
          break;
        case "cluster":
          {
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
              filename: `media${this.number}.webm`,
              data: saveToFile,
              operation: "write",
            });
          }
          break;
        case "block":
          {
            this.onOutput.execute({
              filename: `media${this.number}.webm`,
              data: saveToFile,
              operation: "append",
            });
          }
          break;
      }
    }
  }
}
