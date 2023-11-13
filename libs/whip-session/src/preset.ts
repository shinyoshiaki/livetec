import { RTCRtpCodecParameters } from "werift";

export const h264 = new RTCRtpCodecParameters({
  mimeType: "video/h264",
  clockRate: 90000,
  rtcpFeedback: [
    { type: "nack" },
    { type: "nack", parameter: "pli" },
    { type: "goog-remb" },
  ],
  parameters:
    "profile-level-id=42e01f;packetization-mode=1;level-asymmetry-allowed=1",
});

export const opus = new RTCRtpCodecParameters({
  mimeType: "audio/opus",
  clockRate: 48000,
  channels: 2,
});
