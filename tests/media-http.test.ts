import { afterEach, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Gateway } from "../src/domain/gateway";
import { MediaHttp } from "../src/server/media-http";
import { AttachmentStore } from "../src/server/attachments";
let server: Server | undefined,
  root = "";
afterEach(async () => {
  await new Promise<void>((resolve) =>
    server ? server.close(() => resolve()) : resolve(),
  );
  if (root) await rm(root, { recursive: true, force: true });
});
it("uploads through real HTTP, enforces room identity and restricts clearing to the host", async () => {
  const gateway = new Gateway();
  const host = gateway.handle({
    type: "create",
    name: "甲",
    config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
  }).session;
  const guest = gateway.handle({
    type: "join",
    name: "乙",
    room: host.room,
  }).session;
  root = await mkdtemp(join(tmpdir(), "bg-http-"));
  const media = new MediaHttp(gateway, new AttachmentStore(root));
  server = createServer((request, response) => {
    void media.handle(
      request,
      response,
      new URL(request.url!, "http://localhost"),
    );
  });
  await new Promise<void>((resolve, reject) =>
    server!.once("error", reject).listen(0, "127.0.0.1", resolve),
  );
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/media?room=${host.room}`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  expect((await fetch(base, { method: "POST", body: png })).status).toBe(400);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const response = await fetch(base, {
    method: "POST",
    headers: auth(guest.token),
    body: png,
  });
  expect(response.status).toBe(200);
  const image = await response.json();
  expect(
    (await fetch(`${base}&id=${image.id}`, { headers: auth(host.token) }))
      .status,
  ).toBe(200);
  expect(
    (
      await fetch(`${base}&clear=1`, {
        method: "POST",
        headers: auth(guest.token),
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await fetch(`${base}&clear=1`, {
        method: "POST",
        headers: auth(host.token),
      })
    ).status,
  ).toBe(200);
  expect(
    (await fetch(`${base}&id=${image.id}`, { headers: auth(guest.token) }))
      .status,
  ).toBe(404);
});
