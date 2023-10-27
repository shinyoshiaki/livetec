import { RTCRtpCodecParameters } from "werift";

export const h264 = new RTCRtpCodecParameters({
  mimeType: "video/H264",
  clockRate: 90000,
  rtcpFeedback: [
    { type: "nack" },
    { type: "nack", parameter: "pli" },
    { type: "goog-remb" },
  ],
});

export const opus = new RTCRtpCodecParameters({
  mimeType: "audio/opus",
  clockRate: 48000,
  channels: 2,
});
