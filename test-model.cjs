const assert=require('node:assert/strict');
const{ThermalModel,defaultC,defaultR,fitted}=require('./engine.js');
const checks=[];function check(name,fn){fn();checks.push(name);console.log('PASS',name);}
function near(a,b,tol=1e-8){assert(Math.abs(a-b)<tol,`${a} != ${b}`);}
check('RC derivative matches saved K,F in SI units',()=>{
 const m=new ThermalModel();m.solver='rc';m.initialMode='fitted';m.rebuild();m.p.outside=-13;m.setSource({x:.25,y:.15});m.p.power=1388.8888889;
 const before=m.T.slice(),dt=.01;m.step(dt);
 const input=[5000,0,0,0,-13,5];
 for(let i=0;i<16;i++){
  const dx=(-fitted.K[i].reduce((sum,k,j)=>sum+k*before[j],0)+fitted.F[i].reduce((sum,f,j)=>sum+f*input[j],0))/fitted.C[i]/3600;
  near((m.T[i]-before[i])/dt,dx,1e-9);
 }
});
check('All 36 fitted parameters and branch totals are preserved',()=>{
 const m=new ThermalModel();for(let z=0;z<4;z++){let c=0;for(let a=z*m.perZone;a<(z+1)*m.perZone;a++)c+=m.cap[a];near(c,defaultC[z]*1000,1e-6);}
 for(let z=4;z<16;z++)near(m.cap[m.airN+z-4],defaultC[z]*1000);
 const rc=new ThermalModel();rc.solver='rc';rc.rebuild();
 const aggregate=m=>{
  const k=Array.from({length:16},()=>new Float64Array(16)),f=Array.from({length:16},()=>new Float64Array(2));const id=a=>a<m.airN?Math.floor(a/m.perZone):a-m.airN+4;
  for(let e=0;e<m.ea.length;e++){const a=id(m.ea[e]),b=id(m.eb[e]),g=m.eg[e];if(a===b)continue;k[a][a]+=g;k[b][b]+=g;k[a][b]-=g;k[b][a]-=g;}
  for(let e=0;e<m.ba.length;e++){const a=id(m.ba[e]),g=m.bg[e];k[a][a]+=g;f[a][m.bt[e]]+=g;}
  return{k,f};
 };
 const a=aggregate(m),b=aggregate(rc);for(let i=0;i<16;i++){for(let j=0;j<16;j++)near(a.k[i][j],b.k[i][j]);for(let j=0;j<2;j++)near(a.f[i][j],b.f[i][j]);}
});
for(const solver of ['rc','spatial'])check(`${solver}: exact global energy accounting`,()=>{
 const m=new ThermalModel();m.solver=solver;m.rebuild();m.setSource({x:.15,y:.1});const e0=m.energy();m.advance(3600);
 near(m.energy()-e0,m.deliveredEnergy+m.boundaryEnergy,.001);
 near(m.deliveredEnergy,1400*3600,.001);
});
check('Uniform equilibrium stays uniform',()=>{
 const m=new ThermalModel({outside:20,ground:20,initial:20});m.advance(86400);for(const t of m.T)near(t,20);
});
check('Point heating starts locally and spreads, source sums to chosen power',()=>{
 const m=new ThermalModel({outside:20,ground:20,initial:20});m.setSource({x:.15,y:.12});near(m.weights.reduce((a,b)=>a+b,0),1);
 m.advance(60);assert(m.sample(.15,.12).temperature>m.sample(.4,.25).temperature+.2);const nearStart=m.sample(.3,.12).temperature;m.advance(3600);assert(m.sample(.3,.12).temperature>nearStart);assert(m.stats().zones[0]>m.stats().zones[1]);
});
check('Daily mode varies only outside input and disables existing heater',()=>{
 const m=new ThermalModel();m.setSource({x:.2,y:.15});m.mode='day';near(m.outdoorAt(3*3600),-25);near(m.outdoorAt(15*3600),30);near(m.outdoorAt(39*3600),30);
 m.advance(86400);near(m.deliveredEnergy,0);assert(m.stats().zones.some(t=>Math.abs(t-20)>.1));for(const t of m.T)assert(t>=-25&&t<=30);
});
check('Positive R,C extremes remain finite and obey maximum principle',()=>{
 const m=new ThermalModel({outside:-40,ground:25,initial:40,mixing:80});m.C=m.C.map(v=>v/4);m.R=m.R.map(v=>v/4);m.rebuild();m.advance(3600);for(const t of m.T)assert(Number.isFinite(t)&&t>=-40&&t<=40);
});
check('RC Euler convergence: half step reduces error',()=>{
 const run=h=>{const m=new ThermalModel();m.solver='rc';m.initialMode='fitted';m.rebuild();m.maxDt=Math.min(m.maxDt,h);m.setSource({x:.7,y:.4});m.advance(86400);return m.T;};const fine=run(.5),coarse=run(30),half=run(15);const err=x=>Math.max(...x.map((v,i)=>Math.abs(v-fine[i])));assert(err(half)<err(coarse));assert(err(coarse)<.05);console.log('  max 30s/0.5s difference °C:',err(coarse));
});
console.log(`${checks.length} checks passed.`);
