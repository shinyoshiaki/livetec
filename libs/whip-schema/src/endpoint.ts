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
export const trickleIce = "application/trickle-ice-sdpfrag" as const;
export const responseHeaders = {
  acceptPatch: "Accept-Patch",
  etag: "ETag",
  location: "Location",
  link: "Link",
} as const;

//---------------------------------------------------------------------

export const offerParams = {
  body: string,
  responseBody: string,
} as const;

export interface OfferParams {
  body: Static<(typeof offerParams)["body"]>;
  responseBody: Static<(typeof offerParams)["responseBody"]>;
}

export const offerEndpoint: Endpoint = {
  path: "/whip",
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
            [responseHeaders.etag]: {
              schema: string,
            },
            [responseHeaders.location]: {
              schema: string,
              example: "https://whip.example.com/resource/id",
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
  path: `/whip/resource/{${iceParams.params.id.name}}`,
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
      },
    },
  },
};
