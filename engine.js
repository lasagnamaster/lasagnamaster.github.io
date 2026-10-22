/* Thermal RC graph, SI units internally. See README for spatial extension. */
(function(root){
'use strict';
const fitted={"parameters":[180.4546843294076,599.0115768699009,798.733440044449,1032.6696612798742,39881.81766005784,21985.782796401574,25689.91530776833,20488.451196709182,4853.180007920469,10677.883846784307,10496.963340162365,5420.986115925952,9934.09899682918,9888.328730733372,11274.596682626694,9654.535234304165,18.904605657196186,40.39012350442666,37.60084220817152,59.72441655708193,763.1130990255167,567.8597646515254,661.6498199050309,552.7695847796128,87.97682697999183,87.09583771090593,115.39964483915502,121.189563836171,191.53113679676176,76.43347698561347,142.96661199393728,182.6036706163286,27.806889010716844,38.31276140092575,23.372637837211776,27.738279793796888],"x0":[17.4,18.0,20.0,21.0,19.348588390309168,19.467206563983822,20.20164335119959,21.315081565991253,14.625145988475149,19.456831212929583,20.857238763437728,18.106801253706898,12.440077381458464,12.4127163366708,20.26453969293158,22.63418769995261],"C":[180.4546843294076,599.0115768699009,798.733440044449,1032.6696612798742,39881.81766005784,21985.782796401574,25689.91530776833,20488.451196709182,4853.180007920469,10677.883846784307,10496.963340162365,5420.986115925952,9934.09899682918,9888.328730733372,11274.596682626694,9654.535234304165],"K":[[1077.789207475805,0.0,0.0,0.0,-763.1130990255167,0.0,0.0,0.0,-191.53113679676176,-76.43347698561347,0.0,0.0,-27.806889010716844,0.0,0.0,0.0],[0.0,981.0603983475769,0.0,0.0,0.0,-567.8597646515254,0.0,0.0,-191.53113679676176,0.0,-142.96661199393728,0.0,0.0,-38.31276140092575,0.0,0.0],[0.0,0.0,981.6604475523562,0.0,0.0,0.0,-661.6498199050309,0.0,0.0,-76.43347698561347,0.0,-182.6036706163286,0.0,0.0,-23.372637837211776,0.0],[0.0,0.0,0.0,965.8025637407575,0.0,0.0,0.0,-552.7695847796128,0.0,0.0,-142.96661199393728,-182.6036706163286,0.0,0.0,0.0,-27.738279793796888],[-763.1130990255167,0.0,0.0,0.0,851.0899260055086,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],[0.0,-567.8597646515254,0.0,0.0,0.0,654.9556023624314,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,-661.6498199050309,0.0,0.0,0.0,777.0494647441859,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,-552.7695847796128,0.0,0.0,0.0,673.9591486157839,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],[-191.53113679676176,-191.53113679676176,0.0,0.0,0.0,0.0,0.0,0.0,383.0622735935235,0.0,0.0,0.0,0.0,0.0,0.0,0.0],[-76.43347698561347,0.0,-76.43347698561347,0.0,0.0,0.0,0.0,0.0,0.0,152.86695397122693,0.0,0.0,0.0,0.0,0.0,0.0],[0.0,-142.96661199393728,0.0,-142.96661199393728,0.0,0.0,0.0,0.0,0.0,0.0,285.93322398787456,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,-182.6036706163286,-182.6036706163286,0.0,0.0,0.0,0.0,0.0,0.0,0.0,365.2073412326572,0.0,0.0,0.0,0.0],[-27.806889010716844,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,55.61377802143369,0.0,0.0,0.0],[0.0,-38.31276140092575,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,76.6255228018515,0.0,0.0],[0.0,0.0,-23.372637837211776,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,46.74527567442355,0.0],[0.0,0.0,0.0,-27.738279793796888,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,55.476559587593776]],"F":[[1.0,0.0,0.0,0.0,18.904605657196186,0.0],[0.0,1.0,0.0,0.0,40.39012350442666,0.0],[0.0,0.0,1.0,0.0,37.60084220817152,0.0],[0.0,0.0,0.0,1.0,59.72441655708193,0.0],[0.0,0.0,0.0,0.0,87.97682697999183,0.0],[0.0,0.0,0.0,0.0,87.09583771090593,0.0],[0.0,0.0,0.0,0.0,115.39964483915502,0.0],[0.0,0.0,0.0,0.0,121.189563836171,0.0],[0.0,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,27.806889010716844],[0.0,0.0,0.0,0.0,0.0,38.31276140092575],[0.0,0.0,0.0,0.0,23.372637837211776,0.0],[0.0,0.0,0.0,0.0,27.738279793796888,0.0]],"state_names":["T1","T2","T3","T4","O1","O2","O3","O4","V12","V13","V24","V34","F1","F2","P3","P4"]};
const names=['C1','C2','C3','C4','Co1','Co2','Co3','Co4','C12','C13','C24','C34','Cf1','Cf2','Cr3','Cr4'];
const rNames=['Rw1','Rw2','Rw3','Rw4','Ro1b','Ro2b','Ro3b','Ro4b','Ro1a','Ro2a','Ro3a','Ro4a','R12','R13','R24','R34','Rf1','Rf2','Rr3','Rr4'];
const defaultC=fitted.C.slice(), defaultR=fitted.parameters.slice(16).map(g=>3600/g);
const defaults={outside:-5,ground:5,initial:20,power:1400,radius:10,mixing:12,dayMin:-25,dayMax:30,peakHour:15,speed:1800};
class ThermalModel {
 constructor(parameters={}) {this.p={...defaults,...parameters};this.C=defaultC.slice();this.R=defaultR.slice();this.initials=fitted.x0.slice();this.initialMode='uniform';this.mode='heater';this.solver='spatial';this.source=null;this.rebuild();}
 zoneAt(x,y){if(x<0||x>1||y<0||y>.6)return -1;return(y>=.3?2:0)+(x>=.5?1:0);}
 // Air: 20 × 14 cells per zone, with capacities summing exactly to fitted C_i.
 rebuild() {
  const oldSource=this.source;this.cols=this.solver==='rc'?1:20;this.rows=this.solver==='rc'?1:14;
  this.perZone=this.cols*this.rows;this.airN=4*this.perZone;this.n=this.airN+12;
  this.T=new Float64Array(this.n);this.cap=new Float64Array(this.n);this.loss=new Float64Array(this.n);this.rate=new Float64Array(this.n);
  const ea=[],eb=[],eg=[],ba=[],bg=[],bt=[];
  const add=(a,b,g)=>{ea.push(a);eb.push(b);eg.push(g);this.loss[a]+=g;this.loss[b]+=g;};
  const bound=(a,g,t)=>{ba.push(a);bg.push(g);bt.push(t);this.loss[a]+=g;};
  const struct=id=>this.airN+id-4, g=r=>1000/this.R[r];
  const face=(zone,side)=>{
    const out=[];for(let j=0;j<this.rows;j++)for(let i=0;i<this.cols;i++)if(side==='all'||side==='left'&&i===0||side==='right'&&i===this.cols-1||side==='top'&&j===this.rows-1||side==='bottom'&&j===0)out.push(zone*this.perZone+j*this.cols+i);return out;
  };
  const connect=(cells,node,conductance)=>{for(const a of cells)add(a,node,conductance/cells.length);};
  for(let z=0;z<4;z++) {
    for(let j=0;j<this.rows;j++)for(let i=0;i<this.cols;i++) {
      const a=z*this.perZone+j*this.cols+i;this.cap[a]=this.C[z]*1000/this.perZone;
      if(i+1<this.cols)add(a,a+1,this.p.mixing);
      if(j+1<this.rows)add(a,a+this.cols,this.p.mixing*(this.rows/this.cols)**2);
    }
    const exterior=face(z,z%2?'right':'left');
    connect(exterior,struct(z+4),g(4+z));
    for(const a of exterior)bound(a,g(z)/exterior.length,0); // window branch
    bound(struct(z+4),g(8+z),0);
  }
  [[0,1,'right','left'],[0,2,'top','bottom'],[1,3,'top','bottom'],[2,3,'right','left']].forEach(([a,b,sa,sb],k)=>{
    connect(face(a,sa),struct(8+k),g(12+k));connect(face(b,sb),struct(8+k),g(12+k));
  });
  for(let z=0;z<2;z++){connect(face(z,'bottom'),struct(12+z),g(16+z));bound(struct(12+z),g(16+z),1);}
  for(let z=2;z<4;z++){connect(face(z,'top'),struct(12+z),g(16+z));bound(struct(12+z),g(16+z),0);}
  for(let k=4;k<16;k++)this.cap[struct(k)]=this.C[k]*1000;
  this.ea=Int32Array.from(ea);this.eb=Int32Array.from(eb);this.eg=Float64Array.from(eg);
  this.ba=Int32Array.from(ba);this.bg=Float64Array.from(bg);this.bt=Uint8Array.from(bt);
  this.maxDt=30;for(let a=0;a<this.n;a++)if(this.loss[a])this.maxDt=Math.min(this.maxDt,.88*this.cap[a]/this.loss[a]);
  this.reset();this.setSource(oldSource);return this;
 }
 reset(){for(let a=0;a<this.n;a++){const z=a<this.airN?Math.floor(a/this.perZone):a-this.airN+4;this.T[a]=this.initialMode==='fitted'?this.initials[z]:this.p.initial;}this.time=0;this.deliveredEnergy=0;this.boundaryEnergy=0;}
 setSource(source){
  this.source=null;this.weights=new Float64Array(this.n);this.heaterCells=[];if(!source)return false;
  const z=this.zoneAt(source.x,source.y);if(z<0)return false;this.source={...source};
  const centerX=(source.x-(z%2)*.5)/.5,centerY=(source.y-Math.floor(z/2)*.3)/.3;
  const sigma=this.p.radius/100;let sum=0;
  for(let j=0;j<this.rows;j++)for(let i=0;i<this.cols;i++){
    const a=z*this.perZone+j*this.cols+i,d2=((i+.5)/this.cols-centerX)**2+(((j+.5)/this.rows-centerY)*.6)**2;
    const w=this.solver==='rc'?1:Math.exp(-d2/(2*sigma*sigma));this.weights[a]=w;sum+=w;this.heaterCells.push(a);
  }
  for(const a of this.heaterCells)this.weights[a]/=sum;return true;
 }
 outdoorAt(t=this.time){const p=this.p;return this.mode==='day'?(p.dayMin+p.dayMax)/2+(p.dayMax-p.dayMin)/2*Math.cos(2*Math.PI*(t/3600-p.peakHour)/24):p.outside;}
 step(dt){
  const T=this.T,q=this.rate;q.fill(0);let boundary=0;
  for(let e=0;e<this.ea.length;e++){const a=this.ea[e],b=this.eb[e],v=this.eg[e]*(T[b]-T[a]);q[a]+=v;q[b]-=v;}
  const outside=this.outdoorAt(this.time+dt/2);
  for(let e=0;e<this.ba.length;e++){const a=this.ba[e],v=this.bg[e]*((this.bt[e]?this.p.ground:outside)-T[a]);q[a]+=v;boundary+=v;}
  const power=this.mode==='heater'&&this.source?this.p.power:0;if(power)for(const a of this.heaterCells)q[a]+=power*this.weights[a];
  for(let a=0;a<this.n;a++)T[a]+=dt*q[a]/this.cap[a];
  this.time+=dt;this.deliveredEnergy+=power*dt;this.boundaryEnergy+=boundary*dt;
 }
 advance(seconds,maxSteps=Infinity){let rest=seconds,steps=0;while(rest>1e-8&&steps<maxSteps){const dt=Math.min(this.maxDt,rest);this.step(dt);rest-=dt;steps++;}return seconds-rest;}
 energy(){let e=0;for(let a=0;a<this.n;a++)e+=this.cap[a]*this.T[a];return e;}
 stats(){const zones=[0,0,0,0];let min=Infinity,max=-Infinity;for(let a=0;a<this.airN;a++){zones[Math.floor(a/this.perZone)]+=this.T[a]/this.perZone;min=Math.min(min,this.T[a]);max=Math.max(max,this.T[a]);}return {zones,min,max,outside:this.outdoorAt()};}
 structure(id){return this.T[this.airN+id-4];}
 sample(x,y){const z=this.zoneAt(x,y);if(z<0)return null;const i=Math.min(this.cols-1,Math.max(0,Math.floor((x-z%2*.5)/.5*this.cols))),j=Math.min(this.rows-1,Math.max(0,Math.floor((y-Math.floor(z/2)*.3)/.3*this.rows)));return {temperature:this.T[z*this.perZone+j*this.cols+i],zone:z};}
}
root.Thermal={ThermalModel,defaults,defaultC,defaultR,names,rNames,fitted};if(typeof module!=='undefined')module.exports=root.Thermal;
})(typeof window!=='undefined'?window:globalThis);
