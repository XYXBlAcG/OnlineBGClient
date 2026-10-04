import { it, expect } from 'vitest';
import { Room } from '../src/domain/room';
it('upgrades existing room archives once while preserving private tokens and assigning public identities',()=> {
 const room=new Room('legacy',{kind:'uno',humans:1,ai:[{difficulty:'normal',name:''}],team:false,training:false});
 const token=room.claim('甲');room.chat(token,'old','原消息');
 const old=room.export() as any;
 delete old.messageSequence;delete old.messageTotals;delete old.seats[0].id;
 old.messages=[{id:'old',name:'甲',text:'原消息',time:1}];
 const restored=Room.restore(old);restored.claim('甲',token);restored.chat(token,'new','新消息');
 const snapshot=restored.snapshot(token);
 expect(snapshot.chatSequence).toBe(2);
 expect(snapshot.chat[0].text).toBe('原消息');
 expect(snapshot.seats[0].id).not.toBe(token);
 expect(snapshot.chat[1].sender).toBe(snapshot.seats[0].id);
 expect(Room.restore(restored.export()).snapshot(token).chat).toEqual(snapshot.chat);
});
