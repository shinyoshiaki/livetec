import { sessionRepository } from "./dependencies";

export const createSession = async (sdp: string) => {
  const session = sessionRepository.createSession([]);
  const { answer, etag } = await session.setRemoteOffer(sdp);
  return { answer, etag, id: session.id };
};
