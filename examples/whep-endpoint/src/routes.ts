import cors from "@fastify/cors";
import { FastifyInstance } from "fastify";

import { offerEndpoint, resourceEndpoint } from ".";
import { offer, resource } from "./controller";

export async function registerExternalRoutes(server: FastifyInstance) {
  await server.register(cors, { origin: true });

  server.post(convertPath(offerEndpoint.path), offer);
  server.patch(convertPath(resourceEndpoint.path), resource);
}

function convertPath(openApiPath: string): string {
  return openApiPath.replace(/{(.*?)}/g, ":$1");
}
