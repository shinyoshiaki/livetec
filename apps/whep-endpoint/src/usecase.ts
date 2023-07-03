import { sessionRepository } from "./dependencies";

export const createSession = async (sdp: string) => {
  const session = sessionRepository.createSession([]);
  const { answer } = await session.setRemoteOffer(sdp);
  return { answer };
};
