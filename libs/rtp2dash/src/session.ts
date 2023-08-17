import { WebmTranscoder, WebmTranscoderProps } from "./webm";
import { DashTranscoder } from "./dash";

export type Rtp2DashProps = WebmTranscoderProps;

export class Rtp2Dash {
  webm: WebmTranscoder;
  dash: DashTranscoder;

  constructor(props: Rtp2DashProps) {
    this.webm = new WebmTranscoder(props);
    this.dash = new DashTranscoder();

    this.webm.onOutput.subscribe((output) => {
      this.dash.input(output);
    });
  }
}
