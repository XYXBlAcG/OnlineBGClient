import { afterEach, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyCors } from "../src/server/cors";
import { developmentPorts } from "../src/shared/development";
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
it("手机预览来源通过真实服务预检和已认证图片收发，其他来源及身份不通过", async () => {
  const gateway = new Gateway();
  const host = gateway.handle({
    type: "create",
    name: "甲",
    config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
  }).session;
  root = await mkdtemp(join(tmpdir(), "bg-cors-"));
  const media = new MediaHttp(gateway, new AttachmentStore(root));
  server = createServer((req, res) => {
    if (applyCors(req, res)) return;
    void media.handle(req, res, new URL(req.url!, "http://localhost"));
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/media?room=${host.room}`;
  for (const hostname of ["localhost", "127.0.0.1"]) {
    const origin = `http://${hostname}:${developmentPorts.phone}`;
    const headers = { Origin: origin, Authorization: `Bearer ${host.token}` };
    const preflight = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    const upload = await fetch(url, {
      method: "POST",
      headers,
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    expect(upload.status).toBe(200);
    expect(upload.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    const image = await upload.json();
    const received = await fetch(`${url}&id=${image.id}`, { headers });
    expect(received.status).toBe(200);
    expect((await received.arrayBuffer()).byteLength).toBe(image.size);
    expect(
      (
        await fetch(url, {
          headers: { Origin: origin, Authorization: "Bearer invalid" },
        })
      ).status,
    ).toBe(400);
  }
  expect(
    (
      await fetch(url, {
        method: "OPTIONS",
        headers: { Origin: "https://unrelated.example" },
      })
    ).status,
  ).toBe(403);
});
