import { createServer, type Server } from "node:http";
import { afterEach, expect, it } from "vitest";
import { ParticipantPermission } from "livekit-server-sdk";
import type { JsonValue } from "@bufbuild/protobuf";
import { Gateway } from "../src/domain/gateway";
import { LiveKitMedia, VoiceAuthority } from "../src/server/voice";
import { VoiceHttp } from "../src/server/voice-http";
const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});
async function start(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
it("uses real HTTP and official SDK RPC for room creation, mute, removal and closure", async () => {
  const calls: { path: string; body: Record<string, unknown>; auth: string }[] =
    [];
  const upstream = await start(
    createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      calls.push({
        path: request.url!,
        body,
        auth: request.headers.authorization ?? "",
      });
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify(
          request.url?.endsWith("CreateRoom")
            ? { name: body.name, sid: "RM_test" }
            : request.url?.endsWith("UpdateParticipant")
              ? { identity: body.identity, sid: "PA_test" }
              : {},
        ),
      );
    }),
  );
  const gateway = new Gateway();
  const host = gateway.handle({
    type: "create",
    name: "房主",
    config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
  }).session;
  const guest = gateway.handle({
    type: "join",
    room: host.room,
    name: "好友",
  }).session;
  const config = {
    url: upstream,
    apiKey: "test-key",
    secret: "test-secret-at-least-thirty-two-characters",
  };
  const http = new VoiceHttp(
    new VoiceAuthority(gateway, config, new LiveKitMedia(config)),
  );
  const base = await start(
    createServer((request, response) => {
      void http.handle(
        request,
        response,
        new URL(request.url!, "http://localhost"),
      );
    }),
  );
  const request = (token: string, body: unknown) =>
    fetch(`${base}/voice?room=${host.room}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  expect((await request("bad", { type: "join" })).status).toBe(400);
  const result = await request(guest.token, { type: "join" });
  expect(result.status).toBe(200);
  const grant = await result.json();
  expect(grant.token).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
  expect(
    (
      await request(guest.token, {
        type: "moderate",
        target: grant.identity,
        operation: "mute",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(host.token, {
        type: "moderate",
        target: grant.identity,
        operation: "mute",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(host.token, {
        type: "moderate",
        target: grant.identity,
        operation: "remove",
      })
    ).status,
  ).toBe(200);
  expect((await request(guest.token, { type: "join" })).status).toBe(400);
  gateway.rooms.delete(host.room);
  await http.authority.reconcile(host.room);
  expect(calls.map((c) => c.path.split("/").at(-1))).toEqual([
    "CreateRoom",
    "UpdateParticipant",
    "RemoveParticipant",
    "DeleteRoom",
  ]);
  expect(calls[0].body.maxParticipants).toBe(8);
  const permission = ParticipantPermission.fromJson(
    calls[1].body.permission as JsonValue,
  );
  expect(permission.canPublish).toBe(false);
  expect(permission.canSubscribe).toBe(true);
  expect(calls.every((c) => c.auth.startsWith("Bearer "))).toBe(true);
});
