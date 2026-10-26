import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { gameMotionEvents } from "../src/client/game-motion-events";
it("reveals newly confirmed UNO cards only to the owner, including card zero", () => {
  const room = new Room(
    "flip",
    { kind: "uno", humans: 2, ai: [], team: false, training: false },
    "flip",
  );
  const owner = room.claim("甲"),
    guest = room.claim("乙");
  room.setReady(guest, true);
  room.start(owner);
  room.act(owner, "deal", room.version, { type: "uno-start" });
  const actor = room.engine.actors(room.state!)[0],
    tokens = [owner, guest];
  const before = room.snapshot(tokens[actor]),
    beforeGuest = room.snapshot(tokens[1 - actor]);
  room.act(tokens[actor], "draw", room.version, { type: "uno-draw" });
  const after = room.snapshot(tokens[actor]);
  const events = gameMotionEvents(before.state!, after.state!, after.actor);
  expect(
    events.filter((e) => e.type === "draw" && e.reveal).length,
  ).toBeGreaterThan(0);
  for (const event of events)
    if (event.type === "draw" && event.reveal)
      expect(
        after.state!.kind === "uno" && after.state!.view.playerCards[actor],
      ).toContain(event.card);
  const seen = gameMotionEvents(
    beforeGuest.state!,
    room.snapshot(tokens[1 - actor]).state!,
    1 - actor,
  );
  expect(
    seen
      .filter((e) => e.type === "draw" && e.reveal)
      .every((e) => e.type === "draw" && e.actor === 1 - actor),
  ).toBe(true);
  const next = structuredClone(after.state!);
  if (next.kind !== "uno") throw new Error();
  const previous = structuredClone(next);
  previous.view.playerCards[0] = previous.view.playerCards[0].filter(
    (id) => id !== 0,
  );
  next.view.playerCards[0] = [...previous.view.playerCards[0], 0];
  expect(gameMotionEvents(previous, next, 0)).toContainEqual({
    type: "draw",
    actor: 0,
    card: 0,
    reveal: true,
    source: '[data-motion-zone="uno.deck"]',
    target: '.uno-list [data-motion-key="uno-card-0"]',
  });
});
it("uses the public verified checkers route and ignores repeated metadata", () => {
  const room = new Room("route", {
    kind: "tq",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const owner = room.claim("甲"),
    guest = room.claim("乙");
  room.setReady(guest, true);
  room.start(owner);
  const before = room.snapshot(owner);
  const actor = room.engine.actors(room.state!)[0];
  const action = room.engine.candidates(room.state!, actor)[0].action;
  room.act([owner, guest][actor], "move", room.version, action);
  const after = room.snapshot(owner);
  const event = gameMotionEvents(before.state!, after.state!, 0).find(
    (e) => e.type === "piece",
  );
  expect(event).toBeDefined();
  expect(event?.type === "piece" && event.route).toEqual(
    action.type === "tq-move" && action.route,
  );
  expect(gameMotionEvents(after.state!, after.state!, 0)).toEqual([]);
});
it("poison public placement uses one-based actor and collects the overflowing pot", () => {
  const room = new Room(
    "pot",
    { kind: "dy", humans: 3, ai: [], team: false, training: false },
    "pot",
  );
  const tokens = [room.claim("甲"), room.claim("乙"), room.claim("丙")];
  room.seats.forEach((s) => (s.ready = true));
  room.start(tokens[0]);
  let collected = false;
  for (let i = 0; i < 70 && !room.engine.finished(room.state!); i++) {
    const actor = room.engine.actors(room.state!)[0],
      before = room.snapshot(tokens[actor]).state!;
    const action = room.engine.candidates(room.state!, actor)[0].action;
    room.act(tokens[actor], `pot-${i}`, room.version, action);
    const next = room.snapshot(tokens[actor]).state!;
    if (action.type !== "dy-play" || next.kind !== "dy") throw new Error();
    const events = gameMotionEvents(before, next, actor);
    expect(events).toContainEqual({
      type: "card",
      card: action.card,
      source: `[data-guide-target="dy.hand"] [data-motion-key="dy-card-${action.card}"]`,
      target: `[data-guide-target="dy.pot"][data-guide-id="${action.pot}"] [data-motion-key="dy-card-${action.card}"]`,
    });
    if (next.view.lastOp.eatCardList.length) {
      collected = true;
      expect(events).toContainEqual({
        type: "collect",
        count: next.view.lastOp.eatCardList.length,
        source: `[data-guide-target="dy.pot"][data-guide-id="${action.pot}"]`,
        target: `[data-game-avatar="${actor}"]`,
      });
      break;
    }
  }
  expect(collected).toBe(true);
});

it("animates a Dominion gain once without repeating it on room metadata updates", () => {
  const room = new Room("dom-motion", {
    kind: "dominion",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const first = room.claim("甲"),
    second = room.claim("乙");
  room.setReady(second, true);
  room.start(first);
  room.act(first, "treasure", room.version, {
    type: "dominion-action",
    move: { type: "treasures" },
  });
  const before = room.snapshot(first);
  room.act(first, "buy", room.version, {
    type: "dominion-action",
    move: { type: "buy", card: "copper" },
  });
  const after = room.snapshot(first);
  expect(gameMotionEvents(before.state!, after.state!, 0)).toEqual([
    {
      type: "collect",
      count: 1,
      source: '[data-motion-zone="dominion.supply-copper"]',
      target: '[data-game-avatar="0"]',
    },
  ]);
  expect(
    gameMotionEvents(after.state!, structuredClone(after.state!), 0),
  ).toEqual([]);
});
it("秘塔远征的伤害路径落在战斗角色上，不落在玩家列表",()=>{
 const room=new Room("exp-motion",{kind:"expedition",humans:1,ai:[],team:false,training:false}),token=room.claim("甲");room.start(token);
 room.act(token,"class",room.version,{type:"expedition-action",move:{type:"profession",profession:0}});room.act(token,"route",room.version,room.snapshot(token).candidates[0].action);
 if(room.state?.kind!=="expedition")throw new Error("game");
 const before=structuredClone(room.state),next=structuredClone(before);next.view.combat.sequence++;next.view.combat.visuals=[{kind:"damage",amount:6,source:0,target:{side:"enemy",index:0}}];
 expect(gameMotionEvents(before,next,0)).toContainEqual({type:"effect",kind:"damage",amount:6,source:'[data-exp-target="hero-0"]',target:'[data-exp-target="enemy-0"]'});
});
