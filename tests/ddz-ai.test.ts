import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { ddzTrickOwner } from "../src/domain/ddz";
import { Strategies } from "../src/domain/strategies";

it("completes a three AI round using projected information at every difficulty", () => {
  const engine = new GameEngine(),
    ai = new Strategies();
  for (const difficulty of ["easy", "normal", "hard"] as const) {
    let state = engine.create("ddz", 3, `ai:${difficulty}`);
    for (let turn = 0; turn < 400 && !engine.finished(state); turn++) {
      const actor = engine.actors(state)[0];
      const decision = ai.decide(
        engine.project(state, actor),
        actor,
        difficulty,
        `move:${turn}`,
      );
      state = engine.apply(state, actor, decision.chosen, `apply:${turn}`);
    }
    expect(engine.finished(state)).toBe(true);
  }
}, 20000);

it("tracks the public trick owner across passes and offers combinations", () => {
  const engine = new GameEngine();
  let state = engine.apply(
    engine.create("ddz", 3, "shapes"),
    0,
    { type: "ddz-claim" },
    "claim",
  );
  expect(
    engine
      .candidates(state, 0)
      .some((c) => c.action.type === "ddz-play" && c.action.cards.length > 1),
  ).toBe(true);
  let owner = 1;
  for (let step = 0; step < 20 && !engine.finished(state); step++) {
    const actor = engine.actors(state)[0],
      choices = engine.candidates(state, actor);
    const choice =
      choices.find((c) => c.action.type === "ddz-play") ?? choices[0];
    if (choice.action.type === "ddz-play") owner = actor + 1;
    state = engine.apply(state, actor, choice.action, `track:${step}`);
    if (state.kind === "ddz") expect(ddzTrickOwner(state.view)).toBe(owner);
  }
});

it('runs the registered strategy through room AI requests', async () => {
  const { Room } = await import('../src/domain/room');
  const room = new Room('ddz-ai-room', {kind:'ddz',humans:1,ai:[{difficulty:'normal',name:'农民甲'},{difficulty:'hard',name:'农民乙'}],team:false,training:false,aiDelayMs:0});
  const token = room.claim('玩家');
  room.setReady(token,true);
  room.start(token);
  const strategies = new Strategies();
  for(let step=0;step<400 && !room.snapshot(token).finished;step++) {
    const request = room.aiRequest();
    if(request) {
      const result = strategies.decide(request.observation,request.actor,request.difficulty,request.seed);
      room.acceptDecision(result,room.version);
    } else {
      const snapshot=room.snapshot(token);
      room.act(token,`human:${step}`,room.version,snapshot.candidates[0].action);
    }
  }
  expect(room.snapshot(token).finished).toBe(true);
});

it('covers legal rank combinations against exhaustive small-hand enumeration', async () => {
 const { DdzRules } = await import('../src/domain/ddz');
 const engine = new GameEngine(), rules=new DdzRules(engine.runtime);
 for(let seed=0;seed<5;seed++) {
   const state=engine.apply(engine.create('ddz',3,`enumerate:${seed}`),0,{type:'ddz-claim'},'claim');
   if(state.kind!=='ddz') throw new Error('wrong game');
   const view=structuredClone(state.view);
   const hand=view.playerCardLists[1].slice(0,12);
   view.playerCardLists[1]=hand;
   const signature=(cards:number[])=>cards.map(c=>rules.original.Vz(c) as number).sort((a,b)=>a-b).join(',');
   const generated=new Set(rules.candidates(view,0).flatMap(c=>c.action.type==='ddz-play' ? [signature(c.action.cards)] : []));
   for(let bits=1;bits<(1<<hand.length);bits++) {
     const cards=hand.filter((_,i)=>bits&(1<<i));
     if(rules.original.DB(view,1,3,cards)) expect(generated.has(signature(cards)),signature(cards)).toBe(true);
   }
 }
});
