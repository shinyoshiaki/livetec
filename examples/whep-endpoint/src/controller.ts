import Ajv from "ajv";
import { FastifyRequest, FastifyReply } from "fastify";
import { on } from "events";
import {
  LayerRequestBody,
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
  layerRequestBody,
  offerRequestBody,
  resourceRequestBody,
  responseHeaders,
  supportedEvents,
} from ".";
import {
  createSession,
  iceRequest,
  requestLayer,
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
            events: supportedEvents.join(","),
          },
          {
            link: `${location}/layer`,
            rel: ianaLayer,
          },
        ]),
      })
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
    const location = `${config.endpoint}/resource/${id}/sse/event-stream`;

    await reply
      .code(201)
      .headers({
        [responseHeaders.location]: location,
      })
      .send();
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
    event.subscribe((event) => {
      eventEmitter.emit("event", event);
    });
    event.onended = () => {
      eventEmitter.emit("endSseStream");
      eventEmitter.removeAllListeners();
    };

    reply.sse(
      (async function* () {
        for await (const [event] of on(eventEmitter, "event")) {
          console.log("sseEvent", event);
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

    process.nextTick(() => {
      startEvent();
    });
  } catch (error) {
    await reply.code(500).send({ error });
  }
}

const checkLayerRequestBody = ajv.compile(layerRequestBody);

export async function layer(
  req: FastifyRequest<{
    Body: LayerRequestBody;
    Params: SseParam;
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    checkLayerRequestBody(req.body);

    const request = req.body;
    const { id } = req.params;

    requestLayer({ id, request });

    await reply.code(200).send();
  } catch (error) {
    await reply.code(500).send({ error });
  }
}
