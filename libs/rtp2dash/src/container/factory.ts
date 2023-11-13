import { WebmTranscoder, WebmTranscoderProps } from "./webm";

export const containerTranscoderFactory = (
  kind: "webm" | "mp4",
  props: WebmTranscoderProps
) => {
  switch (kind) {
    case "webm":
      return new WebmTranscoder(props);

    default:
      throw new Error(`unknown container kind: ${kind}`);
  }
};
