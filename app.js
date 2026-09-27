import * as THREE from './vendor/three.module.js';

const gsap = window.gsap;

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const phases = [
  {name:'SUNSET', file:'sunset', minute:1122, horizon:.478, title:'THE LAST LIGHT'},
  {name:'GOLDEN HOUR', file:'golden', minute:1148, horizon:.281, title:'A LITTLE LONGER IN THE LIGHT'},
  {name:'BLUE HOUR', file:'blue', minute:1186, horizon:.165, title:'BETWEEN DAY AND DREAM'},
  {name:'NIGHT', file:'night', minute:1235, horizon:.197, title:'THE WORLD GROWS QUIET'},
  {name:'STARRY SKY', file:'stars', minute:1338, horizon:.294, title:'ROOM FOR THE INFINITE'}
];
const state = {time:0, playing:false, x:0, y:0};
let renderer, material, textures=[], lastPhase=-1, available=false, elapsed=0, requestedTime=0;
const clamp = (x,a=0,b=1) => Math.min(b,Math.max(a,x));
const formatTime = (t) => {
  const i=Math.min(3,Math.floor(t)), f=t-i;
  const m=Math.round(phases[i].minute+(phases[i+1].minute-phases[i].minute)*f);
  return `${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;
};
function updateUI(){
  const t=state.time, index=Math.min(4,Math.floor(t+.5)), phase=phases[index];
  const clock=formatTime(t);
  $('time').textContent=clock;
  $('time').dateTime=clock;
  $('timeline').value=Math.round(requestedTime*250);
  $('timeline').setAttribute('aria-valuetext',`${clock}, ${phase.name.toLowerCase()}`);
  document.documentElement.style.setProperty('--position',`${t*25}%`);
  document.documentElement.style.setProperty('--accent',t<1.5?'#e4be8f':'#a6c5ed');
  if(index!==lastPhase){
    lastPhase=index;
    $('phase').textContent=phase.name;
    $('chapter').textContent=`0${index+1} / 05`;
    $('location').textContent=phase.title;
    document.querySelectorAll('[data-stop]').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index));});
  }
  if(!available) updateFallback();
}
function setTime(t, smooth=true){
  gsap.killTweensOf(state,'time');
  const target=clamp(t,0,4);
  requestedTime=target;
  $('timeline').value=Math.round(target*250);
  return new Promise(resolve=>{
    if(!smooth||reducedMotion.matches){state.time=target;updateUI();resolve(true);}
    else gsap.to(state,{time:target,duration:.9,ease:'power2.out',onUpdate:updateUI,onComplete:()=>resolve(true),onInterrupt:()=>resolve(false)});
  });
}
function setPlaying(value){
  state.playing=value;
  $('play').setAttribute('aria-pressed',String(value));
  $('play').setAttribute('aria-label',value?'Pause time':'Let time flow');
  $('play-icon').textContent=value?'Ⅱ':'▷';
  $('play-label').textContent=value?'PAUSE TIME':'LET TIME FLOW';
  $('motion-label').textContent=value?'TIME IS FLOWING':'A MOMENT TO STAY';
}
$('timeline').addEventListener('input',e=>{setPlaying(false);setTime(Number(e.target.value)/250,true);});
// Pointer movement must not be pulled backwards by the interpolated readout.
$('timeline').addEventListener('pointerdown',()=>{setPlaying(false);gsap.killTweensOf(state,'time');});
document.querySelectorAll('[data-stop]').forEach(b=>b.addEventListener('click',()=>{setPlaying(false);setTime(Number(b.dataset.stop));}));
$('play').addEventListener('click',()=>{gsap.killTweensOf(state,'time');if(state.time>=3.999)state.time=0;requestedTime=state.time;updateUI();setPlaying(!state.playing);});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,button,a')||e.ctrlKey||e.metaKey||e.altKey) return;
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setPlaying(false);setTime(requestedTime+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?.25:.035));}
  if(e.code==='Space'){e.preventDefault();$('play').click();}
});
$('fullscreen').addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement) await document.exitFullscreen();
    else if(document.webkitFullscreenElement) document.webkitExitFullscreen();
    else if($('experience').requestFullscreen) await $('experience').requestFullscreen();
    else if($('experience').webkitRequestFullscreen) $('experience').webkitRequestFullscreen();
    else throw new Error('Fullscreen is not supported by this browser.');
  }
  catch{$('notice').textContent='This browser does not allow fullscreen. Use its fullscreen option, or add this site to your home screen.';setTimeout(()=>$('notice').textContent='',6000);}
});
const updateFullscreen=()=>{$('fullscreen').setAttribute('aria-label',(document.fullscreenElement||document.webkitFullscreenElement)?'Exit fullscreen':'Enter fullscreen');};
document.addEventListener('fullscreenchange',updateFullscreen);
document.addEventListener('webkitfullscreenchange',updateFullscreen);
document.addEventListener('pointermove',e=>{if(reducedMotion.matches)return;gsap.to(state,{x:e.clientX/innerWidth-.5,y:e.clientY/innerHeight-.5,duration:1.5,ease:'power2.out',overwrite:'auto'});});
document.addEventListener('visibilitychange',()=>{last=performance.now();});

// A photographic fallback retains the same continuous controls without WebGL.
const fallbackLayers=phases.map((p,i)=>{
  const layer=document.createElement('div');
  Object.assign(layer.style,{position:'absolute',inset:'0',background:`url('assets/${p.file}.jpg') center / cover no-repeat`,opacity:i===0?'1':'0'});
  $('fallback').append(layer);return layer;
});
function updateFallback(){
  const i=Math.min(3,Math.floor(state.time)), f=state.time-i;
  fallbackLayers.forEach((layer,j)=>layer.style.opacity=j===i?'1':j===i+1?String(f):'0');
}

const vertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const fragmentShader=`
precision highp float;
varying vec2 vUv;
uniform sampler2D imageA,imageB;
uniform vec2 viewport,pointer;
uniform float aspectA,aspectB,horizonA,horizonB,blend,evening,seconds,motion;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 photoUV(float aspect,float horizon){
  float screenAspect=viewport.x/viewport.y;
  float scaleY=min(1.,aspect/screenAspect);
  float scaleX=min(1.,screenAspect/aspect);
  float skyline=.43;
  // Pin all photographed horizons to one visual anchor; fit above and below separately.
  float upper=min(scaleY,(1.-horizon)/(1.-skyline));
  float lower=min(scaleY,horizon/skyline);
  float yy=horizon+(vUv.y-skyline)*(vUv.y>skyline?upper:lower);
  float sky=smoothstep(.42,.75,vUv.y);
  float foreground=1.-smoothstep(.04,.43,vUv.y);
  float drift=(sin(seconds*.026)*.002+pointer.x*.009)*motion;
  float xx=.5+(vUv.x-.5)*scaleX*.973;
  xx+=drift*(.3+sky*.45+foreground*.8);
  yy+=(pointer.y*.003+sin(seconds*.019)*.0015)*motion*abs(vUv.y-skyline);
  // Local, slow cloud advection and very small water displacement preserve the photographs.
  xx+=sin(yy*9.+seconds*.038)*.0018*sky*motion;
  yy+=sin(vUv.x*36.+seconds*.5)*.00045*foreground*motion;
  return clamp(vec2(xx,yy),.001,.999);
}
void main(){
  vec3 a=texture2D(imageA,photoUV(aspectA,horizonA)).rgb;
  vec3 b=texture2D(imageB,photoUV(aspectB,horizonB)).rgb;
  float sky=smoothstep(.38,.7,vUv.y);
  // Slightly stagger sky and land while keeping both interval endpoints exact.
  float f=clamp(blend+(sky-.5)*.12*sin(blend*3.14159265),0.,1.);
  f=f*f*(3.-2.*f);
  vec3 color=pow(mix(pow(a,vec3(2.2)),pow(b,vec3(2.2)),f),vec3(1./2.2));
  float night=smoothstep(1.5,4.,evening);
  color*=mix(vec3(1.025,1.,.978),vec3(.88,.94,1.02),night);
  color*=mix(.94,.79,night);
  // Faint sea haze, with colour and density tied to the same time state.
  float haze=exp(-pow((vUv.y-.438)*24.,2.))*.025*(1.-night*.75);
  color=mix(color,vec3(.78,.64,.48),haze);
  // Sparse stars emerge individually, only high in the sky, behind dark cloud areas.
  vec2 cell=floor(vUv*vec2(310.,180.));
  vec2 point=fract(vUv*vec2(310.,180.))-.5;
  float seed=hash(cell);
  float star=(1.-smoothstep(0.,.13,length(point)))*step(.989,seed);
  float reveal=smoothstep(2.25+seed*.8,3.9,evening);
  float clearSky=smoothstep(.65,.94,vUv.y)*(1.-smoothstep(.18,.38,dot(color,vec3(.21,.72,.07))));
  color+=vec3(.69,.78,1.)*star*reveal*clearSky*.4*(.8+.2*sin(seconds*.65+seed*50.));
  // Extremely restrained drifting atmospheric motes.
  vec2 particleUV=vUv+vec2(seconds*.0006,seconds*.001)*motion;
  vec2 grid=particleUV*vec2(31.,19.);
  float particle=(1.-smoothstep(0.,.045,length(fract(grid)-.5)))*step(.986,hash(floor(grid)));
  color+=vec3(.9,.83,.71)*particle*.05*(1.-night*.5);
  float vignette=1.-.16*pow(length((vUv-.5)*vec2(1.,.8)),1.5);
  gl_FragColor=vec4(color*vignette,1.);
}`;
async function initialize(){
  try{
    renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:false,alpha:false,powerPreference:'high-performance'});
    renderer.debug.onShaderError=()=>{throw new Error('The photographic shader could not compile.');};
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    renderer.setSize(innerWidth,$('experience').clientHeight);
    const loader=new THREE.TextureLoader();
    textures=await Promise.all(phases.map(p=>loader.loadAsync(`assets/${p.file}.jpg`)));
    textures.forEach(t=>{t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;});
    material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{
      imageA:{value:textures[0]},imageB:{value:textures[1]},
      aspectA:{value:1},aspectB:{value:1},horizonA:{value:.478},horizonB:{value:.281},
      viewport:{value:new THREE.Vector2(innerWidth,$('experience').clientHeight)},pointer:{value:new THREE.Vector2()},
      blend:{value:0},evening:{value:0},seconds:{value:0},motion:{value:reducedMotion.matches?0:1}
    }});
    const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
    const camera=new THREE.Camera();
    renderer.compile(scene,camera);
    available=true;
    renderScene=()=>{
      const i=Math.min(3,Math.floor(state.time)), u=material.uniforms;
      u.imageA.value=textures[i];u.imageB.value=textures[i+1];
      u.aspectA.value=textures[i].image.width/textures[i].image.height;u.aspectB.value=textures[i+1].image.width/textures[i+1].image.height;
      u.horizonA.value=phases[i].horizon;u.horizonB.value=phases[i+1].horizon;
      u.blend.value=state.time-i;u.evening.value=state.time;u.seconds.value=elapsed;u.motion.value=reducedMotion.matches?0:1;
      u.pointer.value.set(state.x,state.y);renderer.render(scene,camera);
    };
    renderScene();$('scene').classList.add('ready');
    window.addEventListener('resize',()=>{renderer.setSize(innerWidth,$('experience').clientHeight);material.uniforms.viewport.value.set(innerWidth,$('experience').clientHeight);});
    $('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();available=false;$('scene').classList.remove('ready');updateFallback();});
    $('scene').addEventListener('webglcontextrestored',()=>location.reload());
  }catch(error){console.warn('Photographic fallback active:',error);$('scene').classList.remove('ready');available=false;updateFallback();}
}
let last=performance.now(),renderScene=()=>{};
function frame(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(!document.hidden){
    if(!reducedMotion.matches)elapsed+=dt;
    if(state.playing){state.time=Math.min(4,state.time+dt/45);requestedTime=state.time;if(state.time===4)setPlaying(false);updateUI();}
    if(available)renderScene();
  }
  requestAnimationFrame(frame);
}
updateUI();initialize();requestAnimationFrame(frame);

// Optional agent access uses exactly the same time controller as the visible UI.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  try{Promise.resolve(document.modelContext.registerTool({
    name:'set_evening_time',description:'Move the evening timeline to a position from 0 (sunset) to 4 (starry sky).',
    inputSchema:{type:'object',properties:{position:{type:'number',minimum:0,maximum:4}},required:['position'],additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:false},
    async execute(input){if(!input||typeof input.position!=='number'||!Number.isFinite(input.position)||input.position<0||input.position>4)throw new Error('Position must be a finite number from 0 to 4.');setPlaying(false);const completed=await setTime(input.position);if(!completed)throw new Error('The transition was interrupted by another time change.');return {time:formatTime(state.time),phase:phases[lastPhase].name,position:state.time};}
  },{signal:lifecycle.signal})).catch(()=>{});}catch{}
  addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
