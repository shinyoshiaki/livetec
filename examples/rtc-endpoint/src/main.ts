import fastify from "fastify";
import { config } from "./config";
import { setup } from "./dependencies";
import {
  registerExternalRoutes as registerRoutes,
  registerStaticRoutes,
} from "./routes";
import { createServer } from "http";

const server = fastify({});

(async () => {
  await setup();
  await registerRoutes(server);

  console.log("server listening", config);

  server.listen({ port: config.port, host: "0.0.0.0" }, (err) => {
    if (err) {
      console.error("server listen error", err);
    } else {
      console.log("server listened");
    }
  });

  const dashServer = createServer();
  registerStaticRoutes(dashServer);
  dashServer.listen(config.staticPort);
})();
