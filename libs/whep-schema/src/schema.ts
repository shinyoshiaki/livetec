import { OpenApiBuilder } from "openapi3-ts/oas31";

import {
  layerEndpoint,
  offerEndpoint,
  resourceEndpoint,
  sseEndpoint,
} from "./endpoint";

export const openapiJson = new OpenApiBuilder()
  .addInfo({ title: "whep", version: "0.0.1" })
  .addPath(offerEndpoint.path, offerEndpoint.item)
  .addPath(resourceEndpoint.path, resourceEndpoint.item)
  .addPath(sseEndpoint.path, sseEndpoint.item)
  .addPath(layerEndpoint.path, layerEndpoint.item)
  .getSpecAsJson();
