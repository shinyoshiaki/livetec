import Event from "rx.mini";
import { RtcpPacket, RtpPacket } from "werift-rtp";

export interface AudioTranscoder {
  onOutput: Event<[ContainerOutput]>;
  start(): void;
  inputRtp(packet: RtpPacket): void;
  inputRtcp(packet: RtcpPacket): void;
}

export interface VideoTranscoder {
  onOutput: Event<[ContainerOutput]>;
  start(): void;
  inputRtp(packet: RtpPacket): void;
  inputRtcp(packet: RtcpPacket): void;
}

export interface ContainerOutput {
  operation: "write" | "append";
  init?: Buffer;
  chunk?: Buffer;
  previousDuration?: number;
}
