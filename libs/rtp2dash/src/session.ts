import { ContainerTranscoder } from "./container/base";
import { containerTranscoderFactory } from "./container/factory";
import { WebmTranscoderProps } from "./container/webm";
import { DashTranscoder, DashTranscoderProps } from "./dash";
import Event from "rx.mini";

export type Rtp2DashProps = DashTranscoderProps & {
  container: "webm" | "mp4";
} & (WebmTranscoderProps | {});

export class Rtp2Dash {
  container: ContainerTranscoder;
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
    this.container = containerTranscoderFactory(
      this.props.container,
      this.props as any
    );

    this.dash = new DashTranscoder(this.props);
    this.container.onOutput.subscribe((output) => {
      this.dash.input(output);
    });
    this.dash.onOutput.subscribe((o) => this.onOutput.execute(o));

    this.container.start();
  }
}
