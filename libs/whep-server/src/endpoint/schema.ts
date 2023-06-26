import { OpenApiBuilder } from "openapi3-ts/oas31";

import { postEndpoint, resourceEndpoint } from "./endpoint";

export const openapiJson = new OpenApiBuilder()
  .addInfo({ title: "whep", version: "0.0.1" })
  .addPath(postEndpoint.path, postEndpoint.item)
  .addPath(resourceEndpoint.path, resourceEndpoint.item)
  .getSpecAsJson();
