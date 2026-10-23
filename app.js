(function(){
'use strict';
const $=id=>document.getElementById(id),{ThermalModel,defaults,defaultC,defaultR,names,rNames}=Thermal;
const model=new ThermalModel(),challenge=new Thermal.HeatingChallenge(model);window.thermalApp={model,challenge};
const house=$('house'),ctx=house.getContext('2d'),chart=$('chart'),gc=chart.getContext('2d');
const speeds=[60,300,900,1800,3600,7200,14400],colors=['#51d5be','#7eafff','#e8b06a','#c5a0ff','#e0e8ef'];
let playing=false,last=0,history=[],lastRecord=-Infinity,fastTarget=null,scaleMin=-25,scaleMax=60,viewMin=-25,viewMax=60,hover=null,dragging=false,toastTimer,geometry=null,realSpeed=0;
const sliders={};
let sandboxSnapshot=null,resultShown=false;
const isChallenge=()=>model.mode==='challenge'&&challenge.active;
const fmt=(v,n=1)=>Number(v).toLocaleString('ru-RU',{maximumFractionDigits:n,minimumFractionDigits:n});
const toast=message=>{$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);};
function slider(container,key,label,min,max,step,value,unit,onChange,options={}){
 const div=document.createElement('div');div.className='slider';
 const id='param-'+key;
 div.innerHTML=`<div class="slider-head"><label for="${id}">${label}</label><output for="${id}"><b></b><small>${unit}</small></output></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}"><div class="slider-range"><span>${fmt(options.display?options.display(min):min,0)}</span><span>${fmt(options.display?options.display(max):max,options.display&&!Number.isInteger(options.display(max))?1:0)}</span></div>`;
 const input=div.querySelector('input'),out=div.querySelector('b'); input.value=options.log?Math.log(value):value;
 const read=()=>options.log?Math.exp(+input.value):+input.value;
 const display=v=>{out.textContent=fmt(options.display?options.display(v):v,options.digits??1);input.setAttribute('aria-valuetext',out.textContent+' '+unit);};display(value);
 input.addEventListener('input',()=>{const v=read();display(v);onChange(v);});
 if(options.log){div.querySelector('.slider-range').firstElementChild.textContent='×0,25';div.querySelector('.slider-range').lastElementChild.textContent='×4';}
 container.append(div);sliders[key]={input,set(v){input.value=options.log?Math.log(v):v;display(v);},div};return div;
}
function startStop(value){
 playing=value;
 const game=isChallenge(),finished=game&&challenge.state==='finished',active=playing||fastTarget!==null;
 const text=finished?'Завершено':active?'Пауза':game?(model.time>0?'Продолжить':'Начать 3 дня'):'Запустить';
 $('play').innerHTML=(active?'Ⅱ ':'▶ ')+`<span>${text}</span>`;$('play').disabled=finished;
 $('status').classList.toggle('running',active);$('status').innerHTML='<i></i>'+(finished?'72 часа завершены':active?(game?(challenge.control==='auto'?'Автопилот':'Вы управляете'):'Эксперимент идёт'):'Пауза');
 if(game){$('gameStart').textContent=(active?'Ⅱ ':'▶ ')+text;$('gameStart').disabled=finished;$('demoFinish').disabled=finished;}
}
function record(force=false){if(force||model.time-lastRecord>=299.999){const s=model.stats();if(history.length&&Math.abs(history.at(-1).t-model.time)<1e-7)history.pop();history.push({t:model.time,z:s.zones,a:s.outside,q:isChallenge()?challenge.powers.slice():null,solar:isChallenge()?challenge.solarAt(model.time).total:0});lastRecord=model.time;if(history.length>10000)history=history.filter((_,i)=>i%2===0);}}
function clearHistory(){history=[];lastRecord=-Infinity;record(true);}
function reset(rebuild=false,message){fastTarget=null;if(rebuild)model.rebuild();else model.reset();clearHistory();updateSource();updateMetrics();draw();if(message)toast(message);}
function changedNetwork(){reset(true,'Модель перезапущена с новыми параметрами');}
slider($('heaterSliders'),'power','Мощность',0,8000,50,model.p.power,'кВт',v=>{model.p.power=v;updateMetrics();},{display:v=>v/1000,digits:2});
slider($('heaterSliders'),'radius','Радиус распределения',4,30,1,model.p.radius,'% комнаты',v=>{model.p.radius=v;model.setSource(model.source);});
slider($('daySliders'),'dayMin','Минимум ночью',-40,15,1,model.p.dayMin,'°C',v=>{model.p.dayMin=v;if(v>model.p.dayMax){model.p.dayMax=v;sliders.dayMax.set(v);}updateWeather();});
slider($('daySliders'),'dayMax','Максимум днём',-10,50,1,model.p.dayMax,'°C',v=>{model.p.dayMax=v;if(v<model.p.dayMin){model.p.dayMin=v;sliders.dayMin.set(v);}updateWeather();});
slider($('daySliders'),'peakHour','Самый тёплый час',0,23,1,model.p.peakHour,'ч',v=>{model.p.peakHour=v;updateWeather();},{digits:0});
slider($('environmentSliders'),'outside','Температура снаружи',-40,45,1,model.p.outside,'°C',v=>{model.p.outside=v;updateMetrics();});
slider($('environmentSliders'),'ground','Температура грунта',-10,25,1,model.p.ground,'°C',v=>{model.p.ground=v;draw();});
slider($('environmentSliders'),'initial','Начальная температура',-10,40,1,model.p.initial,'°C',v=>{model.p.initial=v;});
function group(title,subtitle){const d=document.createElement('details');d.className='group';d.innerHTML=`<summary>${title}<span>${subtitle}</span></summary><div></div>`;$('physicalSliders').append(d);return d.lastElementChild;}
const mixingGroup=group('Перемешивание в комнатах','Дополнительный параметр пространственной модели');
slider(mixingGroup,'mixing','Связь соседних ячеек',1,80,1,model.p.mixing,'Вт/К',v=>{model.p.mixing=v;changedNetwork();},{digits:0});
const descriptions=['Воздух T₁','Воздух T₂','Воздух T₃','Воздух T₄','Стена O₁','Стена O₂','Стена O₃','Стена O₄','Перегородка V₁₂','Перекрытие V₁₃','Перекрытие V₂₄','Перегородка V₃₄','Пол F₁','Пол F₂','Крыша P₃','Крыша P₄'];
const cg1=group('Теплоёмкости комнат','C₁–C₄ · кДж/К'),cg2=group('Теплоёмкости конструкций','12 узлов · кДж/К');
for(let i=0;i<16;i++)slider(i<4?cg1:cg2,'C'+i,`${names[i]} · ${descriptions[i]}`,Math.log(defaultC[i]/4),Math.log(defaultC[i]*4),.001,model.C[i],'кДж/К',v=>{model.C[i]=v;changedNetwork();},{log:true,digits:1});
const rg=[group('Окна → наружный воздух','Rw₁–Rw₄ · К/кВт'),group('Наружные стены → комнаты','Ro₁b–Ro₄b · К/кВт'),group('Наружный воздух → стены','Ro₁a–Ro₄a · К/кВт'),group('Перегородки и перекрытия','R₁₂, R₁₃, R₂₄, R₃₄ · одна половина'),group('Пол и крыша','Rf₁, Rf₂, Rr₃, Rr₄ · одна половина')];
for(let i=0;i<20;i++)slider(rg[Math.floor(i/4)],'R'+i,rNames[i],Math.log(defaultR[i]/4),Math.log(defaultR[i]*4),.001,model.R[i],'К/кВт',v=>{model.R[i]=v;changedNetwork();},{log:true,digits:2});
slider($('displaySliders'),'scaleMin','Нижняя граница',-50,40,1,scaleMin,'°C',v=>{scaleMin=v;if(scaleMax<=v){scaleMax=v+1;sliders.scaleMax.set(scaleMax);}$('autoScale').checked=false;draw();});
slider($('displaySliders'),'scaleMax','Верхняя граница',0,200,1,scaleMax,'°C',v=>{scaleMax=v;if(scaleMin>=v){scaleMin=v-1;sliders.scaleMin.set(scaleMin);}$('autoScale').checked=false;draw();});
for(let z=0;z<4;z++){
 const card=document.createElement('div');card.className='room-heater';card.style.setProperty('--room-color',colors[z]);
 card.innerHTML=`<div class="room-heater-top"><span class="room-name">Комната T${'₁₂₃₄'[z]}</span><strong class="room-reading" id="roomT${z}">20,00 °C</strong></div><div class="room-power"></div><div class="room-error"><span>Цель 20 °C</span><b id="roomError${z}">В норме</b></div>`;
 $('roomHeaters').append(card);
 slider(card.querySelector('.room-power'),'gameQ'+z,`Отопление T${'₁₂₃₄'[z]}`,0,Thermal.MAX_POWER,5,0,'кВт',v=>{if(challenge.setPower(z,v))updateMetrics();},{display:v=>v/1000,digits:2});
}
function updateChallengeUI(s){
 if(!isChallenge())return;const time=model.time,done=challenge.state==='finished',day=Math.min(3,1+Math.floor(time/86400));
 $('gameDay').textContent=done?'Все 3 дня завершены':`День ${day} из 3 · ${fmt(time/3600,1)} / 72 ч`;$('gameRemaining').textContent=done?'Финиш':`Осталось ${fmt((Thermal.DURATION-time)/3600,1)} ч`;$('gameProgress').value=time;
 for(let z=0;z<4;z++){
  const error=s.zones[z]-20,reading=$('roomT'+z);reading.textContent=fmt(s.zones[z],2)+' °C';reading.classList.toggle('cold',error<-.25);reading.classList.toggle('hot',error>.25);
  $('roomError'+z).textContent=Math.abs(error)<.005?'Ровно 20 °C':(error>0?'+':'')+fmt(error,2)+' °C';sliders['gameQ'+z].set(challenge.powers[z]);
 }
 const sun=challenge.solarAt(time);$('sunPower').textContent=fmt(sun.total/1000,2)+' кВт';$('sunDirection').textContent=!sun.visible?'Ночь. Солнце не греет.':sun.phase<.45?'Утро: солнце справа → нагреваются правые комнаты.':sun.phase>.55?'Вечер: солнце слева → нагреваются левые комнаты.':'Полдень: солнечное тепло поступает с обеих сторон.';
}
function showResult(){
 const r=challenge.result();if(!r.complete)return;resultShown=true;
 $('resultEyebrow').textContent=r.control==='auto'?'ДЕМОНСТРАЦИЯ ЗАВЕРШЕНА':'ИСПЫТАНИЕ ЗАВЕРШЕНО';$('resultTitle').textContent=r.control==='auto'?'72 часа под управлением автопилота':'Три дня под вашим управлением';
 $('finalScore').textContent=fmt(r.score,1);$('resultError').textContent=fmt(r.mae,3)+' °C';$('resultComfort').textContent=fmt(r.comfort,1)+' %';$('resultEnergy').textContent=fmt(r.kWh,1)+' кВт·ч';
 $('resultDescription').textContent=r.control==='auto'&&r.mae<.005?'Средняя температура каждой комнаты удерживалась на 20 °C все 72 часа. Показанный результат рассчитан по фактическим температурам.':'Оценка учитывает отклонение от 20 °C в каждой комнате за всё время испытания.';
 $('resultRooms').replaceChildren();r.zones.forEach((z,i)=>{const div=document.createElement('div');div.className='result-room';div.innerHTML=`<div><span>Комната T${'₁₂₃₄'[i]}</span><b>${fmt(z.score,1)} / 100</b></div><small>Среднее отклонение ${fmt(z.mae,3)} °C<br>В комфорте ${fmt(z.comfort,1)} % времени</small>`;$('resultRooms').append(div);});
 $('resultDemo').hidden=r.control==='auto';$('gameResult').showModal();
}
$('resultClose').onclick=()=>$('gameResult').close();$('resultRetry').onclick=()=>startChallenge('manual');$('resultDemo').onclick=()=>startChallenge('auto',true);
function updateWeather(){$('nightTemp').textContent=fmt(model.p.dayMin,0)+'°';$('dayTemp').textContent=fmt(model.p.dayMax,0)+'°';updateMetrics();}
function updateSource(){const z=model.source?model.zoneAt(model.source.x,model.source.y):-1;$('sourceLabel').textContent=z<0?'Источник не установлен':`Нагреватель в комнате T${'₁₂₃₄'[z]}`;$('removeSource').disabled=!model.source;$('sceneGuide').hidden=!!model.source||model.mode!=='heater';}
function placeSource(x,y){if(model.mode!=='heater')return;if(model.setSource({x,y})){updateSource();updateMetrics();if(!playing)startStop(true);draw();}}
function syncLabControls(){
 for(const [k,v]of Object.entries(model.p))if(sliders[k])sliders[k].set(v);
 for(let i=0;i<16;i++)sliders['C'+i].set(model.C[i]);for(let i=0;i<20;i++)sliders['R'+i].set(model.R[i]);
 $('solver').value=model.solver;$('initialMode').value=model.initialMode;
 sliders.mixing.input.disabled=model.solver==='rc';sliders.radius.input.disabled=model.solver==='rc';sliders.initial.input.disabled=model.initialMode==='fitted';
 $('speed').value=speeds.indexOf(model.p.speed);$('speedValue').textContent=(model.p.speed/60)+' мин/с';
 $('solverHelp').textContent=model.solver==='rc'?'Точная структура из задания: 4 воздушных и 12 конструкционных узлов. Температура внутри комнаты одинакова.':'Воздух разбит на ячейки. Стены, пол и крыша сохраняют узлы исходной RC-схемы.';
}
function startChallenge(control='manual',autostart=false){
 if(!sandboxSnapshot)sandboxSnapshot={p:{...model.p},C:model.C.slice(),R:model.R.slice(),solver:model.solver,initialMode:model.initialMode,source:model.source?{...model.source}:null,scaleMin,scaleMax,autoScale:$('autoScale').checked};
 fastTarget=null;playing=false;hover=null;$('probe').hidden=true;challenge.setup(control);resultShown=false;
 if($('gameResult').open)$('gameResult').close();
 document.body.classList.add('challenge-active');$('labControls').hidden=true;$('labControls').disabled=true;$('challengeControls').hidden=false;$('mission').hidden=false;
 $('sidebarHeading').textContent='Управление отоплением';$('challengeMode').classList.add('active');$('heaterMode').classList.remove('active');$('dayMode').classList.remove('active');
 $('manualControl').classList.toggle('active',control==='manual');$('autoControl').classList.toggle('active',control==='auto');
 $('controllerBadge').textContent=control==='auto'?'ДЕМОНСТРАЦИЯ АВТОПИЛОТА':'ВЫ УПРАВЛЯЕТЕ';$('controllerBadge').classList.toggle('demo-mode',control==='auto');
 $('controllerHint').textContent=control==='auto'?'Смотрите, как автопилот двигает слайдеры и компенсирует погоду и солнце. Тот же дом, те же 72 часа.':'Двигайте четыре слайдера, чтобы средняя температура каждой комнаты оставалась 20 °C. Без пауз заезд длится около 90 секунд.';
 $('demoFinish').hidden=control!=='auto';for(let z=0;z<4;z++)sliders['gameQ'+z].input.disabled=control==='auto';
 house.setAttribute('aria-label','Тепловая карта испытания. Цель — средняя температура 20 градусов в каждой комнате.');
 $('modeHint').textContent='Удерживайте среднюю температуру каждой комнаты на 20 °C в течение 72 часов.';
 $('sceneTitle').textContent='Тепловая карта / цель в каждой комнате: 20 °C';$('modelNote').textContent='Учебный сценарий: параметры зафиксированы. Оцениваются средние температуры четырёх комнат.';
 document.querySelector('#powerMetric').previousElementSibling.textContent='ОБЩЕЕ ОТОПЛЕНИЕ';
 $('speed').disabled=true;$('advanceDay').disabled=true;scaleMin=16;scaleMax=24;$('autoScale').checked=false;
 clearHistory();updateSource();updateMetrics();startStop(autostart);draw();
}
function leaveChallenge(){
 if(!challenge.active)return;challenge.active=false;model.scenario=null;fastTarget=null;playing=false;
 const old=sandboxSnapshot;sandboxSnapshot=null;
 if(old){model.p={...old.p};model.C=old.C.slice();model.R=old.R.slice();model.solver=old.solver;model.initialMode=old.initialMode;model.source=old.source;scaleMin=old.scaleMin;scaleMax=old.scaleMax;$('autoScale').checked=old.autoScale;}
 document.body.classList.remove('challenge-active');$('labControls').hidden=false;$('labControls').disabled=false;$('challengeControls').hidden=true;$('mission').hidden=true;$('challengeMode').classList.remove('active');
 $('sidebarHeading').textContent='Параметры модели';$('play').disabled=false;$('speed').disabled=false;$('advanceDay').disabled=false;
 document.querySelector('#powerMetric').previousElementSibling.textContent='ИСТОЧНИК ТЕПЛА';
 $('modelNote').textContent='Параметры R и C из решения Week 3. Пространственное поле — расширение исходной модели.';
 house.setAttribute('aria-label','Дом: зоны 3 и 4 сверху, зоны 1 и 2 снизу. Нажмите в комнате для установки нагревателя.');
 syncLabControls();model.rebuild();
}
function mode(value){
 if(value==='challenge'){if(!isChallenge())startChallenge();return;}
 if(model.mode===value)return;leaveChallenge();model.mode=value;
 $('heaterMode').classList.toggle('active',value==='heater');$('dayMode').classList.toggle('active',value==='day');$('heaterControls').hidden=value!=='heater';$('dayControls').hidden=value!=='day';sliders.outside.div.hidden=value==='day';
 $('sceneTitle').textContent=model.solver==='rc'?'Разрез дома / температуры RC-узлов':'Разрез дома / температурное поле';
 $('modeHint').textContent=value==='day'?'За окном от мороза до жары. Наблюдайте, как дом отвечает на смену погоды.':'Поставьте нагреватель в любой комнате и наблюдайте за температурой.';reset(false);startStop(value==='day');updateSource();
}
function togglePlayback(){if(isChallenge()&&challenge.state==='finished')return;if(fastTarget!==null){fastTarget=null;startStop(false);}else {if(isChallenge()&&!playing)challenge.start();startStop(!playing);}}
$('heaterMode').onclick=()=>mode('heater');$('dayMode').onclick=()=>mode('day');$('challengeMode').onclick=()=>mode('challenge');
$('play').onclick=togglePlayback;$('gameStart').onclick=togglePlayback;
$('reset').onclick=()=>isChallenge()?startChallenge(challenge.control,false):reset(false,'Возвращены начальные температуры');
$('advanceDay').onclick=()=>{if(isChallenge())return;fastTarget=model.time+86400;startStop(false);$('status').innerHTML='<i></i>Расчёт следующих суток';$('play').innerHTML='Ⅱ <span>Остановить</span>';};
$('speed').oninput=()=>{if(isChallenge())return;model.p.speed=speeds[+$('speed').value];$('speedValue').textContent=(model.p.speed/60)+' мин/с';};
$('manualControl').onclick=()=>{if(challenge.control!=='manual'||challenge.state==='finished')startChallenge('manual');};
$('autoControl').onclick=()=>{if(challenge.control!=='auto'||challenge.state==='finished')startChallenge('auto',true);else if(!playing)startStop(true);};
$('gameRestart').onclick=()=>startChallenge(challenge.control,false);
$('demoFinish').onclick=()=>{if(!isChallenge()||challenge.control!=='auto'||challenge.state==='finished')return;fastTarget=Thermal.DURATION;startStop(false);$('status').innerHTML='<i></i>Автопилот · ускоренный показ';};
$('removeSource').onclick=()=>{model.setSource(null);updateSource();updateMetrics();draw();};
document.querySelectorAll('[data-zone]').forEach(b=>b.onclick=()=>{const z=+b.dataset.zone;placeSource(z%2*.5+.25,Math.floor(z/2)*.3+.15);});
$('solver').onchange=()=>{if(isChallenge())return;model.solver=$('solver').value;sliders.mixing.input.disabled=model.solver==='rc';sliders.radius.input.disabled=model.solver==='rc';$('solverHelp').textContent=model.solver==='rc'?'Точная структура из задания: 4 воздушных и 12 конструкционных узлов. Температура внутри комнаты одинакова.':'Воздух разбит на ячейки. Стены, пол и крыша сохраняют узлы исходной RC-схемы.';$('sceneTitle').textContent=model.solver==='rc'?'Разрез дома / температуры RC-узлов':'Разрез дома / температурное поле';reset(true,'Способ расчёта изменён, эксперимент начат заново');};
$('initialMode').onchange=()=>{if(isChallenge())return;model.initialMode=$('initialMode').value;sliders.initial.input.disabled=model.initialMode==='fitted';toast('Начальные состояния выбраны. Нажмите «Сначала» для применения.');};
$('defaults').onclick=()=>{if(isChallenge())return;model.p={...defaults};model.C=defaultC.slice();model.R=defaultR.slice();model.initialMode='uniform';$('initialMode').value='uniform';sliders.initial.input.disabled=false;for(const [k,v]of Object.entries(model.p))if(sliders[k])sliders[k].set(v);for(let i=0;i<16;i++)sliders['C'+i].set(model.C[i]);for(let i=0;i<20;i++)sliders['R'+i].set(model.R[i]);$('speed').value=3;$('speed').oninput();updateWeather();reset(true,'Восстановлены параметры из решения Week 3');};
$('aboutOpen').onclick=()=>$('about').showModal();$('aboutClose').onclick=()=>$('about').close();$('about').onclick=e=>{if(e.target===$('about')){const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close();}};
for(const id of ['showLabels','showGrid','autoScale'])$(id).onchange=draw;
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('exportCsv').onclick=()=>{
 const rows=history.slice();if(!rows.length||rows.at(-1).t!==model.time){const s=model.stats();rows.push({t:model.time,z:s.zones,a:s.outside,q:isChallenge()?challenge.powers.slice():null,solar:isChallenge()?challenge.solarAt(model.time).total:0});}
 const game=isChallenge(),header='time_hours,T1_C,T2_C,T3_C,T4_C,outside_C,mode,solver'+(game?',Q1_W,Q2_W,Q3_W,Q4_W,solar_W,controller':'');
 download('thermal-house-history.csv','\uFEFF'+header+'\n'+rows.map(r=>[r.t/3600,...r.z,r.a,model.mode,model.solver,...(game?[...(r.q||[0,0,0,0]),r.solar,challenge.control]:[])].join(',')).join('\n'),'text/csv;charset=utf-8');
};
$('snapshot').onclick=()=>{draw();house.toBlob(blob=>{if(blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='thermal-house.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}});};
$('saveSettings').onclick=()=>{if(isChallenge())return;download('thermal-house-settings.json',JSON.stringify({version:1,parameters:model.p,C:model.C,R:model.R,source:model.source,mode:model.mode,solver:model.solver,initialMode:model.initialMode},null,2),'application/json');};
$('loadSettings').onclick=()=>$('settingsFile').click();
$('settingsFile').onchange=async()=>{if(isChallenge())return;try{
 const file=$('settingsFile').files[0];if(!file)return;const data=JSON.parse(await file.text());
 if(data.version!==1||!['heater','day'].includes(data.mode)||!['spatial','rc'].includes(data.solver)||!['uniform','fitted'].includes(data.initialMode)||!Array.isArray(data.C)||data.C.length!==16||!Array.isArray(data.R)||data.R.length!==20)throw Error('format');
 for(const[k]of Object.entries(defaults)){const v=data.parameters?.[k];if(typeof v!=='number'||!Number.isFinite(v))throw Error('value');if(k==='speed'){if(!speeds.includes(v))throw Error('speed');}else {const input=sliders[k].input;if(v<+input.min||v>+input.max)throw Error('range');}}
 if(data.parameters.dayMin>data.parameters.dayMax)throw Error('weather');
 for(const[key,values,base]of [['C',data.C,defaultC],['R',data.R,defaultR]])values.forEach((v,i)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<base[i]/4-.001||v>base[i]*4+.001)throw Error(key);});
 if(data.source!==null&&(!data.source||!Number.isFinite(data.source.x)||!Number.isFinite(data.source.y)||model.zoneAt(data.source.x,data.source.y)<0))throw Error('source');
 startStop(false);model.p={...data.parameters};model.C=data.C.slice();model.R=data.R.slice();model.initialMode=data.initialMode;
 for(const[k,v]of Object.entries(model.p))if(sliders[k])sliders[k].set(v);for(let i=0;i<16;i++)sliders['C'+i].set(model.C[i]);for(let i=0;i<20;i++)sliders['R'+i].set(model.R[i]);
 $('initialMode').value=model.initialMode;sliders.initial.input.disabled=model.initialMode==='fitted';$('solver').value=data.solver;$('solver').onchange();mode(data.mode);model.setSource(data.source);$('speed').value=speeds.indexOf(model.p.speed);$('speed').oninput();updateWeather();reset(false);startStop(false);toast('Настройки загружены');
 }catch(e){toast('Не удалось загрузить настройки: проверьте формат и диапазоны значений.');}finally{$('settingsFile').value='';}};
const palette=[[32,34,105],[38,94,170],[45,180,193],[147,215,174],[240,209,127],[240,136,80],[179,42,77]];
function rgb(t){const v=Math.max(0,Math.min(.999999,(t-viewMin)/(viewMax-viewMin)))*(palette.length-1),k=Math.floor(v),f=v-k;return palette[k].map((c,i)=>Math.round(c+(palette[k+1][i]-c)*f));}
const color=t=>'rgb('+rgb(t).join(',')+')';
const field=document.createElement('canvas'),fc=field.getContext('2d');
function setupCanvas(canvas,context){const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}context.setTransform(dpr,0,0,dpr,0,0);return {w:r.width,h:r.height};}
function roundBox(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function badge(text,x,y,small=false){ctx.font=`${small?'10':'11'}px -apple-system, sans-serif`;const width=ctx.measureText(text).width+22;roundBox(ctx,x-width/2,y-12,width,24,6);ctx.fillStyle='#0b1420d9';ctx.fill();ctx.strokeStyle='#ffffff24';ctx.lineWidth=.6;ctx.stroke();ctx.fillStyle='#dfedf4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y+1);}
function drawHouse(){
 const {w,h}=setupCanvas(house,ctx),s=model.stats();ctx.clearRect(0,0,w,h);
 if($('autoScale').checked){let lo=Infinity,hi=-Infinity;for(const t of model.T){lo=Math.min(lo,t);hi=Math.max(hi,t);}viewMin=Math.floor((lo-1)/5)*5;viewMax=Math.ceil((hi+1)/5)*5;if(viewMax-viewMin<10){viewMin-=5;viewMax+=5;}}else{viewMin=scaleMin;viewMax=scaleMax;}
 $('scaleLow').textContent=fmt(viewMin,0)+' °C';$('scaleHigh').textContent=fmt(viewMax,0)+' °C';
 // Normalized section: width 1, two floors .3 each, roof .22. No invented metre dimensions.
 const bw=Math.min(w*.72,(h-78)/.82),left=(w-bw)/2,base=h-42,top=base-bw*.6,ridge=top-bw*.22;
 const X=x=>left+x*bw,Y=y=>base-y*bw;geometry={left,base,bw,X,Y,rooms:[]};
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#152130');sky.addColorStop(1,'#101923');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#2b435244';for(let y=22;y<h;y+=25)for(let x=20;x<w;x+=25)ctx.fillRect(x,y,1,1);
 // Shared continuous orbit: the sun crosses the full scene, then passes behind ground.
 if(model.mode==='day'||isChallenge()){
  const track=Thermal.sunTrackAt(model.time,w,base+9),sun=isChallenge()?challenge.solarAt(model.time):null;
  const daylight=Math.max(0,track.elevation);
  ctx.fillStyle=`rgba(255,188,91,${.01+.05*daylight})`;ctx.fillRect(0,0,w,h);
  if(track.visible){
   const sx=track.x,sy=track.y,warmth=Math.max(0,1-Math.abs(track.elevation)*3);
   ctx.save();ctx.beginPath();ctx.rect(0,0,w,track.horizon);ctx.clip();
   const glow=ctx.createRadialGradient(sx,sy,3,sx,sy,52);glow.addColorStop(0,`rgba(255,${Math.round(207-warmth*40)},100,.6)`);glow.addColorStop(1,'#ffbd5400');ctx.fillStyle=glow;ctx.fillRect(sx-55,sy-55,110,110);
   if(sun)for(let z=0;z<4;z++){const fraction=sun.air[z]/420;if(fraction<.03)continue;const wx=X(z%2?1:0),wy=Y(Math.floor(z/2)*.3+.15);ctx.fillStyle=`rgba(255,194,91,${fraction*.09})`;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(wx,wy-24);ctx.lineTo(wx,wy+24);ctx.closePath();ctx.fill();ctx.strokeStyle=`rgba(255,205,120,${fraction*.55})`;ctx.lineWidth=.8;ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(wx,wy);ctx.stroke();ctx.setLineDash([]);}
   ctx.strokeStyle=warmth>.5?'#ffa964':'#ffd688';ctx.lineWidth=1.4;for(let k=0;k<8;k++){const a=k*Math.PI/4;ctx.beginPath();ctx.moveTo(sx+Math.cos(a)*17,sy+Math.sin(a)*17);ctx.lineTo(sx+Math.cos(a)*22,sy+Math.sin(a)*22);ctx.stroke();}
   ctx.fillStyle=warmth>.5?'#ffac62':'#ffcc71';ctx.beginPath();ctx.arc(sx,sy,track.radius,0,2*Math.PI);ctx.fill();ctx.restore();
  }
  // The moon fades in only as the sun descends below the horizon.
  if(track.night>0){ctx.save();ctx.globalAlpha=track.night;ctx.fillStyle='#b9d2e0';ctx.beginPath();ctx.arc(w-35,28,9,0,2*Math.PI);ctx.fill();ctx.fillStyle='#152130';ctx.beginPath();ctx.arc(w-31,24,9,0,2*Math.PI);ctx.fill();ctx.restore();}
 }
 // Ground.
 ctx.fillStyle='#23282a';ctx.fillRect(0,base+9,w,h-base);ctx.strokeStyle='#59625a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,base+9);ctx.lineTo(w,base+9);ctx.stroke();ctx.strokeStyle='#76816b20';for(let x=0;x<w;x+=17){ctx.beginPath();ctx.moveTo(x,base+25);ctx.lineTo(x+9,base+16);ctx.stroke();}
 // Roof drawn with its two fitted RC temperatures, P3 and P4.
 ctx.shadowColor='#0005';ctx.shadowBlur=20;ctx.fillStyle='#13242d';ctx.beginPath();ctx.moveTo(X(-.015),top);ctx.lineTo(X(.5),ridge-9);ctx.lineTo(X(1.015),top);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
 for(let k=0;k<2;k++){ctx.fillStyle=color(model.structure(14+k));ctx.beginPath();ctx.moveTo(X(k*.5),top-3);ctx.lineTo(X(.5),ridge);ctx.lineTo(X((k+1)*.5),top-3);ctx.closePath();ctx.fill();}
 ctx.strokeStyle='#d7e9ef50';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X(-.022),top);ctx.lineTo(X(.5),ridge-5);ctx.lineTo(X(1.022),top);ctx.stroke();
 ctx.strokeStyle='#13233355';for(let f=.2;f<1;f+=.2){ctx.beginPath();ctx.moveTo(X(.5*f),top-(top-ridge)*f);ctx.lineTo(X(1-.5*f),top-(top-ridge)*f);ctx.stroke();}
 const wall=10,gap=8;
 // Air temperature raster; each room is independently interpolated, avoiding colour bleed through walls.
 for(let z=0;z<4;z++){
  const xx=X(z%2*.5)+wall,yy=Y((Math.floor(z/2)+1)*.3)+gap,rw=bw*.5-wall-gap/2,rh=bw*.3-gap*1.5;
  geometry.rooms[z]={x:xx,y:yy,w:rw,h:rh};
  if(field.width!==model.cols||field.height!==model.rows){field.width=model.cols;field.height=model.rows;}
  const pixels=fc.createImageData(model.cols,model.rows);for(let j=0;j<model.rows;j++)for(let i=0;i<model.cols;i++){const a=z*model.perZone+j*model.cols+i,idx=((model.rows-1-j)*model.cols+i)*4,c=rgb(model.T[a]);pixels.data[idx]=c[0];pixels.data[idx+1]=c[1];pixels.data[idx+2]=c[2];pixels.data[idx+3]=255;}fc.putImageData(pixels,0,0);
  ctx.imageSmoothingEnabled=true;ctx.drawImage(field,xx,yy,rw,rh);
  if($('showGrid').checked&&model.solver==='spatial'){ctx.strokeStyle='#0b192b30';ctx.lineWidth=.5;for(let i=1;i<model.cols;i++){ctx.beginPath();ctx.moveTo(xx+rw*i/model.cols,yy);ctx.lineTo(xx+rw*i/model.cols,yy+rh);ctx.stroke();}for(let j=1;j<model.rows;j++){ctx.beginPath();ctx.moveTo(xx,yy+rh*j/model.rows);ctx.lineTo(xx+rw,yy+rh*j/model.rows);ctx.stroke();}}
 }
 // Exterior walls, each aggregated node follows the source RC circuit.
 for(let z=0;z<4;z++){ctx.fillStyle=color(model.structure(4+z));ctx.fillRect(X(z%2?1:0)-(z%2?wall:0),Y((Math.floor(z/2)+1)*.3),wall,bw*.3);}
 // Shared partition and slabs.
 for(let k=0;k<2;k++){ctx.fillStyle=color(model.structure(k?11:8));ctx.fillRect(X(.5)-gap/2,Y((k+1)*.3),gap,bw*.3);}
 for(let k=0;k<2;k++){ctx.fillStyle=color(model.structure(9+k));ctx.fillRect(X(k*.5),Y(.3)-gap/2,bw*.5,gap);ctx.fillStyle=color(model.structure(12+k));ctx.fillRect(X(k*.5),base-5,bw*.5,10);ctx.fillStyle=color(model.structure(14+k));ctx.fillRect(X(k*.5),top-5,bw*.5,10);}
 ctx.strokeStyle='#e4f4ff45';ctx.lineWidth=1;ctx.strokeRect(left,top,bw,bw*.6);ctx.beginPath();ctx.moveTo(X(.5),top);ctx.lineTo(X(.5),base);ctx.moveTo(left,Y(.3));ctx.lineTo(left+bw,Y(.3));ctx.stroke();
 // Windows: direct Rw branch, marked on each external wall.
 for(let z=0;z<4;z++){const x=X(z%2?1:0),y=Y(Math.floor(z/2)*.3+.15);ctx.fillStyle='#a4d9ed';ctx.fillRect(x-3,y-16,6,32);ctx.strokeStyle='#e2f9ff';ctx.lineWidth=.7;ctx.strokeRect(x-3,y-16,6,32);ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.stroke();}
 if($('showLabels').checked){for(let z=0;z<4;z++){const x=X(z%2*.5+.25),y=Y(Math.floor(z/2)*.3+.24);badge(`T${'₁₂₃₄'[z]}  ${fmt(s.zones[z])} °C`,x,y);}badge(`P₃  ${fmt(model.structure(14))}°`,X(.34),top-(top-ridge)*.35,true);badge(`P₄  ${fmt(model.structure(15))}°`,X(.66),top-(top-ridge)*.35,true);}
 badge(`Tₐ  ${fmt(s.outside)} °C`,Math.max(53,left/2),top+bw*.28,true);ctx.fillStyle='#a3afa5';ctx.textAlign='center';ctx.font='10px -apple-system,sans-serif';ctx.fillText(`Грунт Tɢ = ${fmt(model.p.ground)} °C`,w/2,base+31);
 if(model.source&&model.mode==='heater'){
  const sp=screenPoint(model.source),x=sp.x,y=sp.y;ctx.strokeStyle='#fff4d9';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,12,0,2*Math.PI);ctx.stroke();ctx.fillStyle='#faad5a';ctx.shadowColor='#ffbe68';ctx.shadowBlur=17;ctx.beginPath();ctx.arc(x,y,6,0,2*Math.PI);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#2b2116';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('+',x,y);ctx.textBaseline='alphabetic';
 }
 if(hover){const sample=sampleView(hover);if(sample){$('probe').textContent=`${sample.name} · ${fmt(sample.temperature)} °C`;ctx.strokeStyle='#ffffff88';ctx.lineWidth=1;ctx.beginPath();ctx.arc(hover.px,hover.py,4,0,2*Math.PI);ctx.stroke();}}
}
function drawChart(){
 const{w,h}=setupCanvas(chart,gc);gc.clearRect(0,0,w,h);const pad={l:39,r:13,t:12,b:26},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
 if(!history.length)return;const all=history.flatMap(r=>[...r.z,r.a]),lo=Math.floor((Math.min(...all)-2)/5)*5,hi=Math.ceil((Math.max(...all)+2)/5)*5;
 const maxT=Math.max(3600,model.time),minT=Math.max(0,maxT-86400*3),span=maxT-minT;
 const X=t=>pad.l+(t-minT)/span*cw,Y=t=>pad.t+(hi-t)/(hi-lo)*ch;
 gc.font='9px -apple-system,sans-serif';gc.textBaseline='middle';
 for(let k=0;k<5;k++){const val=lo+(hi-lo)*k/4,y=Y(val);gc.strokeStyle='#283846';gc.lineWidth=.6;gc.beginPath();gc.moveTo(pad.l,y);gc.lineTo(w-pad.r,y);gc.stroke();gc.fillStyle='#748a9d';gc.textAlign='right';gc.fillText(fmt(val,0)+'°',pad.l-8,y);}
 for(let k=0;k<5;k++){const t=minT+span*k/4;gc.textAlign=k===0?'left':k===4?'right':'center';gc.fillStyle='#748a9d';gc.fillText(fmt(t/3600,t/3600%1?1:0)+' ч',X(t),h-10);}
 gc.save();gc.beginPath();gc.rect(pad.l,pad.t,cw,ch);gc.clip();
 if(isChallenge()){gc.strokeStyle='#64decba0';gc.setLineDash([2,4]);gc.lineWidth=1;gc.beginPath();gc.moveTo(pad.l,Y(20));gc.lineTo(w-pad.r,Y(20));gc.stroke();gc.fillStyle='#8cdac6';gc.font='9px sans-serif';gc.textAlign='right';gc.fillText('Цель 20 °C',w-pad.r-4,Y(20)-7);}
 for(let z=0;z<5;z++){gc.strokeStyle=colors[z];gc.lineWidth=z===4?1.2:1.6;gc.setLineDash(z===4?[4,4]:[]);gc.beginPath();let started=false;for(const row of history){if(row.t<minT-300)continue;const y=z===4?row.a:row.z[z];if(!started){gc.moveTo(X(row.t),Y(y));started=true;}else gc.lineTo(X(row.t),Y(y));}gc.stroke();if(history.length===1){const r=history[0];gc.fillStyle=colors[z];gc.beginPath();gc.arc(X(r.t),Y(z===4?r.a:r.z[z]),2,0,2*Math.PI);gc.fill();}}
 gc.restore();gc.setLineDash([]);
}
function updateMetrics(){
 const s=model.stats(),game=isChallenge();$('outdoor').innerHTML=`${fmt(s.outside)}<small>°C</small>`;$('average').innerHTML=`${fmt(s.zones.reduce((a,b)=>a+b,0)/4)}<small>°C</small>`;
 const power=game?challenge.powers.reduce((a,b)=>a+b,0)/1000:model.mode==='heater'&&model.source?model.p.power/1000:0;$('powerMetric').innerHTML=`${fmt(power,2)}<small>кВт</small>`;
 const minutes=Math.floor((model.time+1e-6)/60),hours=game?Math.floor(minutes/60):Math.floor(minutes/60)%24;
 $('clock').innerHTML=`${String(hours).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}<small>${game?'из 72 ч':'день '+(1+Math.floor(model.time/86400))}</small>`;updateChallengeUI(s);
}
function screenPoint(p){const z=model.zoneAt(p.x,p.y),r=geometry.rooms[z];return{x:r.x+(p.x-z%2*.5)/.5*r.w,y:r.y+r.h-(p.y-Math.floor(z/2)*.3)/.3*r.h};}
function point(e){const r=house.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;let p={x:(px-geometry.left)/geometry.bw,y:(geometry.base-py)/geometry.bw,px,py,air:false};for(let z=0;z<4;z++){const b=geometry.rooms[z];if(px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h){p.x=z%2*.5+(px-b.x)/b.w*.5;p.y=Math.floor(z/2)*.3+(1-(py-b.y)/b.h)*.3;p.air=true;break;}}return p;}
function sampleView(p){if(p.air){const s=model.sample(p.x,p.y);return s?{...s,name:'T'+'₁₂₃₄'[s.zone]}:null;}const x=(p.px-geometry.left)/geometry.bw,y=(geometry.base-p.py)/geometry.bw;let id=null;if(x>=0&&x<=1){if(y>=.59&&y<=.82-.44*Math.abs(x-.5))id=14+(x>=.5?1:0);else if(y>=-.01&&y<=.01)id=12+(x>=.5?1:0);else if(y>0&&y<.6){const z=(y>=.3?2:0)+(x>=.5?1:0);if(x<.025||x>.975)id=4+z;else if(Math.abs(y-.3)<.02)id=9+(x>=.5?1:0);else if(Math.abs(x-.5)<.025)id=y>=.3?11:8;}}return id===null?null:{temperature:model.structure(id),name:Thermal.fitted.state_names[id]};} 
house.addEventListener('pointerdown',e=>{const p=point(e);if(model.mode==='heater'&&p.air){dragging=true;house.setPointerCapture(e.pointerId);placeSource(p.x,p.y);}});
house.addEventListener('pointermove',e=>{const p=point(e);hover=p;if(dragging&&p.air)placeSource(p.x,p.y);const sample=sampleView(p);$('probe').hidden=!sample;if(sample){$('probe').textContent=`${sample.name} · ${fmt(sample.temperature)} °C`;$('probe').style.left=Math.max(7,Math.min(p.px+15,house.clientWidth-170))+'px';$('probe').style.top=Math.max(4,p.py-36)+'px';}if(!playing)drawHouse();});
for(const event of ['pointerup','pointercancel'])house.addEventListener(event,()=>{dragging=false;});
house.addEventListener('pointerleave',()=>{if(!dragging){hover=null;$('probe').hidden=true;drawHouse();}});
house.addEventListener('keydown',e=>{if(['1','2','3','4'].includes(e.key)){const z=+e.key-1;placeSource(z%2*.5+.25,Math.floor(z/2)*.3+.15);}else if(e.code==='Space'){e.preventDefault();togglePlayback();}});
function draw(){drawHouse();drawChart();}
new ResizeObserver(draw).observe($('house').parentElement);new ResizeObserver(drawChart).observe($('chart').parentElement);
function animate(now){
 const elapsed=Math.min(.1,last?(now-last)/1000:0);last=now;
 if(playing||fastTarget!==null){
  const game=isChallenge(),target=Math.min(game?Thermal.DURATION:Infinity,fastTarget??(model.time+elapsed*(game?Thermal.SPEED:model.p.speed))),startTime=model.time,budgetStart=performance.now();let steps=0;
  while(model.time<target-1e-7&&steps<1200&&performance.now()-budgetStart<12){const nextSample=(Math.floor((model.time+1e-6)/300)+1)*300,dt=Math.min(model.maxDt,target-model.time,nextSample-model.time);if(game)challenge.step(dt);else model.step(dt);record();steps++;}
  realSpeed=(model.time-startTime)/Math.max(.001,elapsed);
  if(game&&challenge.state==='finished'){fastTarget=null;record(true);startStop(false);updateMetrics();draw();if(!resultShown)showResult();}
  else {if(fastTarget!==null&&model.time>=fastTarget-1e-7){fastTarget=null;record(true);startStop(false);toast('Следующие 24 часа рассчитаны');}updateMetrics();draw();}
 }
 requestAnimationFrame(animate);
}
clearHistory();updateSource();updateWeather();draw();requestAnimationFrame(animate);
})();
