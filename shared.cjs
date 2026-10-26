const {SIZE,SPAWN,WALLS,PROPS,FREE,blocked,blockedAt}=require('./public/layout.js');
function clear(a,b){const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)*5);for(let i=1;i<n;i++)if(blockedAt(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,(a.y||0)+((b.y||0)-(a.y||0))*i/n+1.2,0))return false;return true}
function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
function voiceGain(a,b,phase){if(phase!=='playing')return 1;if(a.spawned===false||b.spawned===false||a.alive!==b.alive||a.escaped!==b.escaped)return 0;const range=(4+16*(a.volume||0))*(b.role==='hunter'?1.15:1);const d=distance(a,b);return d>=range?0:Math.pow(1-d/range,1.2)*(clear(a,b)?1:.45)}
module.exports={SIZE,SPAWN,WALLS,PROPS,FREE,blocked,clear,distance,voiceGain};
