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

export const offerParams = {
  body: string,
  headers: { [responseHeaders.acceptPatch]: Type.Literal(trickleIce) },
  responseBody: string,
} as const;

export interface OfferParams {
  body: Static<(typeof offerParams)["body"]>;
  headers: {
    [key in keyof (typeof offerParams)["headers"]]: Static<
      (typeof offerParams)["headers"][key]
    >;
  };
  responseBody: Static<(typeof offerParams)["responseBody"]>;
}

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
          "application/sdp": { schema: offerParams.body },
        },
      },
      responses: {
        "201": {
          headers: {
            [responseHeaders.acceptPatch]: {
              schema: offerParams.headers[responseHeaders.acceptPatch],
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
          content: { "application/sdp": { schema: offerParams.responseBody } },
        } as ResponseObject,
      },
    },
  },
};

export const iceParams = {
  body: string,
  params: {
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
  },
} as const;

export interface IceParams {
  body: Static<(typeof iceParams)["body"]>;
  params: {
    [key in keyof (typeof iceParams)["params"]]: string;
  };
}

export const iceEndpoint: Endpoint = {
  path: `/whep/resource/{${iceParams.params.id.name}}`,
  item: {
    patch: {
      description: "ice",
      parameters: Object.values(iceParams.params),
      requestBody: {
        content: {
          "application/trickle-ice-sdpfrag": { schema: iceParams.body },
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

export const sseParams = {
  body: Type.Array(Type.String(), { examples: ["layers"] }),
  params: {
    id: {
      in: "path",
      name: "id",
      required: true,
      schema: Type.String(),
    } as ParameterObject,
  },
};

export interface SseParams {
  body: Static<(typeof sseParams)["body"]>;
  params: {
    [key in keyof (typeof sseParams)["params"]]: string;
  };
}

export const sseEndpoint: Endpoint = {
  path: `/whep/resource/{${sseParams.params.id.name}}/sse`,
  item: {
    post: {
      description: "sse",
      parameters: Object.values(sseParams.params),
      requestBody: {
        content: {
          "application/json": { schema: sseParams.body },
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

export const sseStreamPath = `/whep/resource/{${sseParams.params.id.name}}/sse/event-stream`;

export const layerParams = {
  body: Type.Object({
    mediaId: Type.Optional(Type.String()),
    encodingId: Type.Optional(Type.String()),
    spatialLayerId: Type.Optional(Type.String()),
    temporalLayerId: Type.Optional(Type.String()),
    maxSpatialLayerId: Type.Optional(Type.String()),
    maxTemporalLayerId: Type.Optional(Type.String()),
  }),
  params: {
    id: {
      in: "path",
      name: "id",
      required: true,
      schema: Type.String(),
    } as ParameterObject,
  },
} as const;

export interface LayerParams {
  body: Static<(typeof layerParams)["body"]>;
  params: {
    [key in keyof (typeof layerParams)["params"]]: string;
  };
}

export const layerEndpoint: Endpoint = {
  path: `/whep/resource/{${layerParams.params.id.name}}/layer`,
  item: {
    post: {
      description: "layer",
      parameters: Object.values(layerParams.params),
      requestBody: {
        content: {
          "application/json": { schema: layerParams.body },
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
