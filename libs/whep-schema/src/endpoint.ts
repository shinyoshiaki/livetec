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

//---------------------------------------------------------------------

const postResponseHeaderAcceptPatch = Type.Literal(
  "application/trickle-ice-sdpfrag"
);
export type PostResponseHeaderAcceptPatch = Static<
  typeof postResponseHeaderAcceptPatch
>;
export const ianaLayer = "urn:ietf:params:whep:ext:core:layer" as const;
export const ianaSSE =
  "urn:ietf:params:whep:ext:core:server-sent-events" as const;
export const sseEvents = "layers" as const;
export const postEndpoint: Endpoint = {
  path: "/whep/endpoint",
  item: {
    post: {
      description: "post",
      requestBody: {
        content: {
          "application/sdp": { schema: string },
        },
      },
      responses: {
        "201": {
          headers: {
            "Accept-Patch": {
              schema: postResponseHeaderAcceptPatch,
            },
            ETag: {
              schema: string,
            },
            Location: {
              schema: string,
            },
            Link: {
              description:
                "Contains links to the layer and server-sent events resources",
              schema: {
                type: "string",
                example: `<https://whep.ietf.org/resource/213786HF/sse>; rel="${ianaSSE}" events="${sseEvents}",<https://whep.ietf.org/resource/213786HF/layer>; rel="${ianaLayer}"`,
              },
            },
          },
          description: "response",
          content: { "application/sdp": { schema: string } },
        } as ResponseObject,
      },
    },
  },
};

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
  path: `/resource/{${resourceParam.id.name}}`,
  item: {
    patch: {
      description: "patch",
      parameters: Object.values(resourceParam),
      requestBody: {
        content: {
          "application/trickle-ice-sdpfrag": { schema: string },
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
  path: `/resource/{${layerParam.id.name}}/layer`,
  item: {
    post: {
      description: "post",
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
