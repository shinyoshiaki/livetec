import Ajv from "ajv";
import { FastifyRequest, FastifyReply } from "fastify";
import { FastifySSEPlugin } from "fastify-sse-v2";
import { on } from "events";
import {
  OfferRequestBody,
  OfferResponseBody,
  ResourceParam,
  ResourceRequestBody,
  SseParam,
  SseRequestBody,
  acceptPatch,
  buildLink,
  ianaLayer,
  ianaSSE,
  offerRequestBody,
  resourceRequestBody,
  responseHeaders,
} from ".";
import {
  createSession,
  iceRequest,
  requestSSE,
  startSSEStream,
} from "./usecase";
import { config } from "./config";
import { EventEmitter } from "stream";

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

const checkSseRequestBody = ajv.compile(resourceRequestBody);

export async function sse(
  req: FastifyRequest<{
    Body: SseRequestBody;
    Params: SseParam;
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    checkSseRequestBody(req.body);

    const request = req.body;
    const { id } = req.params;

    requestSSE({ events: request, id });

    await reply.code(201).send();
  } catch (error) {
    await reply.code(500).send({ error });
  }
}

export async function sseStream(
  req: FastifyRequest<{
    Params: SseParam;
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id } = req.params;

    const { event, startEvent } = startSSEStream({ id });

    const eventEmitter = new EventEmitter();
    event.subscribe((event) => eventEmitter.emit("event", event));
    event.onended = () => {
      eventEmitter.emit("endSseStream");
      eventEmitter.removeAllListeners();
    };

    reply.sse(
      (async function* () {
        for await (const [event] of on(eventEmitter, "event")) {
          if (event.name === "endSseStream") {
            break;
          }

          yield {
            event: event.name,
            data: JSON.stringify(event),
          };
        }
      })()
    );

    startEvent();
  } catch (error) {
    await reply.code(500).send({ error });
  }
}
