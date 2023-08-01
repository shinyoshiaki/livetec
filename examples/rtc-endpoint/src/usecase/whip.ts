import { whipSession } from "..";
import { whipSource } from "../dependencies";

export class WhipUsecase {
  createSession = async (sdp: string) => {
    console.log("createSession");

    const session = new whipSession.WhepMediaSession();
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
