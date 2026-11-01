import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
it('设置和房间不提供插件入口，新房间不自动载入已保存的插件',()=>{
 for(const name of ['src/client/Settings.tsx','src/client/RoomParty.tsx','src/client/party/PartyShop.tsx']){
 const source=readFileSync(name,'utf8');expect(source).not.toMatch(/<Workshop|<RoomWorkshop|插件工坊|本房间插件|"工坊"/);
 }
 expect(readFileSync('src/main.tsx','utf8')).not.toContain('store.plugins()');
});
