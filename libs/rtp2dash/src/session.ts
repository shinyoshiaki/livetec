import { WebmTranscoder, WebmTranscoderProps } from "./webm";
import { DashTranscoder } from "./dash";
import Event from "rx.mini";

export type Rtp2DashProps = WebmTranscoderProps;

export class Rtp2Dash {
  webm: WebmTranscoder;
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

  constructor(private props: Rtp2DashProps = {}) {}

  start() {
    this.webm = new WebmTranscoder(this.props);
    this.dash = new DashTranscoder();
    this.webm.onOutput.subscribe((output) => {
      this.dash.input(output);
    });
    this.dash.onOutput.subscribe((o) => this.onOutput.execute(o));

    this.webm.start();
  }
}
