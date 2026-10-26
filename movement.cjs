const {blockedAt,supportHeight}=require('./public/layout.js');
const CARRY_FACTOR=.78;
function jump(p){if(!p.grounded||!p.alive||!p.spawned||p.escaped)return false;p.vy=6.8;p.grounded=false;return true}
function movePlayer(p,dt=1/30,now=Date.now()){
 const input=now-p.inputAt<300?p.input:{};let f=input.forward||0,s=input.side||0;const length=Math.hypot(f,s);if(length>1){f/=length;s/=length}
 p.running=!!(input.sprint&&p.stamina>.03&&length>0);const speed=(p.role==='hunter'?(p.running?7.6:4.4):(p.running?7.4:4.2))*(p.carrying?CARRY_FACTOR:1);
 p.stamina=Math.max(0,Math.min(1,p.stamina+(p.running?-.15:.15)*dt));
 p.y=p.y||0;p.vy=p.vy||0;
 const dx=(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)*speed*dt,dz=(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)*speed*dt;
 if(!blockedAt(p.x+dx,p.z,p.y))p.x+=dx;if(!blockedAt(p.x,p.z+dz,p.y))p.z+=dz;
 const floor=supportHeight(p.x,p.z,p.y);p.vy-=20*dt;let next=p.y+p.vy*dt;
 const ceiling=p.role==='hunter'?1.15:2.02;if(next>ceiling){next=ceiling;p.vy=Math.min(0,p.vy)}
 if(p.vy<=0&&next<=floor){p.y=floor;p.vy=0;p.grounded=true}else{p.y=Math.max(0,next);p.grounded=false}
}
module.exports={jump,movePlayer,CARRY_FACTOR};
