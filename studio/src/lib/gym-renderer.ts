/**
 * The hero's 3D barbell, recoloured to the SportMind blue.
 *
 * Shipped violet — a rim light at [30,12,65], a matching bounce, a violet
 * collar, and a violet-weighted specular rim — which is a different brand's
 * colour on our own landing page. Every one of those is now the blue the rest
 * of the product uses, at the same luminance so the lighting still reads the
 * way it was balanced.
 *
 * Both render paths carry the values. The WebGL2 shader is the one almost
 * everyone sees; the CPU rasteriser below it is the fallback when WebGL2 is
 * missing, and it draws the same geometry with the same lights. They have to be
 * changed together or the fallback quietly stays violet.
 */
// A small, dependency-free WebGL2 studio renderer. All geometry is real 3D;
// pointer and keyboard controls move a perspective camera around the equipment.
type V3 = [number, number, number];
type Mat = Float32Array;
type Material = { color: V3; roughness: number; metalness: number; surface?: number };
type Mesh = { vao: WebGLVertexArrayObject; buffer: WebGLBuffer; count: number; model: Mat; material: Material };
const PI = Math.PI;
let geometrySegments = 144;
const normalize = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const subtract = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const identity = (): Mat => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function multiply(a: Mat, b: Mat): Mat {
  const m = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) m[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return m;
}

