import { mediaSource, sessionRepository } from "./dependencies";
import { RequestLayer } from ".";

export const createSession = async (sdp: string) => {
  console.log("createSession");

  const session = sessionRepository.createSession({
    video: mediaSource.video,
    audio: mediaSource.audio,
  });
  const { answer, etag } = await session.setRemoteOffer(sdp);
  return { answer, etag, id: session.id };
};

export const iceRequest = async ({
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

export const requestSSE = ({
  events,
  id,
}: {
  events: string[];
  id: string;
}) => {
  console.log("requestSSE", { events, id });

  const session = sessionRepository.getSession(id);
  if (!session) {
    throw new Error("session not found");
  }

  session.requestEvent(events);
};

export const startSSEStream = ({ id }: { id: string }) => {
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

export const requestLayer = ({
  id,
  request,
}: {
  id: string;
  request: RequestLayer;
}) => {
  console.log("requestLayer", { id, request });

  const session = sessionRepository.getSession(id);
  if (!session) {
    throw new Error("session not found");
  }
  session.requestLayer(request);
};
