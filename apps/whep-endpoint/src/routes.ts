import cors from "@fastify/cors";
import { FastifyInstance } from "fastify";

import { offerEndpoint } from ".";
import { offer } from "./controller";

export async function registerExternalRoutes(server: FastifyInstance) {
  await server.register(cors, { origin: true });

  server.post(convertPath(offerEndpoint.path), offer);
}

function convertPath(openApiPath: string): string {
  return openApiPath.replace(/{(.*?)}/g, ":$1");
}
