import { expect, it } from "vitest";
import {
  initialUpdate,
  updatePreferencesSchema,
  proxyOption,
  updateAction,
} from "../src/client/updates/model";
it("checks and asks by default, without requiring every player to run a proxy", () => {
  const prefs = updatePreferencesSchema.parse({});
  expect(prefs).toMatchObject({
    checkOnLaunch: true,
    notify: true,
    automatic: false,
    useProxy: false,
    proxy: "http://127.0.0.1:7897",
  });
  expect(proxyOption(prefs)).toBe(null);
  expect(proxyOption({ ...prefs, useProxy: true })).toBe(
    "http://127.0.0.1:7897",
  );
});
it("never silently installs without consent and defers reminders and installation during a session", () => {
  const prefs = updatePreferencesSchema.parse({}),
    available = {
      ...initialUpdate,
      phase: "available" as const,
      version: "0.2.1",
      background: true,
    };
  expect(updateAction(available, prefs, false)).toBe("ask");
  expect(updateAction(available, prefs, true)).toBe(null);
  expect(updateAction(available, { ...prefs, notify: false }, false)).toBe(
    null,
  );
  expect(updateAction(available, { ...prefs, automatic: true }, true)).toBe(
    "download",
  );
  const downloaded = { ...available, phase: "downloaded" as const };
  expect(updateAction(downloaded, prefs, false)).toBe(null);
  expect(updateAction({ ...downloaded, approved: true }, prefs, true)).toBe(
    null,
  );
  expect(updateAction({ ...downloaded, approved: true }, prefs, false)).toBe(
    "install",
  );
});

it("pauses an automatically downloaded installation if automatic updating is revoked", () => {
  const prefs = updatePreferencesSchema.parse({});
  expect(
    updateAction(
      {
        ...initialUpdate,
        phase: "downloaded",
        approved: true,
        automatic: true,
      },
      prefs,
      false,
    ),
  ).toBe(null);
  expect(
    updateAction(
      {
        ...initialUpdate,
        phase: "downloaded",
        approved: true,
        automatic: true,
      },
      { ...prefs, automatic: true },
      false,
    ),
  ).toBe("install");
});

it("shows manual check results in settings without duplicating the startup reminder", () => {
  const prefs = updatePreferencesSchema.parse({});
  expect(
    updateAction(
      {
        ...initialUpdate,
        phase: "available",
        version: "0.2.1",
        background: false,
      },
      prefs,
      false,
    ),
  ).toBe(null);
});