// The compatibility path projects and lights the same mesh geometry on the CPU.
// It is used only when a browser cannot create a WebGL2 context.
function createSoftwareGymRenderer(canvas: HTMLCanvasElement, onReady: () => void): () => void {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas unavailable");
  const ctx: CanvasRenderingContext2D = context;
  const apply = (m: Mat, p: V3, w = 1): V3 => [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12]*w,m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13]*w,m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]*w];
  type Face = { points: V3[]; center: V3; normal: V3; material: Material };
  const faces: Face[] = [];
  for(const mesh of buildGymGeometry(96)) {
    if(mesh.material.surface===3)continue;
    const {data,model,material}=mesh;
    // Subpixel grooves use the smooth sleeve material on the compatibility path.
    let minX=Infinity,maxX=-Infinity,maxR=0;
    for(let i=0;i<data.length;i+=6){minX=Math.min(minX,data[i]);maxX=Math.max(maxX,data[i]);maxR=Math.max(maxR,Math.hypot(data[i+1],data[i+2]));}
    if(maxX-minX<.002&&maxR<.028)continue;
    for(let i=0;i<data.length;i+=36){
      const points=[0,6,12,30].map(offset=>apply(model,[data[i+offset],data[i+offset+1],data[i+offset+2]]));
      const center: V3=[0,0,0];for(const p of points)for(let k=0;k<3;k++)center[k]+=p[k]/4;
      const normal=normalize(apply(model,[data[i+3],data[i+4],data[i+5]],0));
      faces.push({points,center,normal,material});
    }
  }
  const lights: {position:V3;color:V3;intensity:number}[]=[
    {position:[-2.2,4,3.2],color:[52,58,70],intensity:1},
    {position:[1.8,2.6,-2.2],color:[14,34,65],intensity:1},
    {position:[3,1.9,3.8],color:[28,32,42],intensity:1},
    {position:[-2.2,2.4,-1.5],color:[6,12,24],intensity:1},
  ];
  const softbox=normalize([-.4,1,1]),rim=normalize([.3,1,-1]);
  const aces=(x:number)=>Math.pow(Math.max(0,Math.min(1,(x*(2.51*x+.03))/(x*(2.43*x+.59)+.14))),1/2.2);
  function shade(face: Face, eye: V3): string {
    const n=face.normal,v=normalize(subtract(eye,face.center)),nv=Math.max(.001,dot(n,v));
    const base=face.material.color,metal=face.material.metalness,rough=face.material.roughness;
    const color:V3=[base[0]*.025,base[1]*.025,base[2]*.025];
    const f0=base.map(c=>.04*(1-metal)+c*metal);
    for(const light of lights){
      const delta=subtract(light.position,face.center),d2=dot(delta,delta),l=normalize(delta),h=normalize([v[0]+l[0],v[1]+l[1],v[2]+l[2]]);
      const nl=Math.max(0,dot(n,l)),nh=Math.max(0,dot(n,h)),vh=Math.max(0,dot(v,h));
      const a2=rough**4,den=nh*nh*(a2-1)+1,D=a2/(PI*den*den+.00001),k=(rough+1)**2/8,G=nv/(nv*(1-k)+k)*nl/(nl*(1-k)+k);
      for(let c=0;c<3;c++){const F=f0[c]+(1-f0[c])*(1-vh)**5;const spec=D*G*F/Math.max(4*nv*nl,.001);color[c]+=((1-F)*(1-metal)*base[c]/PI+spec)*light.color[c]/Math.max(d2,1)*nl;}
    }
    const reflection:V3=[2*nv*n[0]-v[0],2*nv*n[1]-v[1],2*nv*n[2]-v[2]];
    const strip=Math.max(0,dot(reflection,softbox))**(24+(1-rough)*50),accent=Math.max(0,dot(reflection,rim))**35;
    for(let c=0;c<3;c++){const F=f0[c]+(1-f0[c])*(1-nv)**5;color[c]+=F*([2,2.15,2.6][c]*strip+[.28,.62,1.5][c]*accent)*(1-rough*.7);}
    return `rgb(${color.map(c=>Math.round(aces(c)*255)).join(' ')})`;
  }
  let yaw=.42,elevation=.43,width=1,height=1,frame=0,disposed=false;
  function draw(){
    frame=0;if(disposed)return;
    const mobile=width<=900,r=mobile?(width<=580?3.8:3.2):(width/height<1.45?4.5:4.25);
    const eye:V3=[r*Math.sin(yaw)*Math.cos(elevation),.26+r*Math.sin(elevation),r*Math.cos(yaw)*Math.cos(elevation)];
    const view=lookAt(eye,[0,.26,0]),f=1/Math.tan((mobile?37:32)*PI/360),offset=mobile?0:.4;
    const project=(p:V3):[number,number]=>{const v=apply(view,p);return [(v[0]*f/(width/height)/-v[2]+offset+1)*width/2,(-v[1]*f/-v[2]+1)*height/2];};
    ctx.fillStyle='#050506';ctx.fillRect(0,0,width,height);
    // Contact shadows on the ground plane, projected through the same camera.
    for(const x of [-.84,.84]){
      const center=apply(rotateY(-.42),[x,.003,0]);
      ctx.save();ctx.beginPath();
      for(let i=0;i<=64;i++){const a=i/64*PI*2;const p=project([center[0]+Math.cos(a)*.28,0,center[2]+Math.sin(a)*.4]);if(i===0)ctx.moveTo(...p);else ctx.lineTo(...p);}
      ctx.closePath();ctx.fillStyle='#101319';ctx.shadowColor='#1e2733';ctx.shadowBlur=40;ctx.globalAlpha=.45;ctx.fill();ctx.restore();
    }
    const visible=faces.filter(face=>dot(face.normal,subtract(eye,face.center))>0).map(face=>({face,depth:apply(view,face.center)[2]})).sort((a,b)=>a.depth-b.depth);
    ctx.lineWidth=.48;ctx.lineJoin='round';
    for(const {face} of visible){
      const p=face.points.map(project);const color=shade(face,eye);
      ctx.beginPath();ctx.moveTo(...p[0]);for(let i=1;i<p.length;i++)ctx.lineTo(...p[i]);ctx.closePath();ctx.fillStyle=color;ctx.strokeStyle=color;ctx.fill();ctx.stroke();
    }
    canvas.dataset.view=`${yaw.toFixed(4)},${elevation.toFixed(4)}`;
  }
  const invalidate=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(draw);};
  const resize=new ResizeObserver(()=>{const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);invalidate();});
  resize.observe(canvas);
  let dragging=false,px=0,py=0,id=-1;
  const down=(e:PointerEvent)=>{if(e.button!==0)return;dragging=true;id=e.pointerId;px=e.clientX;py=e.clientY;canvas.setPointerCapture(id);};
  const move=(e:PointerEvent)=>{if(!dragging||id!==e.pointerId)return;yaw-=Math.max(-100,Math.min(100,e.clientX-px))*.006;elevation=Math.max(.15,Math.min(1.13,elevation+(e.clientY-py)*.004));px=e.clientX;py=e.clientY;invalidate();};
  const up=()=>{dragging=false;id=-1;};
  const reset=()=>{yaw=.42;elevation=.43;invalidate();};
  const key=(e:KeyboardEvent)=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){reset();return;}if(e.key==='ArrowLeft')yaw+=.1;if(e.key==='ArrowRight')yaw-=.1;if(e.key==='ArrowUp')elevation=Math.min(1.13,elevation+.06);if(e.key==='ArrowDown')elevation=Math.max(.15,elevation-.06);invalidate();};
  const section=canvas.closest('.sportmind-hero');
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('keydown',key);section?.addEventListener('sportmind-reset-view',reset);
  const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);draw();canvas.dataset.ready='true';canvas.dataset.renderer='software-3d';onReady();
  return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('keydown',key);section?.removeEventListener('sportmind-reset-view',reset);};
}
function translation(x: number, y: number, z: number): Mat { const m = identity(); m[12] = x; m[13] = y; m[14] = z; return m; }
function rotateY(a: number): Mat { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]); }
function rotateZ(a: number): Mat { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]); }
function lookAt(eye: V3, target: V3): Mat {
  const z = normalize(subtract(eye, target)), x = normalize(cross([0,1,0], z)), y = cross(z, x);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
function perspective(fov: number, aspect: number, offset: number): Mat {
  const f = 1 / Math.tan(fov / 2), near = .05, far = 50;
  return new Float32Array([f/aspect,0,0,0,0,f,0,0,-offset,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
}
function ortho(size: number, near: number, far: number): Mat { return new Float32Array([1/size,0,0,0,0,1/size,0,0,0,0,-2/(far-near),0,0,0,-(far+near)/(far-near),1]); }

// Lathe a profile around X. Closed profiles give actual bores and beveled edges.
function lathe(profile: [number, number][], segments = 144): Float32Array {
  segments = Math.min(segments, geometrySegments);
  const values: number[] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, r0] = profile[i], [x1, r1] = profile[i + 1];
    const dr = r1 - r0, dx = x1 - x0, l = Math.hypot(dr, dx) || 1;
    const emit = (x: number, r: number, a: number) => { const c = Math.cos(a), s = Math.sin(a); values.push(x,r*c,r*s,-dr/l,dx*c/l,dx*s/l); };
    for (let j = 0; j < segments; j++) {
      const a = j / segments * PI * 2, b = (j + 1) / segments * PI * 2;
      emit(x0,r0,a); emit(x1,r1,a); emit(x1,r1,b);
      emit(x0,r0,a); emit(x1,r1,b); emit(x0,r0,b);
    }
  }
  return new Float32Array(values);
}
function ring(radius: number, tube: number, segments = 144): Float32Array {
  const profile: [number, number][] = [];
  const steps = geometrySegments < 144 ? 8 : 16;
  for (let i = 0; i <= steps; i++) { const a = i / steps * PI * 2; profile.push([-Math.cos(a) * tube, radius + Math.sin(a) * tube]); }
  return lathe(profile, segments);
}
function cylinder(radius: number, width: number, hole = 0, bevel = .002): Float32Array {
  const h = width / 2, b = Math.min(bevel, width * .2, radius * .2);
  return lathe([[-h,hole],[-h,radius-b],[-h+b,radius],[h-b,radius],[h,radius-b],[h,hole],[-h,hole]], 128);
}

type GeometryMesh = { data: Float32Array; model: Mat; material: Material };
function buildGymGeometry(segments = 144): GeometryMesh[] {
  geometrySegments = segments;
  const meshes: GeometryMesh[] = [];
  const add = (data: Float32Array, model: Mat, material: Material) => meshes.push({ data, model, material });
  const rubber: Material = {color:[.029,.031,.039],roughness:.68,metalness:.04,surface:2};
  const inset: Material = {color:[.018,.019,.027],roughness:.53,metalness:.08,surface:2};
  const edge: Material = {color:[.055,.057,.066],roughness:.42,metalness:.25};
  const chrome: Material = {color:[.55,.58,.65],roughness:.22,metalness:.96};
  const grip: Material = {color:[.4,.43,.5],roughness:.35,metalness:.9,surface:1};
  const accent: Material = {color:[.09,.19,.36],roughness:.33,metalness:.65};
  const darkMetal: Material = {color:[.06,.063,.075],roughness:.28,metalness:.88};
  const orientation = rotateY(-.42);
  const place = (x: number, y = .342, z = 0, rz = 0) => multiply(orientation,multiply(translation(x,y,z),rotateZ(rz)));
  add(cylinder(.016,1.43),place(0),chrome);
  for (const sign of [-1,1]) {
    add(cylinder(.0162,.42),place(sign*.43),grip);
    add(cylinder(.017,.004),place(sign*.36),darkMetal);
    add(cylinder(.017,.004),place(sign*.57),darkMetal);
    add(cylinder(.03,.052),place(sign*.727),chrome);
    add(cylinder(.025,.47),place(sign*.985),chrome);
    for (let k=0;k<19;k++) add(ring(.025,.00045,72),place(sign*(1.15+k*.003)),darkMetal);
    const plates = [{x:.798,r:.34,w:.074},{x:.879,r:.338,w:.072},{x:.952,r:.291,w:.058}];
    for (const plate of plates) {
      const h=plate.w/2,r=plate.r;
      add(lathe([[-h,.029],[-h,.084],[-h+.007,.103],[-h+.007,r-.039],[-h,r-.025],[-h,r-.013],[-h+.011,r],[h-.011,r],[h,r-.013],[h,r-.025],[h-.007,r-.039],[h-.007,.103],[h,.084],[h,.029],[-h,.029]]),place(sign*plate.x),rubber);
      for(const face of [-1,1]) {
        add(ring(r-.023,.002),place(sign*plate.x+face*h),edge);
        add(ring(r-.052,.0017),place(sign*plate.x+face*(h-.0068)),inset);
        add(ring(.099,.0025),place(sign*plate.x+face*(h-.003)),edge);
        add(cylinder(.068,.003,.029),place(sign*plate.x+face*(h+.001)),darkMetal);
        add(ring(.031,.002),place(sign*plate.x+face*(h+.003)),chrome);
      }
    }
    add(cylinder(.05,.038,.025,.004),place(sign*1.012),accent);
    add(ring(.046,.0015),place(sign*1.03),edge);
    add(cylinder(.0254,.011,.002),place(sign*1.224),darkMetal);
    add(cylinder(.018,.001),place(sign*1.23),chrome);
  }
  // Two spare plates sit naturally on the studio floor behind the loaded bar.
  for (let k=0;k<2;k++) {
    const y=.031+k*.055;
    add(cylinder(.263,.05,.033,.006),place(.3,y,-.76,PI/2),rubber);
    add(ring(.238,.0025),place(.3,y+.025,-.76,PI/2),edge);
    add(cylinder(.065,.003,.033),place(.3,y+.027,-.76,PI/2),darkMetal);
  }
  const floor = new Float32Array([-18,0,-18,0,1,0, 18,0,-18,0,1,0, 18,0,18,0,1,0, -18,0,-18,0,1,0,18,0,18,0,1,0,-18,0,18,0,1,0]);
  add(floor,identity(),{color:[.021,.022,.027],roughness:.92,metalness:.05,surface:3});

  return meshes;
}

const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
uniform mat4 uModel, uViewProjection, uShadowMatrix;
out vec3 vWorld, vNormal, vLocal;
out vec4 vShadow;
void main(){ vec4 world=uModel*vec4(aPosition,1.); vWorld=world.xyz; vNormal=mat3(uModel)*aNormal; vLocal=aPosition; vShadow=uShadowMatrix*world; gl_Position=uViewProjection*world; }
`;
const fragment = `#version 300 es
precision highp float;
in vec3 vWorld, vNormal, vLocal;
in vec4 vShadow;
uniform vec3 uEye,uColor;
uniform float uRoughness,uMetalness;
uniform int uSurface;
uniform sampler2D uShadow;
out vec4 outColor;
const float PI=3.14159265359;
float noise(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,39.425)))*43758.5453);}
vec3 fresnel(float c, vec3 f0){return f0+(1.-f0)*pow(clamp(1.-c,0.,1.),5.);}
float shadow(){
  vec3 q=vShadow.xyz/vShadow.w*.5+.5;
  if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.)return 1.;
  float sum=0.;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)sum+=q.z-.0018<=texture(uShadow,q.xy+vec2(float(x),float(y))/2048.).r?1.:0.;
  return .22+.78*sum/9.;
}
vec3 light(vec3 lp,vec3 lc,vec3 n,vec3 v,vec3 base,float rough,float metal){
  vec3 delta=lp-vWorld;float distance2=dot(delta,delta);vec3 l=normalize(delta),h=normalize(v+l);
  float nv=max(dot(n,v),.001),nl=max(dot(n,l),0.),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
  float a=rough*rough,a2=a*a,den=nh*nh*(a2-1.)+1.;float D=a2/(PI*den*den+.00001);
  float k=(rough+1.)*(rough+1.)/8.;float G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);
  vec3 F=fresnel(vh,mix(vec3(.04),base,metal));vec3 spec=D*G*F/max(4.*nv*nl,.001);
  return ((1.-F)*(1.-metal)*base/PI+spec)*lc/max(distance2,1.)*nl;
}
vec3 aces(vec3 v){return clamp((v*(2.51*v+.03))/(v*(2.43*v+.59)+.14),0.,1.);}
void main(){
  vec3 n=normalize(vNormal),v=normalize(uEye-vWorld),base=uColor;float rough=uRoughness;
  if(uSurface==1){
    float a=atan(vLocal.z,vLocal.y);float k=sin(vLocal.x*980.+a*95.)*sin(vLocal.x*980.-a*95.);
    base*=.74+.26*smoothstep(-.6,.6,k);rough+=.08*(1.-k);
  }
  if(uSurface==2){base*=.9+.16*noise(floor(vLocal*2600.));}
  vec3 result=base*.025;
  float sh=shadow();
  result+=light(vec3(-2.2,4.,3.2),vec3(52.,58.,70.),n,v,base,rough,uMetalness)*sh;
  result+=light(vec3(1.8,2.6,-2.2),vec3(14.,34.,65.),n,v,base,rough,uMetalness);
  result+=light(vec3(3.,1.9,3.8),vec3(28.,32.,42.),n,v,base,rough,uMetalness);
  result+=light(vec3(-2.2,2.4,-1.5),vec3(6.,12.,24.),n,v,base,rough,uMetalness);
  vec3 r=reflect(-v,n),f=fresnel(max(dot(n,v),0.),mix(vec3(.04),base,uMetalness));
  // Softbox reflections: elongated studio sources, not screen overlays.
  float strip=pow(max(dot(r,normalize(vec3(-.4,1.,1.))),0.),24.+(1.-rough)*50.);
  float rim=pow(max(dot(r,normalize(vec3(.3,1.,-1.))),0.),35.);
  result+=f*(vec3(2.,2.15,2.6)*strip+vec3(.28,.62,1.5)*rim)*(1.-rough*.7);
  vec3 color=pow(aces(result),vec3(1./2.2));
  vec3 bg=vec3(5.,5.,6.)/255.;
  if(uSurface==3){
    float distanceFromCenter=length(vWorld.xz);
    color=mix(bg,color,exp(-distanceFromCenter*distanceFromCenter*.3)*.45);
  }else{color=mix(color,bg,smoothstep(7.,15.,length(vWorld-uEye)));}
  outColor=vec4(color,1.);
}
`;
const shadowVertex = `#version 300 es
precision highp float;
layout(location=0)in vec3 aPosition;
uniform mat4 uModel,uViewProjection;
void main(){gl_Position=uViewProjection*uModel*vec4(aPosition,1.);}`;
const shadowFragment = `#version 300 es
precision highp float;
void main(){}`;

export function createGymRenderer(canvas: HTMLCanvasElement, onReady: () => void, onError: () => void): () => void {
  const context = canvas.getContext("webgl2", { alpha: false, antialias: true, powerPreference: "high-performance" });
  if (!context) return createSoftwareGymRenderer(canvas, onReady);
  const gl: WebGL2RenderingContext = context;
  const programs: WebGLProgram[] = [];
  function program(vs: string, fs: string) {
    const p = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
      const shader = gl.createShader(type)!; gl.shaderSource(shader, src); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); gl.deleteProgram(p); throw new Error(message || "Shader compilation failed"); }
      gl.attachShader(p, shader); gl.deleteShader(shader);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { gl.deleteProgram(p); throw new Error("Shader linking failed"); }
    programs.push(p); return p;
  }
  const main = program(vertex, fragment), depth = program(shadowVertex, shadowFragment);
  const uniforms = Object.fromEntries(["uModel","uViewProjection","uShadowMatrix","uEye","uColor","uRoughness","uMetalness","uSurface","uShadow"].map(key => [key, gl.getUniformLocation(main,key)]));
  const depthModel = gl.getUniformLocation(depth,"uModel"), depthView = gl.getUniformLocation(depth,"uViewProjection");
  const meshes: Mesh[] = [];
  function add(data: Float32Array, model: Mat, material: Material) {
    const vao = gl.createVertexArray()!, buffer = gl.createBuffer()!;
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
    meshes.push({vao,buffer,count:data.length/6,model,material});
  }
  for (const mesh of buildGymGeometry()) add(mesh.data, mesh.model, mesh.material);

  const shadowTexture=gl.createTexture()!, framebuffer=gl.createFramebuffer()!;
  gl.bindTexture(gl.TEXTURE_2D,shadowTexture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,2048,2048,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);
  gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error("Shadow framebuffer unavailable");
  const shadowMatrix=multiply(ortho(2.6,.1,12),lookAt([-2.2,4,3.2],[0,.15,0]));
  gl.enable(gl.DEPTH_TEST); gl.viewport(0,0,2048,2048);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(depth);
  gl.uniformMatrix4fv(depthView,false,shadowMatrix);
  for(const mesh of meshes){gl.bindVertexArray(mesh.vao);gl.uniformMatrix4fv(depthModel,false,mesh.model);gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.useProgram(main);
  gl.uniformMatrix4fv(uniforms.uShadowMatrix,false,shadowMatrix);gl.uniform1i(uniforms.uShadow,0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);

  let yaw=.42, elevation=.43, targetYaw=yaw, targetElevation=elevation;
  let frame=0, disposed=false, visible=true, width=1, height=1, lastTime=0, motion=false;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  let distance=4.25;
  function draw(){
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(5/255,5/255,6/255,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const mobile=width<=900;
    const r=mobile?(width<=580?3.8:3.2):distance;
    const eye: V3=[r*Math.sin(yaw)*Math.cos(elevation),.26+r*Math.sin(elevation),r*Math.cos(yaw)*Math.cos(elevation)];
    const fov=(mobile?37:32)*PI/180;
    const projection=perspective(fov,width/height,mobile?0:.4);
    gl.uniformMatrix4fv(uniforms.uViewProjection,false,multiply(projection,lookAt(eye,[0,.26,0])));
    gl.uniform3fv(uniforms.uEye,eye);
    for(const mesh of meshes){
      const {material}=mesh;
      gl.uniformMatrix4fv(uniforms.uModel,false,mesh.model);gl.uniform3fv(uniforms.uColor,material.color);
      gl.uniform1f(uniforms.uRoughness,material.roughness);gl.uniform1f(uniforms.uMetalness,material.metalness);gl.uniform1i(uniforms.uSurface,material.surface||0);
      gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
    canvas.dataset.view=`${yaw.toFixed(4)},${elevation.toFixed(4)}`;
  }
  function tick(time: number){
    frame=0;if(disposed||!visible)return;
    const dt=Math.min((time-lastTime)/1000||1/60,.05);lastTime=time;
    const lerp=reduced.matches?1:1-Math.exp(-16*dt);
    yaw+=(targetYaw-yaw)*lerp;elevation+=(targetElevation-elevation)*lerp;
    draw();
    motion=Math.abs(yaw-targetYaw)+Math.abs(elevation-targetElevation)>.00008;
    if(motion)frame=requestAnimationFrame(tick);
  }
  function invalidate(){if(!frame&&!disposed&&visible)frame=requestAnimationFrame(tick);}
  const resize=new ResizeObserver(()=>{
    const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
    const ratio=Math.min(devicePixelRatio||1,1.75);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    distance=width/height<1.45?4.5:4.25;
    invalidate();
  });
  resize.observe(canvas);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)invalidate();else{cancelAnimationFrame(frame);frame=0;}});
  intersection.observe(canvas);
  let dragging=false,pointerId=-1,px=0,py=0;
  const down=(e:PointerEvent)=>{if(e.button!==0)return;dragging=true;pointerId=e.pointerId;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{if(!dragging||e.pointerId!==pointerId)return;targetYaw-=Math.max(-100,Math.min(100,e.clientX-px))*.006;targetElevation=Math.max(.15,Math.min(1.13,targetElevation+(e.clientY-py)*.004));px=e.clientX;py=e.clientY;invalidate();};
  const up=()=>{dragging=false;pointerId=-1;};
  const reset=()=>{targetYaw=.42;targetElevation=.43;invalidate();};
  const key=(e:KeyboardEvent)=>{
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home"].includes(e.key))return;
    e.preventDefault();if(e.key==="Home"){reset();return;}
    if(e.key==="ArrowLeft")targetYaw+=.1;if(e.key==="ArrowRight")targetYaw-=.1;
    if(e.key==="ArrowUp")targetElevation=Math.min(1.13,targetElevation+.06);if(e.key==="ArrowDown")targetElevation=Math.max(.15,targetElevation-.06);invalidate();
  };
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else invalidate();};
  const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(frame);frame=0;onError();};
  const section=canvas.closest(".sportmind-hero");
  canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);canvas.addEventListener("lostpointercapture",up);canvas.addEventListener("keydown",key);canvas.addEventListener("webglcontextlost",lost);
  section?.addEventListener("sportmind-reset-view",reset);document.addEventListener("visibilitychange",visibility);
  const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
  const ratio=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  distance=width/height<1.45?4.5:4.25;
  draw();canvas.dataset.ready="true";onReady();
  return()=>{
    disposed=true;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();
    canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("lostpointercapture",up);canvas.removeEventListener("keydown",key);canvas.removeEventListener("webglcontextlost",lost);
    section?.removeEventListener("sportmind-reset-view",reset);document.removeEventListener("visibilitychange",visibility);
    for(const mesh of meshes){gl.deleteVertexArray(mesh.vao);gl.deleteBuffer(mesh.buffer);}for(const p of programs)gl.deleteProgram(p);gl.deleteTexture(shadowTexture);gl.deleteFramebuffer(framebuffer);
  };
}
