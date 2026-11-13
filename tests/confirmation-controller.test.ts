import { afterEach, describe, expect, it } from "vitest";
import { confirmation } from "../src/client/confirmation-controller";

afterEach(() => confirmation.setNativeHandler(null));

describe("confirmation controller", () => {
  it("routes confirmations to the native handler when present", async () => {
    const replies = [true, false];
    confirmation.setNativeHandler(async () => replies.shift()!);
    await expect(confirmation.request("放弃远征？", "放弃")).resolves.toBe(
      true,
    );
    await expect(confirmation.request("关闭房间？", "关闭")).resolves.toBe(
      false,
    );
  });
});
