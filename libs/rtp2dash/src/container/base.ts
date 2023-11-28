import Event from "rx.mini";
import { RtcpPacket, RtpPacket } from "werift-rtp";

export interface ContainerTranscoder {
  onOutput: Event<[ContainerOutput]>;
  start(): void;
  inputAudioRtp(packet: RtpPacket): void;
  inputAudioRtcp(packet: RtcpPacket): void;
  inputVideoRtp(packet: RtpPacket): void;
  inputVideoRtcp(packet: RtcpPacket): void;
}

export interface ContainerOutput {
  operation: "write" | "append";
  init?: Buffer;
  chunk?: Buffer;
  previousDuration?: number;
}
