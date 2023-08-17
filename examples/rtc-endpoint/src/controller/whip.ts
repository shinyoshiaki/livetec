import Ajv from "ajv";
import { FastifyReply, FastifyRequest } from "fastify";
import { whip } from "..";
import { config } from "../config";
import { whipUsecase } from "../dependencies";

const { offerParams, responseHeaders, iceParams } = whip;

const ajv = new Ajv();

const checkOfferRequestBody = ajv.compile(offerParams.body);

export async function whipOffer(
  req: FastifyRequest<{
    Body: whip.OfferParams["body"];
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    checkOfferRequestBody(req.body);

    const offer = req.body;
    console.log("whipOffer", offer);

    const { answer, etag, id } = await whipUsecase.createSession(offer);

    const responseBody: whip.OfferParams["responseBody"] = answer;

    const location = `${config.endpoint}/whip/resource/${id}`;

    await reply
      .code(201)
      .headers({
        [responseHeaders.etag]: etag,
        [responseHeaders.location]: location,
      })
      .send(responseBody);
  } catch (error) {
    await reply.code(500).send({ error });
  }
}

const checkResourceRequestBody = ajv.compile(iceParams.body);

export async function whipIce(
  req: FastifyRequest<{
    Body: whip.IceParams["body"];
    Headers: whip.IceParams["params"];
    Params: whip.IceParams["params"];
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    checkResourceRequestBody(req.body);

    const candidate = req.body;
    const { id } = req.params;
    const etag = req.headers["IF-Match"];
    await whipUsecase.iceRequest({ candidate, etag, id });

    await reply.code(204).send();
  } catch (error) {
    await reply.code(500).send({ error });
  }
}
