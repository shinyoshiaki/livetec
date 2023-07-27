import { whipSource, sessionRepository } from "../dependencies";
import { whepSession } from "..";

export class WhepUsecase {
  createSession = async (sdp: string) => {
    console.log("createSession");

    const session = sessionRepository.createSession({
      video: whipSource.video,
      audio: whipSource.audio,
    });
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

    const session = sessionRepository.getSession(id);
    if (!session) {
      throw new Error("session not found");
    }

    await session.iceRequest({ etag, candidate });
  };

  requestSSE = ({ events, id }: { events: string[]; id: string }) => {
    console.log("requestSSE", { events, id });

    const session = sessionRepository.getSession(id);
    if (!session) {
      throw new Error("session not found");
    }

    session.requestEvent(events);
  };

  startSSEStream = ({ id }: { id: string }) => {
    console.log("startSSEStream", { id });

    const session = sessionRepository.getSession(id);
    if (!session) {
      throw new Error("session not found");
    }

    return {
      event: session.event,
      startEvent: session.streamEvent,
    };
  };

  requestLayer = ({
    id,
    request,
  }: {
    id: string;
    request: whepSession.RequestLayer;
  }) => {
    console.log("requestLayer", { id, request });

    const session = sessionRepository.getSession(id);
    if (!session) {
      throw new Error("session not found");
    }
    session.requestLayer(request);
  };
}
