import cors from "@fastify/cors";
import { FastifyInstance } from "fastify";

import { postEndpoint } from ".";
import { offer } from "./controller";

export async function registerExternalRoutes(server: FastifyInstance) {
  await server.register(cors, { origin: true });

  server.post(convertPath(postEndpoint.path), offer);
}

function convertPath(openApiPath: string): string {
  return openApiPath.replace(/{(.*?)}/g, ":$1");
}
