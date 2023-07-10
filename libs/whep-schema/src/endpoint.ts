import { Static, Type } from "@sinclair/typebox";
import {
  ParameterObject,
  PathItemObject,
  ResponseObject,
} from "openapi3-ts/oas31";

interface Endpoint {
  path: string;
  item: PathItemObject;
}

const string = Type.String();
export type String = Static<typeof string>;
export const ianaLayer = "urn:ietf:params:whep:ext:core:layer" as const;
export const ianaSSE =
  "urn:ietf:params:whep:ext:core:server-sent-events" as const;
export const sseEvents = "layers" as const;
export const trickleIce = "application/trickle-ice-sdpfrag" as const;
export const acceptPatch = { trickleIce } as const;
export const responseHeaders = {
  acceptPatch: "Accept-Patch",
  etag: "ETag",
  location: "Location",
  link: "Link",
} as const;

//---------------------------------------------------------------------

export const offerRequestBody = string;
export type OfferRequestBody = Static<typeof offerRequestBody>;
const offerResponseHeaderAcceptPatch = Type.Literal(trickleIce);
export type OfferResponseHeaderAcceptPatch = Static<
  typeof offerResponseHeaderAcceptPatch
>;
export const offerResponseBody = string;
export type OfferResponseBody = Static<typeof offerResponseBody>;
export const buildLink = (
  arr: { link: string; rel: string; events?: string }[]
) => {
  let res = "";
  for (const { link, rel, events } of arr) {
    if (res.length > 0) {
      res += ", ";
    }
    res += `<${link}>; rel="${rel}"`;
    if (events) {
      res += `; events="${events}"`;
    }
  }
  return res;
};
export const offerEndpoint: Endpoint = {
  path: "/whep",
  item: {
    post: {
      description: "offer",
      requestBody: {
        content: {
          "application/sdp": { schema: offerRequestBody },
        },
      },
      responses: {
        "201": {
          headers: {
            [responseHeaders.acceptPatch]: {
              schema: offerResponseHeaderAcceptPatch,
            },
            [responseHeaders.etag]: {
              schema: string,
            },
            [responseHeaders.location]: {
              schema: string,
              example: "https://whep.example.org/resource/213786HF",
            },
            [responseHeaders.link]: {
              description:
                "Contains links to the layer and server-sent events resources",
              schema: {
                type: "string",
                example: buildLink([
                  {
                    link: "https://whep.ietf.org/resource/213786HF/sse",
                    rel: ianaSSE,
                  },
                  {
                    link: "https://whep.ietf.org/resource/213786HF/layer",
                    rel: ianaLayer,
                  },
                ]),
              },
            },
          },
          description: "response",
          content: { "application/sdp": { schema: offerResponseBody } },
        } as ResponseObject,
      },
    },
  },
};

export const resourceRequestBody = string;
export type ResourceRequestBody = Static<typeof resourceRequestBody>;
const resourceParam = {
  id: {
    in: "path",
    name: "id",
    required: true,
    schema: Type.String(),
  } as ParameterObject,
  "IF-Match": {
    in: "header",
    name: "IF-Match",
    required: true,
    schema: Type.String(),
  } as ParameterObject,
} as const;
export type ResourceParam = {
  [key in keyof typeof resourceParam]: string;
};

export const resourceEndpoint: Endpoint = {
  path: `/whep/resource/{${resourceParam.id.name}}`,
  item: {
    patch: {
      description: "resource",
      parameters: Object.values(resourceParam),
      requestBody: {
        content: {
          "application/trickle-ice-sdpfrag": { schema: resourceRequestBody },
        },
      },
      responses: {
        "204": {
          description: "trickle",
        } as ResponseObject,
        // werift do not support restart ice yet
        // "200": {
        //   description: "restart ice",
        //   headers: {
        //     ETag: {
        //       schema: string,
        //     },
        //   },
        //   content: { "application/trickle-ice-sdpfrag": { schema: string } },
        // } as ResponseObject,
      },
    },
  },
};

const sseParam = {
  id: {
    in: "path",
    name: "id",
    required: true,
    schema: Type.String(),
  } as ParameterObject,
} as const;
export type SseParam = {
  [key in keyof typeof sseParam]: string;
};
const sseRequestBody = Type.Array(Type.String(), { examples: ["layers"] });

export type SseRequestBody = Static<typeof sseRequestBody>;
export const sseEndpoint: Endpoint = {
  path: `/whep/resource/{${sseParam.id.name}}/sse`,
  item: {
    post: {
      description: "sse",
      parameters: Object.values(sseParam),
      requestBody: {
        content: {
          "application/json": { schema: sseRequestBody },
        },
      },
      responses: {
        "201": {
          description: "sse",
          headers: {
            [responseHeaders.location]: {
              schema: string,
              example:
                "https://whep.example.org/resource/213786HF/sse/event-stream",
            },
          },
        } as ResponseObject,
      },
    },
  },
};

const layerParam = {
  id: {
    in: "path",
    name: "id",
    required: true,
    schema: Type.String(),
  } as ParameterObject,
} as const;
export type LayerParam = {
  [key in keyof typeof resourceParam]: string;
};
const layerRequestBody = Type.Object({
  mediaId: Type.Optional(Type.String()),
  encodingId: Type.Optional(Type.String()),
  spatialLayerId: Type.Optional(Type.String()),
  temporalLayerId: Type.Optional(Type.String()),
  maxSpatialLayerId: Type.Optional(Type.String()),
  maxTemporalLayerId: Type.Optional(Type.String()),
});
export type LayerRequestBody = Static<typeof layerRequestBody>;
export const layerEndpoint: Endpoint = {
  path: `/whep/resource/{${layerParam.id.name}}/layer`,
  item: {
    post: {
      description: "layer",
      parameters: Object.values(layerParam),
      requestBody: {
        content: {
          "application/json": { schema: layerRequestBody },
        },
      },
      responses: {
        "200": {
          description: "layer",
        } as ResponseObject,
      },
    },
  },
};

export const sseStreamPath = `/whep/resource/{${sseParam.id.name}}/sse/event-stream`;
