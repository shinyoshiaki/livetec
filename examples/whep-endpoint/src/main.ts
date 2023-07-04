import fastify from "fastify";
import { config } from "./config";

const server = fastify({});

server.listen({ port: config.port, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error("server listen error", err);
  } else {
    console.log("server listened");
  }
});
