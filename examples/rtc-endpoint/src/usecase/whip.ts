import { whipSession } from "..";
import { RTCRtpCodecParameters } from "../../../../libs/whep-session/src";
import { whipSource } from "../dependencies";

export class WhipUsecase {
  createSession = async (sdp: string) => {
    console.log("createSession");

    const session = new whipSession.WhipMediaSession({
      codecs: {
        video: [
          new RTCRtpCodecParameters({
            mimeType: "video/h264",
            clockRate: 90000,
            rtcpFeedback: [
              { type: "nack" },
              { type: "nack", parameter: "pli" },
              { type: "goog-remb" },
            ],
            parameters:
              "profile-level-id=42e01f;packetization-mode=1;level-asymmetry-allowed=1",
          }),
        ],
        audio: [
          new RTCRtpCodecParameters({
            mimeType: "audio/opus",
            clockRate: 48000,
            channels: 2,
          }),
        ],
      },
    });
    whipSource.setup(session);

    const { answer, etag } = await session.setRemoteOffer(sdp);
    return { answer, etag, id: session.id };
  };

  iceRequest = async ({
    id,
    etag,
    candidate,
  }: {
    id: string;
    etag: string;
    candidate: string;
  }) => {
    console.log("iceRequest", { id, etag });

    const session = whipSource.session;
    if (!session) {
      throw new Error("session not found");
    }

    await session.iceRequest({ etag, candidate });
  };
}
