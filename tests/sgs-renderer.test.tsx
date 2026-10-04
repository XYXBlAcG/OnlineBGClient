import React from 'react';
import { renderToString } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { OriginalGame } from '../src/client/OriginalGame';
import { Room } from '../src/domain/room';
it('wraps only already projected general cards with accessible detail controls',()=> {
 const room=new Room('guide',{kind:'sgs',humans:3,ai:[],team:false,training:false});
 const tokens=Array.from({length:3},(_,i)=>room.claim(String(i)));
 tokens.forEach(token=>room.setReady(token,true));room.start(tokens[0]);
 vi.stubGlobal('window',globalThis);
 vi.stubGlobal('document',{createElement:()=>({setAttribute:()=>{},clientWidth:16}),body:{appendChild:()=>{},removeChild:()=>{}}});
 try{const html=renderToString(<OriginalGame snapshot={room.snapshot(tokens[room.engine.actors(room.state!)[0]])} act={()=>{}} end={()=>{}}/>);expect(html).toContain('hero-detail-button');expect(html).toContain('武将牌');}finally{vi.unstubAllGlobals();}
});
