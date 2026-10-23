/* Deterministic three-day heating challenge. No temperature overrides during play. */
(function(root){
'use strict';
const thermal=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.Thermal;
const DURATION=72*3600,TARGET=20,MAX_POWER=2500,SPEED=2880;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
// Continuous visual orbit, including the portion below the ground at night.
function sunTrackAt(time,width,horizon,radius=11){
 const hour=((time/3600)%24+24)%24,angle=2*Math.PI*(hour-6)/24;
 const elevation=Math.sin(angle),vertical=Math.sign(elevation)*Math.abs(elevation)**1.2;
 const margin=radius+7,span=Math.max(0,width/2-margin),arc=Math.max(radius,horizon-25);
 const x=width/2+span*Math.cos(angle),y=horizon-arc*vertical;
 return {x,y,radius,horizon,elevation,visible:y-radius<horizon,night:Math.max(0,Math.min(1,-elevation*4))};
}
class HeatingChallenge {
 constructor(model){this.model=model;this.active=false;this.state='ready';this.control='manual';this.powers=[0,0,0,0];}
 setup(control='manual'){
  if(!['manual','auto'].includes(control))throw Error('Unknown controller');
  const m=this.model;this.active=true;this.control=control;this.state='ready';
  m.scenario=null;m.p={...thermal.defaults,initial:20,ground:5,mixing:60,speed:SPEED};
  m.C=thermal.defaultC.map((v,i)=>i<4?v*8:v);m.R=thermal.defaultR.slice();m.initialMode='uniform';m.solver='spatial';m.mode='challenge';m.source=null;m.rebuild();
  m.scenario=this;this.solarWeights=[];
  for(let z=0;z<4;z++){
   const weights=new Float64Array(m.perZone);let sum=0;
   for(let j=0;j<m.rows;j++)for(let i=0;i<m.cols;i++){
    const distance=z%2?m.cols-1-i:i,w=Math.exp(-distance/4);weights[j*m.cols+i]=w;sum+=w;
   }
   for(let k=0;k<weights.length;k++)weights[k]/=sum;this.solarWeights.push(weights);
  }
  const ta=this.outdoorAt(0);
  for(let z=0;z<4;z++){
   const inside=1000/m.R[4+z],outside=1000/m.R[8+z];m.T[m.airN+z]=(inside*TARGET+outside*ta)/(inside+outside);
  }
  for(let z=0;z<2;z++){m.T[m.airN+8+z]=(TARGET+m.p.ground)/2;m.T[m.airN+10+z]=(TARGET+ta)/2;}
  this.absError=[0,0,0,0];this.squareError=[0,0,0,0];this.penalty=[0,0,0,0];this.comfort=[0,0,0,0];this.maxError=[0,0,0,0];this.roomEnergy=[0,0,0,0];this.clippedSteps=0;
  m.ratesAt(0);this.powers=this.requiredPowers(1).map(v=>Math.round(v/5)*5);
  this.initialEnergy=m.energy();return this;
 }
 outdoorAt(t){
  // Smooth cold front on day two; same curve for player and demonstration.
  const hours=t/3600;return -14+7*Math.cos(2*Math.PI*(hours-15)/24)-4*Math.exp(-(((hours-39)/11)**2));
 }
 solarAt(t){
  const hour=((t/3600)%24+24)%24,phase=clamp((hour-6)/12,0,1),height=hour>=6&&hour<=18?Math.sin(Math.PI*phase):0;
  const right=(1+Math.cos(Math.PI*phase))/2,left=1-right,day=Math.min(2,Math.floor(t/86400)),weather=[1,.7,1.1][day];
  const air=[],walls=[],roof=[];
  for(let z=0;z<4;z++){const exposure=.12+.88*(z%2?right:left),gain=height*weather*exposure;air.push((z<2?300:420)*gain);walls.push(85*gain);if(z>=2)roof.push(140*gain);}
  return {phase,height,x:1.12-1.24*phase,visible:height>1e-6,air,walls,roof,total:air.reduce((a,b)=>a+b,0)+walls.reduce((a,b)=>a+b,0)+roof.reduce((a,b)=>a+b,0)};
 }
 requiredPowers(dt){
  const m=this.model,powers=[];
  for(let z=0;z<4;z++){let passive=0,average=0;for(let k=0;k<m.perZone;k++){const a=z*m.perZone+k;passive+=m.rate[a];average+=m.T[a]/m.perZone;}
   const raw=-passive+(TARGET-average)*m.C[z]*1000/600;
   const value=clamp(raw,0,MAX_POWER);if(Math.abs(raw-value)>1e-6)this.clippedSteps++;powers.push(value);
  }
  return powers;
 }
 setPower(z,value){if(!this.active||this.state==='finished'||this.control!=='manual')return false;if(!Number.isInteger(z)||z<0||z>3||!Number.isFinite(value))return false;this.powers[z]=clamp(value,0,MAX_POWER);return true;}
 start(){if(this.state==='ready')this.state='running';}
 step(requestedDt){
  if(!this.active||this.state==='finished')return 0;if(!Number.isFinite(requestedDt)||requestedDt<=0)return 0;
  const m=this.model,dt=Math.min(requestedDt,m.maxDt,DURATION-m.time);if(dt<=1e-8){m.time=DURATION;this.state='finished';return 0;}
  this.start();const before=m.stats().zones;
  m.ratesAt(m.time+dt/2);if(this.control==='auto')this.powers=this.requiredPowers(dt);
  m.step(dt,this.powers,true);const after=m.stats().zones;
  for(let z=0;z<4;z++){
   const a=Math.abs(before[z]-TARGET),b=Math.abs(after[z]-TARGET);
   this.absError[z]+=(a+b)*dt/2;this.squareError[z]+=(a*a+b*b)*dt/2;
   this.penalty[z]+=(Math.min(a/4,1)+Math.min(b/4,1))*dt/2;
   this.comfort[z]+=((a<=.5?1:0)+(b<=.5?1:0))*dt/2;this.maxError[z]=Math.max(this.maxError[z],a,b);this.roomEnergy[z]+=this.powers[z]*dt;
  }
  if(m.time>=DURATION-1e-7){m.time=DURATION;this.state='finished';}return dt;
 }
 advance(seconds){let remaining=Math.max(0,seconds);while(remaining>1e-7&&this.state!=='finished'){const dt=this.step(Math.min(remaining,this.model.maxDt));if(!dt)break;remaining-=dt;}return seconds-remaining;}
 result(){const t=Math.max(this.model.time,1e-9),zones=this.absError.map((error,z)=>({mae:error/t,rmse:Math.sqrt(this.squareError[z]/t),maxError:this.maxError[z],comfort:100*this.comfort[z]/t,score:clamp(100*(1-this.penalty[z]/t),0,100),kWh:this.roomEnergy[z]/3600000}));return {score:zones.reduce((a,z)=>a+z.score,0)/4,mae:zones.reduce((a,z)=>a+z.mae,0)/4,comfort:zones.reduce((a,z)=>a+z.comfort,0)/4,kWh:this.roomEnergy.reduce((a,b)=>a+b,0)/3600000,zones,seconds:this.model.time,complete:this.state==='finished',control:this.control};}
}
const api={HeatingChallenge,DURATION,TARGET,MAX_POWER,SPEED,sunTrackAt};Object.assign(thermal,api);if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
