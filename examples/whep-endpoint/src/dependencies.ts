import { MediaSource } from "./domain/media";
import { SessionRepository } from "./infrastructure/sessionRepository";

export const sessionRepository = new SessionRepository();
export const mediaSource = new MediaSource();

export async function setup() {
  await mediaSource.setup();
}
