const http=require('node:http'),crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const {SPAWN,WALLS,FREE,blocked,clear,distance,voiceGain}=require('./shared.cjs');
const {jump,movePlayer}=require('./movement.cjs');
const {developerCommand}=require('./developer.cjs');
const {supportHeight}=require('./public/layout.js');
function resetLobby(r){r.phase='lobby';r.batteries=[];r.deposited=0;r.radar=null;r.nextRadar=0;r.returnAt=0;for(const p of r.players.values())Object.assign(p,{hp:100,alive:true,escaped:false,carrying:false,input:{},y:0,vy:0,running:false,god:false,grounded:true,stamina:1})}
function advanceRoom(r,now=Date.now()){
 if(r.phase==='ended'&&now>=r.returnAt){resetLobby(r);return}
 if(r.phase!=='playing')return;
 if(now>=r.release)for(const p of r.players.values())if(p.role==='hunter'&&!p.spawned){
  const others=[...r.players.values()].filter(q=>q!==p&&q.spawned&&q.alive&&!q.escaped);
  const candidates=FREE.filter(c=>distance(c,SPAWN)>12).map(c=>({...c,score:Math.min(100,...others.map(q=>distance(c,q)))}));
  const safe=candidates.filter(c=>c.score>=8);const pool=safe.length?safe:candidates.filter(c=>c.score===Math.max(...candidates.map(c=>c.score)));
  const spot=pool[crypto.randomInt(pool.length)];Object.assign(p,{x:spot.x,z:spot.z,spawned:true,y:0,vy:0,grounded:true,running:false,input:{},inputAt:0});
 }
 if(now>=r.nextRadar){r.radar={at:now,points:[...r.players.values()].filter(p=>p.spawned&&p.alive&&!p.escaped).map(({id,x,z,role})=>({id,x,z,role}))};r.nextRadar=now+30000}
}
function createGameServer(port=27840,host='0.0.0.0'){
 const rooms=new Map(),clients=new Map();let voiceId=0;
 const server=http.createServer((q,s)=>{s.writeHead(200,{'Content-Type':'text/plain'});s.end('Dead Air game server\n')});
 const wss=new WebSocketServer({server,maxPayload:16384});
 const send=(p,data)=>{if(p.ws.readyState===WebSocket.OPEN&&p.ws.bufferedAmount<262144)p.ws.send(JSON.stringify(data))};
 const error=(p,message)=>send(p,{type:'error',message});
 const state=r=>({type:'state',code:r.code,host:r.host,phase:r.phase,settings:r.settings,deposited:r.deposited||0,release:Math.max(0,(r.release-Date.now())/1000),radar:{next:Math.max(0,(r.nextRadar-Date.now())/1000)||0,remaining:r.radar?Math.max(0,3-(Date.now()-r.radar.at)/1000):0,points:r.radar&&Date.now()-r.radar.at<3000?r.radar.points:[]},returnIn:r.phase==='ended'?Math.max(0,(r.returnAt-Date.now())/1000):0,result:r.result||'',batteries:r.batteries||[],players:[...r.players.values()].map(({id,name,x,z,yaw,role,alive,escaped,carrying,stamina,volume,spawned,y,grounded,running,god,teleportId,hp})=>({id,name,x,z,yaw,role,alive,escaped,carrying,stamina,volume,spawned,hp:hp??100,y:y||0,grounded,running,god:!!god,teleportId:teleportId||0,canDev:name==='Pospa1Test'}))});
 function sound(r,p,kind){for(const q of r.players.values()){const range=kind==='step'?(p.running?15:9):18;const d=distance(p,q);if(q===p||q.spawned&&q.alive&&!q.escaped&&d<range*(q.role==='hunter'?1.15:1))send(q,{type:'sound',kind,x:p.x,z:p.z,source:p.id,gain:q===p?.65:Math.max(0,1-d/(range*(q.role==='hunter'?1.15:1)))*(clear(p,q)?1:.35)})}}
 const broadcast=r=>{const s=state(r);for(const p of r.players.values())send(p,s)};
 function finish(r){if(r.phase!=='playing')return;const survivors=[...r.players.values()].filter(p=>p.role==='survivor');if(!survivors.some(p=>p.alive&&!p.escaped)){r.phase='ended';r.returnAt=Date.now()+8000;r.result=survivors.some(p=>p.escaped)?'PŘEŽIVŠÍ UNIKLI':'HUNTEŘI VYHRÁLI'}else if(![...r.players.values()].some(p=>p.role==='hunter')){r.phase='ended';r.returnAt=Date.now()+8000;r.result='HUNTEŘI SE ODPOJILI'}}
 function leave(p){const r=rooms.get(p.room);if(!r)return;if(p.carrying)r.batteries.push({id:crypto.randomUUID(),x:p.x,z:p.z,y:supportHeight(p.x,p.z,p.y||0)});r.players.delete(p.id);p.room=null;if(!r.players.size)rooms.delete(r.code);else{if(r.host===p.id)r.host=r.players.keys().next().value;finish(r);broadcast(r)}}
 wss.on('connection',ws=>{
  if(clients.size>=100){ws.close(1013);return}
  const p={id:crypto.randomUUID(),voiceId:++voiceId,ws,name:'Hráč',x:0,z:20,yaw:0,role:'survivor',hp:100,alive:true,escaped:false,carrying:false,stamina:1,y:0,vy:0,grounded:true,running:false,god:false,teleportId:0,volume:0,input:{},lastVoice:0,rateAt:Date.now(),rate:0};clients.set(p.id,p);send(p,{type:'hello',id:p.id});
  ws.on('message',(raw,binary)=>{try{
   if(Date.now()-p.rateAt>1000){p.rateAt=Date.now();p.rate=0}if(++p.rate>100)return;
   let r=rooms.get(p.room);
   if(binary){if(!r||raw.length<6||raw.length>8196||raw.length%2!==0||Date.now()-p.lastVoice<18)return;p.lastVoice=Date.now();const v=raw.readFloatLE(0);p.volume=Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;for(const other of r.players.values()){if(other===p)continue;const gain=voiceGain(p,other,r.phase);if(gain>.005&&other.ws.readyState===1&&other.ws.bufferedAmount<65536){const out=Buffer.alloc(raw.length+8);raw.copy(out,12,4);out.writeFloatLE(gain,0);const dx=p.x-other.x,dz=p.z-other.z;out.writeFloatLE(r.phase==='playing'?(Math.cos(other.yaw)*dx-Math.sin(other.yaw)*dz)/Math.max(.01,distance(p,other)):0,4);out.writeUInt32LE(p.voiceId,8);other.ws.send(out)}}return}
   const m=JSON.parse(raw);if(!m||typeof m!=='object')return;
   if(m.type==='create'||m.type==='join'){
    if(p.room)return error(p,'Nejdřív opusť aktuální roomku.');
    p.name=String(m.name||'Hráč').trim().slice(0,20)||'Hráč';
    if(m.type==='create'){let code;do{code=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase()}while(rooms.has(code));r={code,host:p.id,players:new Map(),phase:'lobby',settings:{hunters:1,batteries:6,manual:false},batteries:[],deposited:0};rooms.set(code,r)}else r=rooms.get(String(m.code||'').trim().toUpperCase());
    if(!r)return error(p,'Roomka s tímto kódem neexistuje na tomto serveru.');if(r.phase!=='lobby')return error(p,'Kolo už běží. Počkej na lobby.');if(r.players.size>=10)return error(p,'Roomka je plná (10 hráčů).');p.room=r.code;r.players.set(p.id,p);broadcast(r);return;
   }
   if(!r)return;if(m.type==='leave'){leave(p);return}
   if(m.type==='dev'){const result=developerCommand(r,p,m);if(result.error)error(p,result.error);else{send(p,{type:'notice',message:result.message});broadcast(r)}return}
   if(m.type==='settings'&&r.host===p.id&&r.phase==='lobby'){r.settings={hunters:Math.max(1,Math.min(4,Math.floor(Number(m.hunters)||1))),batteries:Math.max(1,Math.min(24,Math.floor(Number(m.batteries)||6))),manual:!!m.manual};broadcast(r)}
   if(m.type==='role'&&r.host===p.id&&r.phase==='lobby'&&r.settings.manual){const target=r.players.get(m.id);if(target)target.role=target.role==='hunter'?'survivor':'hunter';broadcast(r)}
   if(m.type==='start'&&r.host===p.id&&r.phase==='lobby'){
    const ps=[...r.players.values()];if(ps.length<=r.settings.hunters)return error(p,'Musí zbýt alespoň jeden přeživší.');
    if(r.settings.manual&&ps.filter(p=>p.role==='hunter').length!==r.settings.hunters)return error(p,'Označ přesně nastavený počet hunterů.');
    if(!r.settings.manual){for(const p of ps)p.role='survivor';const shuffled=ps.slice();for(let i=shuffled.length-1;i>0;i--){const j=crypto.randomInt(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}for(let i=0;i<r.settings.hunters;i++)shuffled[i].role='hunter'}
    ps.forEach((p,i)=>Object.assign(p,{x:SPAWN.x+(i%5-2)*1.2,z:SPAWN.z+Math.floor(i/5),hp:100,alive:true,escaped:false,carrying:false,stamina:1,y:0,vy:0,grounded:true,running:false,god:false,teleportId:0,input:{},lastAttack:0,volume:0}));
    r.batteries=[];const available=FREE.filter(p=>distance(p,SPAWN)>7);for(let i=0;i<r.settings.batteries;i++){const at=crypto.randomInt(available.length),spot=available.splice(at,1)[0];r.batteries.push({id:crypto.randomUUID(),x:spot.x,z:spot.z})}
    for(const p of ps){p.spawned=p.role!=='hunter';if(!p.spawned){p.x=0;p.z=0}}
    r.phase='playing';r.deposited=0;r.release=Date.now()+10000;r.nextRadar=Date.now()+30000;r.radar=null;r.result='';broadcast(r);
   }
   if(m.type==='lobby'&&r.host===p.id&&r.phase==='ended'){resetLobby(r);broadcast(r)}
   if(m.type==='input'){p.input={forward:Math.max(-1,Math.min(1,Number(m.forward)||0)),side:Math.max(-1,Math.min(1,Number(m.side)||0)),sprint:!!m.sprint};if(Number.isFinite(m.yaw))p.yaw=m.yaw;p.inputAt=Date.now()}
   if(r.phase!=='playing'||!p.alive||p.escaped||!p.spawned)return;
   if(m.type==='jump'){jump(p);return}
   if(m.type==='drop'&&p.carrying){p.carrying=false;r.batteries.push({id:crypto.randomUUID(),x:p.x,z:p.z,y:supportHeight(p.x,p.z,p.y||0)});return}
   if(m.type==='interact'&&p.role==='survivor'){
    if(distance(p,SPAWN)<2.8){if(p.carrying){p.carrying=false;r.deposited++;sound(r,p,'deposit')}if(r.deposited>=r.settings.batteries){p.escaped=true;p.input={};finish(r)}}
    else if(!p.carrying){const i=r.batteries.findIndex(b=>distance(p,b)<1.8&&Math.abs((p.y||0)-(b.y||0))<1.6&&clear(p,b));if(i>=0){r.batteries.splice(i,1);p.carrying=true;sound(r,p,'pickup')}}
   }
   if(m.type==='attack'&&p.role==='hunter'&&Date.now()>=r.release&&Date.now()-(p.lastAttack||0)>900){p.lastAttack=Date.now();const targets=[...r.players.values()].filter(q=>q.role==='survivor'&&q.alive&&!q.escaped&&!q.god&&Math.abs((q.y||0)-(p.y||0))<1.6&&distance(p,q)<1.8&&clear(p,q));targets.sort((a,b)=>distance(a,p)-distance(b,p));const q=targets.find(q=>{const dx=q.x-p.x,dz=q.z-p.z;return (-Math.sin(p.yaw)*dx-Math.cos(p.yaw)*dz)/Math.max(.01,distance(p,q))>.2});if(q){q.hp=Math.max(0,(q.hp??100)-25);sound(r,q,'hit');if(q.hp===0){q.alive=false;if(q.carrying){q.carrying=false;r.batteries.push({id:crypto.randomUUID(),x:q.x,z:q.z,y:supportHeight(q.x,q.z,q.y||0)})}finish(r)}}}
  }catch{error(p,'Neplatná zpráva.')}});
  ws.isAlive=true;ws.on('pong',()=>ws.isAlive=true);
  ws.on('close',()=>{leave(p);clients.delete(p.id)});ws.on('error',()=>{});
 });
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue}ws.isAlive=false;ws.ping()}},25000);
 let tickCount=0;
 const timer=setInterval(()=>{for(const r of rooms.values()){
  advanceRoom(r);
  if(r.phase==='playing')for(const p of r.players.values()){
   if(Date.now()-p.lastVoice>300)p.volume=0;if(!p.alive||p.escaped||(p.role==='hunter'&&Date.now()<r.release))continue;
   const before={x:p.x,z:p.z};movePlayer(p);const moved=distance(before,p);if(p.grounded&&moved>.01){p.stepDistance=(p.stepDistance||0)+moved;if(p.stepDistance>(p.running?2.1:1.8)){p.stepDistance=0;sound(r,p,'step')}}else p.stepDistance=0;
  }
  if(tickCount%2===0)broadcast(r);
 }tickCount++},1000/30);
 return {server,rooms,clients,start:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>resolve(server.address().port))}),close:()=>new Promise(resolve=>{clearInterval(timer);clearInterval(heartbeat);for(const p of clients.values())p.ws.terminate();wss.close(()=>server.close(resolve))})};
}
if(require.main===module){const game=createGameServer(Number(process.env.PORT)||27840);game.start().then(p=>console.log('Dead Air server listening on '+p)).catch(e=>{console.error(e);process.exit(1)})}
module.exports={createGameServer,advanceRoom};
