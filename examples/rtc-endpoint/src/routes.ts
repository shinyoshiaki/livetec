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
import { IncomingMessage, Server, ServerResponse } from "http";
import path from "path";
import { readFile } from "fs/promises";

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

export function registerStaticRoutes(
  server: Server<typeof IncomingMessage, typeof ServerResponse>
) {
  server.on("request", async (req, res) => {
    const filePath = req.url!;

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes: any = {
      ".mpd": "application/dash+xml",
      ".webm": "video/webm",
      ".m4s": "video/m4s",
    };

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
    res.setHeader("Access-Control-Allow-Headers", "*");

    console.log("request", filePath, mimeTypes[extname]);

    try {
      const file = await readFile("." + filePath);

      if (extname === ".m4s") {
        console.log("file", file.length);
      }
      res.writeHead(200, { "Content-Type": mimeTypes[extname] });
      res.end(file);
    } catch (error) {
      res.writeHead(404);
      res.end();
    }
  });
}
