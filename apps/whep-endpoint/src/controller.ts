import Ajv from "ajv";
import { FastifyRequest, FastifyReply } from "fastify";
import {
  OfferRequestBody,
  OfferResponseBody,
  acceptPatch,
  buildLink,
  ianaLayer,
  ianaSSE,
  offerRequestBody,
  responseHeaders,
} from ".";
import { createSession } from "./usecase";
import { config } from "./config";

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
    const { answer, etag, id } = await createSession(offer);

    const responseBody: OfferResponseBody = answer;

    const location = `${config.endpoint}/resource/${id}`;

    await reply
      .code(201)
      .header(responseHeaders.acceptPatch, acceptPatch.trickleIce)
      .header(responseHeaders.etag, etag)
      .header(responseHeaders.location, location)
      .header(
        responseHeaders.link,
        buildLink([
          {
            link: `${location}/sse`,
            rel: ianaSSE,
          },
          {
            link: `${location}/layer`,
            rel: ianaLayer,
          },
        ])
      )
      .send(responseBody);
  } catch (error) {
    await reply.code(500).send({ error });
  }
}
