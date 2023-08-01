import Ajv from "ajv";
import { FastifyRequest, FastifyReply } from "fastify";
import { on } from "events";
import { whep, whepSession } from "..";

import { config } from "../config";
import { EventEmitter } from "stream";
import { whepUsecase } from "../dependencies";

const {
  acceptPatch,
  buildLink,
  ianaLayer,
  ianaSSE,
  iceParams,
  layerParams,
  offerParams,
  responseHeaders,
  sseParams,
  supportedEvents,
} = { ...whep, ...whepSession };

const ajv = new Ajv();

const checkOfferRequestBody = ajv.compile(offerParams.body);

export async function whepOffer(
  req: FastifyRequest<{
    Body: whep.OfferParams["body"];
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    checkOfferRequestBody(req.body);

    const offer = req.body;
    const { answer, etag, id } = await whepUsecase.createSession(offer);

    const responseBody: whep.OfferParams["responseBody"] = answer;

    const location = `${config.endpoint}/whep/resource/${id}`;

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

const checkResourceRequestBody = ajv.compile(iceParams.body);

export async function whepIce(
  req: FastifyRequest<{
    Body: whep.IceParams["body"];
    Headers: whep.IceParams["params"];
    Params: whep.IceParams["params"];
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    checkResourceRequestBody(req.body);

    const candidate = req.body;
    const { id } = req.params;
    const etag = req.headers["IF-Match"];
    await whepUsecase.iceRequest({ candidate, etag, id });

    await reply.code(204).send();
  } catch (error) {
    await reply.code(500).send({ error });
  }
}

const checkSseRequestBody = ajv.compile(sseParams.body);

export async function whepSse(
  req: FastifyRequest<{
    Body: whep.SseParams["body"];
    Params: whep.SseParams["params"];
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    checkSseRequestBody(req.body);

    const request = req.body;
    const { id } = req.params;

    whepUsecase.requestSSE({ events: request, id });
    const location = `${config.endpoint}/whep/resource/${id}/sse/event-stream`;

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

export async function whepSseStream(
  req: FastifyRequest<{
    Params: whep.SseParams["params"];
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id } = req.params;

    const { event, startEvent } = whepUsecase.startSSEStream({ id });

    reply.raw
      .setHeader("Content-Type", "text/event-stream")
      .setHeader("Connection", "keep-alive")
      .setHeader("Cache-Control", "no-cache,no-transform")
      .setHeader("Access-Control-Allow-Origin", "*");

    event.subscribe((event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    reply.raw.on("close", () => {
      // client closed
    });

    process.nextTick(() => {
      startEvent();
    });
  } catch (error) {
    await reply.code(500).send({ error });
  }
}

const checkLayerRequestBody = ajv.compile(layerParams.body);

export async function whepLayer(
  req: FastifyRequest<{
    Body: whep.LayerParams["body"];
    Params: whep.LayerParams["params"];
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    checkLayerRequestBody(req.body);

    const request = req.body;
    const { id } = req.params;

    whepUsecase.requestLayer({ id, request });

    await reply.code(200).send();
  } catch (error) {
    await reply.code(500).send({ error });
  }
}
