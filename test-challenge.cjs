const assert=require('node:assert/strict');
const{ThermalModel,defaultC,defaultR}=require('./engine.js');
const{HeatingChallenge,DURATION,MAX_POWER,SPEED,sunTrackAt}=require('./challenge.js');
const near=(a,b,tolerance=1e-7)=>assert(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
let count=0;function check(name,fn){fn();count++;console.log('PASS',name);}
function make(control='manual'){const model=new ThermalModel(),game=new HeatingChallenge(model);game.setup(control);return{model,game};}
check('Fixed scenario ignores prior laboratory parameters',()=>{
 const model=new ThermalModel({ground:23,initial:-5,mixing:1,dayMin:15});model.C.fill(1);model.R.fill(1);model.solver='rc';
 const game=new HeatingChallenge(model);game.setup();assert.deepEqual(model.C,defaultC.map((v,i)=>i<4?v*8:v));assert.deepEqual(model.R,defaultR);assert.equal(model.p.ground,5);assert.equal(model.p.mixing,60);assert.equal(model.solver,'spatial');assert.deepEqual(model.stats().zones.map(t=>Math.round(t*1e9)/1e9),[20,20,20,20]);
});
check('Sun moves right to left; heating follows orientation and is off at night',()=>{
 const{game}=make();const am=game.solarAt(9*3600),pm=game.solarAt(15*3600);
 assert(am.x>pm.x);assert(am.air[1]>am.air[0]);assert(am.air[3]>am.air[2]);assert(pm.air[0]>pm.air[1]);assert(pm.air[2]>pm.air[3]);
 near(game.solarAt(0).total,0);near(game.solarAt(23*3600).total,0);assert(am.total>0);assert(am.walls.every(v=>v>0));assert(am.roof.every(v=>v>0));
});
check('90-second run and continuous sunrise/sunset at scene edges',()=>{
 near(DURATION/SPEED,90);
 for(const [width,horizon] of [[1000,327],[356,247]]){
  const rise=sunTrackAt(6*3600,width,horizon),noon=sunTrackAt(12*3600,width,horizon),set=sunTrackAt(18*3600,width,horizon);
  assert(rise.x>width-30);assert(set.x<30);near(rise.y,horizon);near(set.y,horizon);near(noon.x,width/2);assert(noon.y<horizon-100);
  const before=sunTrackAt(17.95*3600,width,horizon),after=sunTrackAt(18.05*3600,width,horizon),night=sunTrackAt(18.5*3600,width,horizon);
  assert(before.y<horizon&&after.y>horizon);assert(before.visible&&after.visible);assert(after.y-after.radius<horizon);assert(!night.visible);
  assert(Math.abs(before.x-after.x)<1);assert(Math.abs(before.y-after.y)<10);
  for(let minutes=0;minutes<=1440;minutes+=5){const p=sunTrackAt(minutes*60,width,horizon);assert(p.x>=p.radius&&p.x<=width-p.radius);}
  near(sunTrackAt(0,width,horizon).x,sunTrackAt(24*3600,width,horizon).x);near(sunTrackAt(0,width,horizon).y,sunTrackAt(24*3600,width,horizon).y);
 }
});
check('Day-three storm is continuous, colder first, then retains an insulating snow cover',()=>{
 const {game}=make(),before=game.weatherAt(48*3600-1),start=game.weatherAt(48*3600),storm=game.weatherAt(53*3600),late=game.weatherAt(66*3600);
 assert(!before.active);assert(start.active);near(start.wind,0);near(start.snow,0);near(start.coldDrop,0);
 assert(storm.wind>.9);assert(storm.snowfall>.9);assert(storm.coldDrop>7);assert(storm.snow<.2);
 near(late.wind,0);near(late.snowfall,0);near(late.snowCm,20);near(late.roofResistance,3.5);near(late.roofTransfer,2/4.5);
 near(game.weatherAt(DURATION).snowCm,20);assert(game.solarAt(57*3600).total<game.solarAt(9*3600).total*.3);
 const nominal=t=>-14+7*Math.cos(2*Math.PI*(t/3600-15)/24)-4*Math.exp(-(((t/3600-39)/11)**2));
 near(game.outdoorAt(53*3600),nominal(53*3600)-storm.coldDrop);
 for(const t of [48,50,51,52,56,57,60,61,62,66]){
  const a=game.weatherAt(t*3600-.01),b=game.weatherAt(t*3600+.01);
  for(const key of ['wind','snowfall','snowCm','coldDrop','windowFactor','wallFactor','roofFactor'])assert(Math.abs(a[key]-b[key])<.001,key);
 }
});
check('Wind increases boundary heat loss; snow reduces roof loss at equal temperatures',()=>{
 const {game,model}=make(),weather=game.weatherAt.bind(game);
 model.T.fill(20);model.outdoorAt=()=>-20;
 game.solarAt=()=>({air:[0,0,0,0],walls:[0,0,0,0],roof:[0,0]});
 game.weatherAt=()=>weather(0);model.ratesAt(0);const bare=model.lastBoundaryRate,bareRoof=model.rate[model.airN+10];
 game.weatherAt=()=>({...weather(0),windowFactor:1.18,wallFactor:1.25,roofFactor:1.25});model.ratesAt(0);assert(model.lastBoundaryRate<bare);assert(model.rate[model.airN+10]<bareRoof);
 game.weatherAt=()=>weather(66*3600);model.ratesAt(0);assert(model.lastBoundaryRate>bare);near(model.rate[model.airN+10],bareRoof/3.5);
 // Conservative time step remains stable even at the highest allowed wind exchange.
 for(let a=0;a<model.n;a++){
  let loss=model.loss[a];for(let e=0;e<model.ba.length;e++)if(model.ba[e]===a&&!model.bt[e])loss+=model.bg[e]*.25;
  if(loss)assert(model.maxDt<=.88*model.cap[a]/loss+1e-9);
 }
});
check('Accumulated snow reduces three-day heating energy with identical cold weather',()=>{
 const insulated=make('auto'),bare=make('auto'),weather=bare.game.weatherAt.bind(bare.game);
 bare.game.weatherAt=t=>{const w=weather(t);return {...w,roofFactor:1+.25*w.wind,roofResistance:1};};
 insulated.game.advance(DURATION);bare.game.advance(DURATION);
 assert(insulated.game.result().score>99.999999);assert(bare.game.result().score>99.999999);
 assert(insulated.game.result().kWh<bare.game.result().kWh-.05);
 for(const z of [2,3])assert(insulated.game.powers[z]<bare.game.powers[z]);
 console.log('  Snow blanket saves:',bare.game.result().kWh-insulated.game.result().kWh,'kWh compared with the same storm and bare roof');
});
check('Room heaters are independent and bounded',()=>{
 const a=make(),b=make();a.game.powers=[0,0,0,0];b.game.powers=[0,0,0,0];b.game.setPower(2,1000);a.game.step(10);b.game.step(10);
 for(let z=0;z<4;z++){const change=b.model.stats().zones[z]-a.model.stats().zones[z];near(change,z===2?1000*10/(b.model.C[2]*1000):0);}
 assert.equal(b.game.setPower(-1,100),false);assert.equal(b.game.setPower(0,NaN),false);b.game.setPower(0,1e9);assert.equal(b.game.powers[0],MAX_POWER);
});
let auto;
check('Automatic demonstration keeps all four means at 20 through all 72 hours',()=>{
 auto=make('auto');const{game,model}=auto;let worst=0,minPower=Infinity,maxPower=-Infinity;
 while(game.state!=='finished'){
  game.step(30);for(const t of model.stats().zones)worst=Math.max(worst,Math.abs(t-20));for(const p of game.powers){minPower=Math.min(minPower,p);maxPower=Math.max(maxPower,p);}
 }
 const r=game.result();assert.equal(model.time,DURATION);assert(r.complete);assert(r.score>99.999999);assert(r.mae<1e-9);assert(worst<1e-9);assert.equal(game.clippedSteps,0);assert(minPower>=0&&maxPower<=MAX_POWER);assert.equal(game.setPower(0,0),false);
 console.log('  Max mean error:',worst,'°C; power range:',minPower,maxPower,'W; score:',r.score);
});
check('Solar, heater and boundary energy close the global balance',()=>{
 const{model,game}=auto;assert(model.solarEnergy>0);assert(model.deliveredEnergy>0);
 near(model.energy()-game.initialEnergy,model.boundaryEnergy+model.deliveredEnergy+model.solarEnergy,.001);
 near(game.result().kWh,model.deliveredEnergy/3600000,1e-8);
});
check('Completed simulation cannot overrun 72 hours or change afterward',()=>{
 const{model,game}=auto,before=model.T.slice(),score=game.result().score;game.advance(DURATION);assert.equal(model.time,DURATION);assert.deepEqual(model.T,before);near(game.result().score,score);
});
check('Manual score is integrated from actual errors, equally for each room',()=>{
 const{model,game}=make();game.powers=[0,0,0,0];const integral=[0,0,0,0],penalty=[0,0,0,0];
 while(game.state!=='finished'){
  const before=model.stats().zones,t=model.time;game.step(30);const dt=model.time-t,after=model.stats().zones;
  for(let z=0;z<4;z++){integral[z]+=(Math.abs(before[z]-20)+Math.abs(after[z]-20))*dt/2;penalty[z]+=(Math.min(Math.abs(before[z]-20)/4,1)+Math.min(Math.abs(after[z]-20)/4,1))*dt/2;}
 }
 const r=game.result();for(let z=0;z<4;z++){near(r.zones[z].mae,integral[z]/DURATION);near(r.zones[z].score,100*(1-penalty[z]/DURATION));}
 near(r.score,r.zones.reduce((a,b)=>a+b.score,0)/4);assert(r.score<50);assert(r.score>=0&&r.score<=100);near(r.kWh,0);
 console.log('  No-heating score:',r.score,'/100; mean error:',r.mae,'°C');
});
check('Same inputs reproduce the same temperatures and score',()=>{
 const a=make('auto');a.game.advance(DURATION);assert.deepEqual(a.model.T,auto.model.T);near(a.game.result().score,auto.game.result().score);
});
check('Restart clears accumulated penalties, energy, and elapsed time',()=>{
 const{model,game}=auto;game.setup('manual');assert.equal(model.time,0);near(game.result().mae,0);near(game.result().kWh,0);near(model.solarEnergy,0);assert.equal(game.state,'ready');assert.equal(game.control,'manual');
});
console.log(`${count} challenge checks passed.`);
