import type { IncomingMessage, ServerResponse } from "node:http";
import { developmentPorts } from "../shared/development";
const allowedOrigins = new Set([
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  ...Object.values(developmentPorts).flatMap((port) =>
    ["localhost", "127.0.0.1"].map((host) => `http://${host}:${port}`),
  ),
]);
export function applyCors(
  request: IncomingMessage,
  response: ServerResponse,
): boolean {
  const origin = request.headers.origin;
  const allowed = !!origin && allowedOrigins.has(origin);
  if (allowed) {
    response.setHeader("Access-Control-Allow-Origin", origin!);
    response.setHeader("Vary", "Origin");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (request.headers["access-control-request-private-network"] === "true")
      response.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  if (request.method !== "OPTIONS") return false;
  response.writeHead(allowed ? 204 : 403);
  response.end();
  return true;
}
