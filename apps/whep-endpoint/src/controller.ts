import Ajv from "ajv";
import { FastifyRequest, FastifyReply } from "fastify";
import { OfferRequestBody, OfferResponseBody, offerRequestBody } from ".";
import { createSession } from "./usecase";

const ajv = new Ajv();

const checkOfferRequestBody = ajv.compile(offerRequestBody);

export async function offer(
  req: FastifyRequest<{
    Body: OfferRequestBody;
    Headers: { [key: string]: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    checkOfferRequestBody(req.body);

    const offer = req.body;
    const { answer } = await createSession(offer);

    const responseBody: OfferResponseBody = answer;

    await reply.code(200).send(responseBody);
  } catch (error) {
    await reply.code(500).send({ error });
  }
}
