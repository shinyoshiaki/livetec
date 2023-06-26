import { writeFile } from "fs";

import { openapiJson } from "../src";

writeFile("docs/openapi.json", openapiJson, () => {});
