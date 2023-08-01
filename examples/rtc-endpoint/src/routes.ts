import cors from "@fastify/cors";
import { FastifyInstance } from "fastify";
import { FastifySSEPlugin } from "fastify-sse-v2";

import { whep, whip } from ".";
import {
  whepLayer,
  whepOffer,
  whepIce,
  whepSse,
  whepSseStream,
} from "./controller/whep";
import { whipIce, whipOffer } from "./controller/whip";

export async function registerExternalRoutes(server: FastifyInstance) {
  await server.register(cors, {
    origin: true,
    exposedHeaders: Object.values(whep.responseHeaders),
  });
  server.register(FastifySSEPlugin);

  server.addContentTypeParser(
    "application/sdp",
    { parseAs: "string" },
    (_, body, done) => {
      done(null, body);
    }
  );
  server.addContentTypeParser(
    "application/trickle-ice-sdpfrag",
    { parseAs: "string" },
    (_, body, done) => {
      done(null, body);
    }
  );

  server.post(convertPath(whep.offerEndpoint.path), whepOffer);
  server.patch(convertPath(whep.iceEndpoint.path), whepIce);
  server.post(convertPath(whep.sseEndpoint.path), whepSse);
  server.get(convertPath(whep.sseStreamPath), whepSseStream);
  server.post(convertPath(whep.layerEndpoint.path), whepLayer);

  server.post(convertPath(whip.offerEndpoint.path), whipOffer);
  server.patch(convertPath(whip.iceEndpoint.path), whipIce);
}

function convertPath(openApiPath: string): string {
  return openApiPath.replace(/{(.*?)}/g, ":$1");
}
