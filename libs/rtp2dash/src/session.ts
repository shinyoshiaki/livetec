import { SupportedCodec } from "werift-rtp";

export class Rtp2Dash {
  constructor(props: { video?: VideoCodec; audio?: AudioCodec }) {}
}

export type VideoCodec = Exclude<SupportedCodec, "OPUS">;
export type AudioCodec = "OPUS";
