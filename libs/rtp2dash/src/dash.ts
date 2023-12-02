import Event from "rx.mini";
import { AdaptionConfig, MPD } from "./mpd";
import { ContainerOutput } from "./container/base";

export interface DashTranscoderProps {
  codecs?: AdaptionConfig[];
  container: "mp4";
}

export class DashTranscoder {
  timestamp = 0;
  number = -1;
  mpd: MPD;
  onOutput = new Event<
    [{ filename: string; data: Buffer; operation: "append" | "write" }]
  >();

  constructor(private props: DashTranscoderProps) {
    const codecs = props.codecs;

    this.mpd = new MPD({
      adaptions: codecs,
      minBufferTime: 5,
      minimumUpdatePeriod: 1,
    });
  }

  input({
    init,
    chunk,
    operation,
    previousDuration,
    index,
  }: ContainerOutput & { index: number }) {
    if (init) {
      this.onOutput.execute({
        filename: this.mpd.getInit(index),
        data: init,
        operation: "write",
      });
    }

    if (chunk) {
      if (operation === "write") {
        if (previousDuration! > 0) {
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
          filename: this.mpd.getMedia({
            adaption: index,
            current: this.number,
          }),
          data: chunk,
          operation: "write",
        });
      } else if (operation === "append") {
        if (this.number < 0) {
          return;
        }
        this.onOutput.execute({
          filename: this.mpd.getMedia({
            adaption: index,
            current: this.number,
          }),
          data: chunk,
          operation: "append",
        });
      }
    }
  }
}
