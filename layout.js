// One geometry definition is shared by the authoritative server and renderer.
(function(root){
 const SIZE=96,SPAWN={x:12,z:43},DOOR={x:12,z:47.65},WALLS=[],PROPS=[],ROOMS=[],PORTALS=[];
 function wall(x,z,w,d){WALLS.push({x,z,w,d})}
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){
  const x=-36+i*24,z=-36+j*24,type=(i*3+j*5)%4;
  ROOMS.push({x,z,type,label:String.fromCharCode(65+j)+(i+1)});
  if(!(i===2&&j===3)){
   // Freestanding dividers leave circulation routes around both ends.
   wall(x-5,z-3,.3,10);wall(x-1.8,z-8,6.7,.3);
   if(type===1){PROPS.push({type:'shelf',x:x+7,z:z-7,w:3,d:.65,h:2.25});PROPS.push({type:'shelf',x:x+7,z:z-3,w:3,d:.65,h:2.25})}
   else if(type===2){PROPS.push({type:'desk',x:x+6,z:z+5,w:2.2,d:1.05,h:.77});PROPS.push({type:'locker',x:x+8,z:z-7,w:1.4,d:.65,h:2.1})}
   else if(type===3)PROPS.push({type:'cabinet',x:x+7,z:z+6,w:1.6,d:.7,h:1.25});
  }
 }
 for(const x of [-24,0,24])for(const z of [-36,-12,12,36]){
  if(x===0&&z===36)continue;
  wall(x,z-7.1,.35,9.8);wall(x,z+7.1,.35,9.8);PORTALS.push({x,z,vertical:true});
 }
 for(const z of [-24,0,24])for(const x of [-36,-12,12,36]){wall(x-7.1,z,9.8,.35);wall(x+7.1,z,9.8,.35);PORTALS.push({x,z,vertical:false})}
 for(const room of ROOMS){const {x,z,type}=room;PROPS.push(
  {type:'crate',x:x-9,z:z+6,w:.9,d:.9,h:.55},
  {type:'crate',x:x-7.6,z:z+6,w:.85,d:.85,h:.85},
  {type:'bench',x:x+5,z:z+9,w:2.4,d:.6,h:.48},
  {type:'chair',x:x+3.8,z:z+5.2,w:.65,d:.65,h:.95},
  {type:'barrel',x:x-9,z:z-2,w:.72,d:.72,h:.95},
  {type:'cart',x:x+9,z:z+1,w:1.1,d:.7,h:.9},
  {type:'bin',x:x+9,z:z+8,w:.45,d:.45,h:.6},
  {type:'pallet',x:x+2,z:z-5,w:1.4,d:1.15,h:.18});
  if(type===0)PROPS.push({type:'desk',x:x+5,z:z-4,w:2.2,d:1.05,h:.77});
 }
 const COLLIDERS=[...WALLS,...PROPS];
 function blocked(x,z,r=.35){return Math.abs(x)>SIZE/2-r||Math.abs(z)>SIZE/2-r||COLLIDERS.some(w=>Math.abs(x-w.x)<w.w/2+r&&Math.abs(z-w.z)<w.d/2+r)}
 function blockedAt(x,z,y=0,r=.35){return Math.abs(x)>SIZE/2-r||Math.abs(z)>SIZE/2-r||COLLIDERS.some(w=>(w.h||3.8)>y+.025&&Math.abs(x-w.x)<w.w/2+r&&Math.abs(z-w.z)<w.d/2+r)}
 function supportHeight(x,z,maxHeight){let floor=0;for(const p of PROPS)if(p.h<=maxHeight+.035&&Math.abs(x-p.x)<p.w/2+.28&&Math.abs(z-p.z)<p.d/2+.28)floor=Math.max(floor,p.h);return floor}
 const FREE=[];for(let x=-45;x<=45;x+=3)for(let z=-45;z<=45;z+=3)if(!blocked(x,z,.8))FREE.push({x,z});
 const world={SIZE,SPAWN,DOOR,WALLS,PROPS,ROOMS,PORTALS,COLLIDERS,FREE,blocked,blockedAt,supportHeight};
 if(typeof module!=='undefined'&&module.exports)module.exports=world;else root.DEAD_AIR_WORLD=world;
})(globalThis);
