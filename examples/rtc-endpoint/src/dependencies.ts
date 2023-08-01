import { WhipSource } from "./domain/whip";
import { SessionRepository } from "./infrastructure/sessionRepository";
import { WhepUsecase } from "./usecase/whep";
import { WhipUsecase } from "./usecase/whip";

export const sessionRepository = new SessionRepository();
export const whipSource = new WhipSource();

export async function setup() {}

export const whepUsecase = new WhepUsecase();
export const whipUsecase = new WhipUsecase();
