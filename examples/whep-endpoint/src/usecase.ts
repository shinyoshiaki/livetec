import { sessionRepository } from "./dependencies";

export const createSession = async (sdp: string) => {
  const session = sessionRepository.createSession([]);
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
  const session = sessionRepository.sessions.get(id);
  if (!session) {
    throw new Error("session not found");
  }

  await session.iceRequest({ etag, candidate });
};
