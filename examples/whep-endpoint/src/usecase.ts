import { mediaSource, sessionRepository } from "./dependencies";

export const createSession = async (sdp: string) => {
  const session = sessionRepository.createSession({
    video: [mediaSource.video],
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
  const session = sessionRepository.getSession(id);
  if (!session) {
    throw new Error("session not found");
  }

  session.requestEvent(events);
};

export const startSSEStream = ({ id }: { id: string }) => {
  const session = sessionRepository.getSession(id);
  if (!session) {
    throw new Error("session not found");
  }

  return {
    event: session.event,
    startEvent: session.streamEvent,
  };
};
