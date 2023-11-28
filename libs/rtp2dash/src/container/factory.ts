import { Mp4Transcoder, Mp4TranscoderProps } from "./mp4";
import { WebmTranscoder, WebmTranscoderProps } from "./webm";

export const containerTranscoderFactory = (
  kind: "webm" | "mp4",
  props: WebmTranscoderProps | Mp4TranscoderProps
) => {
  switch (kind) {
    case "webm":
      return new WebmTranscoder(props as WebmTranscoderProps);
    case "mp4":
      return new Mp4Transcoder(props as Mp4TranscoderProps);
    default:
      throw new Error(`unknown container kind: ${kind}`);
  }
};
