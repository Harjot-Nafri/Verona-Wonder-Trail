// Effetto aura/riflettore della home (spostato fuori da index.html per la CSP)
(function(){
var a=document.getElementById('aura'),st=document.getElementById('stage');
if(!a)return;
var calm=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
var sp=document.createElement('div');sp.className='spot';document.body.appendChild(sp);
var pu=0,tx=0,ty=0,x=0,y=0,spin=0,sv=0,mx=innerWidth/2,my=innerHeight/3,sx=mx,sy=my,on=0;
function set(cx,cy){if(on){sv=Math.min(sv+Math.hypot(cx-mx,cy-my)*.05,12)}mx=cx;my=cy;on=1;tx=Math.max(-1,Math.min(1,(cx/innerWidth-.5)*2));ty=Math.max(-1,Math.min(1,(cy/innerHeight-.5)*2))}
addEventListener('pointermove',function(e){set(e.clientX,e.clientY)},{passive:true});
addEventListener('pointerdown',function(e){set(e.clientX,e.clientY)},{passive:true});
addEventListener('touchmove',function(e){var t=e.touches[0];if(t)set(t.clientX,t.clientY)},{passive:true});
addEventListener('touchstart',function(e){var t=e.touches[0];if(t)set(t.clientX,t.clientY)},{passive:true});
addEventListener('deviceorientation',function(e){if(e.gamma==null)return;tx=Math.max(-1,Math.min(1,e.gamma/30));ty=Math.max(-1,Math.min(1,((e.beta||45)-45)/30));mx=innerWidth*(.5+tx*.4);my=innerHeight*(.33+ty*.3);on=1},{passive:true});
st.addEventListener('pointerdown',function(){sv+=14});
(function f(){x+=(tx-x)*.1;y+=(ty-y)*.1;sx+=(mx-sx)*.18;sy+=(my-sy)*.18;sv*=.95;spin+=(calm?.15:.35)+sv;pu+=.03;
a.style.transform='translate('+(x*22)+'px,'+(y*22)+'px) rotate('+(spin+x*14)+'deg) scale('+(1+Math.sin(pu)*.05)+')';
sp.style.transform='translate('+(sx-170)+'px,'+(sy-170)+'px)';sp.style.opacity=on?1:0;
var r=document.documentElement.style;r.setProperty('--px',(x*18)+'%');r.setProperty('--py',(y*14)+'%');
requestAnimationFrame(f)})();
})();
