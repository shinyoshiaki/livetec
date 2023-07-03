import { mkdir, writeFile } from "fs";

import { openapiJson } from "../src";

mkdir("docs", { recursive: true }, () => {});
writeFile("docs/openapi.json", openapiJson, () => {});
