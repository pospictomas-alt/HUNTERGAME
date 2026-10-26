const {SPAWN,ROOMS,FREE,blocked}=require('./public/layout.js');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const isDeveloper=p=>p.name==='Pospa1Test';
function nearby(center,count=1){const points=[];for(let radius=1.3;radius<=10&&points.length<count;radius+=.7)for(let i=0;i<24&&points.length<count;i++){const x=center.x+Math.cos(i/24*Math.PI*2)*radius,z=center.z+Math.sin(i/24*Math.PI*2)*radius;if(!blocked(x,z,.42)&&points.every(p=>dist(p,{x,z})>.65))points.push({x,z})}if(!points.length)points.push([...FREE].sort((a,b)=>dist(a,center)-dist(b,center))[0]);return points}
function teleport(p,point){Object.assign(p,{x:point.x,z:point.z,y:0,vy:0,grounded:true,input:{},inputAt:0,running:false,teleportId:(p.teleportId||0)+1})}
function developerCommand(r,p,m){
 if(!isDeveloper(p))return {error:'Vývojové menu není pro toto jméno dostupné.'};
 if(r.phase!=='playing')return {error:'Testovací příkazy jsou dostupné během kola.'};
 if(!p.alive||p.escaped||!p.spawned)return {error:'Nejdřív musíš být živý a spawnutý ve hře.'};
 const selected=()=>r.batteries.find(b=>b.id===m.target);
 const player=()=>r.players.get(m.target);
 switch(m.action){
  case 'battery_here':{const b=selected()||(!m.target?[...r.batteries].sort((a,b)=>dist(a,p)-dist(b,p))[0]:null);if(!b)return {error:'Tato položená baterie už není dostupná.'};Object.assign(b,nearby(p)[0],{y:0});return {message:'Baterie přesunuta k tobě.'}}
  case 'batteries_here':case 'batteries_spawn':{const points=nearby(m.action==='batteries_here'?p:SPAWN,r.batteries.length);r.batteries.forEach((b,i)=>Object.assign(b,points[i%points.length],{y:0}));return {message:`Přesunuto ${r.batteries.length} položených baterií. Nesené zůstávají hráčům.`}}
  case 'teleport_spawn':teleport(p,SPAWN);return {message:'Teleport na spawn.'};
  case 'teleport_sector':{const room=ROOMS.find(q=>q.label===m.target);if(!room)return {error:'Neplatný sektor.'};teleport(p,blocked(room.x,room.z)?nearby(room)[0]:room);return {message:'Teleport do sektoru '+room.label+'.'}}
  case 'teleport_battery':{const b=selected();if(!b)return {error:'Vyber dostupnou baterii.'};teleport(p,nearby(b)[0]);return {message:'Teleport k baterii.'}}
  case 'player_here':case 'to_player':{const q=player();if(!q||q===p||!q.alive||q.escaped||!q.spawned)return {error:'Vyber jiného živého hráče ve stejné roomce.'};if(m.action==='player_here')teleport(q,nearby(p)[0]);else teleport(p,nearby(q)[0]);return {message:'Hráč teleportován.'}}
  case 'stamina':p.stamina=1;return {message:'Výdrž doplněna.'};
  case 'god':p.god=!p.god;return {message:p.god?'Nezranitelnost zapnutá.':'Nezranitelnost vypnutá.'};
  case 'release':r.release=Date.now();return {message:'Hunteři uvolněni.'};
  case 'radar':r.nextRadar=0;return {message:'Radarový pulz spuštěn.'};
  default:return {error:'Neznámý vývojový příkaz.'};
 }
}
module.exports={isDeveloper,developerCommand};
