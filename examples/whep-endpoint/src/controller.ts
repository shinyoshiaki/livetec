import Ajv from "ajv";
import { FastifyRequest, FastifyReply } from "fastify";
import {
  OfferRequestBody,
  OfferResponseBody,
  ResourceParam,
  ResourceRequestBody,
  acceptPatch,
  buildLink,
  ianaLayer,
  ianaSSE,
  offerRequestBody,
  resourceRequestBody,
  responseHeaders,
} from ".";
import { createSession, iceRequest } from "./usecase";
import { config } from "./config";

const ajv = new Ajv();

const checkOfferRequestBody = ajv.compile(offerRequestBody);

export async function offer(
  req: FastifyRequest<{
    Body: OfferRequestBody;
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
      .headers({
        [responseHeaders.acceptPatch]: acceptPatch.trickleIce,
        [responseHeaders.etag]: etag,
        [responseHeaders.location]: location,
        [responseHeaders.link]: buildLink([
          {
            link: `${location}/sse`,
            rel: ianaSSE,
          },
          {
            link: `${location}/layer`,
            rel: ianaLayer,
          },
        ]),
      })
      // .header(responseHeaders.acceptPatch, acceptPatch.trickleIce)
      // .header(responseHeaders.etag, etag)
      // .header(responseHeaders.location, location)
      // .header(
      //   responseHeaders.link,
      //   buildLink([
      //     {
      //       link: `${location}/sse`,
      //       rel: ianaSSE,
      //     },
      //     {
      //       link: `${location}/layer`,
      //       rel: ianaLayer,
      //     },
      //   ])
      // )
      .send(responseBody);
  } catch (error) {
    await reply.code(500).send({ error });
  }
}

const checkResourceRequestBody = ajv.compile(resourceRequestBody);

export async function resource(
  req: FastifyRequest<{
    Body: ResourceRequestBody;
    Headers: ResourceParam;
    Params: ResourceParam;
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    checkResourceRequestBody(req.body);

    const candidate = req.body;
    const { id } = req.params;
    const etag = req.headers["IF-Match"];
    await iceRequest({ candidate, etag, id });

    await reply.code(204).send();
  } catch (error) {
    await reply.code(500).send({ error });
  }
}
