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
      description: "success",
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
          description: "success",
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
      description: "success",
      parameters: Object.values(resourceParam),
      requestBody: {
        content: {
          "application/trickle-ice-sdpfrag": { schema: string },
        },
      },
      responses: {
        "204": {
          description: "success",
        } as ResponseObject,
        "200": {
          headers: {
            ETag: {
              schema: string,
            },
          },
          description: "success",
          content: { "application/trickle-ice-sdpfrag": { schema: string } },
        } as ResponseObject,
      },
    },
  },
};
