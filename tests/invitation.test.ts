import { expect, it } from "vitest";
import { invitationLink, parseInvitation } from "../src/client/invitation";

it("uses a complete invitation to select the room and its service", () => {
  const link = invitationLink("abcd1234", "https://table.example/");
  expect(parseInvitation(link)).toEqual({
    room: "abcd1234",
    service: "https://table.example",
  });
  expect(
    parseInvitation(
      "https://web.example/?room=abc&service=https%3A%2F%2Frooms.example",
    ),
  ).toEqual({ room: "abc", service: "https://rooms.example" });
});
it.each([
  "abcd1234",
  "https://table.example/",
  "ftp://table.example/?room=abc",
  "https://table.example/?room=abc&service=file:///tmp",
])("rejects incomplete or unsupported invitations: %s", (value) => {
  expect(() => parseInvitation(value)).toThrow();
});
