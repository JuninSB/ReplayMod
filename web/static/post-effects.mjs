// Screen-space approximations of Roblox post effects, applied before output tonemapping.
export function postEffectShader(THREE) {
  return {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(1, 1) },
      brightness: { value: 0 },
      contrast: { value: 0 },
      saturation: { value: 0 },
      tint: { value: new THREE.Color(1, 1, 1) },
      blurSize: { value: 0 },
      sunPosition: { value: new THREE.Vector2(0.5, 0.5) },
      sunIntensity: { value: 0 },
      atmosphereGlare: { value: 0 },
      sunSpread: { value: 0.5 },
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float brightness,contrast,saturation,blurSize,sunIntensity,sunSpread,atmosphereGlare; uniform vec3 tint; uniform vec2 sunPosition; varying vec2 vUv;
    void main(){
      vec2 d=vec2(blurSize)/max(resolution,vec2(1.0));
      vec3 c=texture2D(tDiffuse,vUv).rgb;
      if(blurSize>0.0){
        c*=0.25;
        c+=(texture2D(tDiffuse,vUv+vec2(d.x,0.)).rgb+texture2D(tDiffuse,vUv-vec2(d.x,0.)).rgb+texture2D(tDiffuse,vUv+vec2(0.,d.y)).rgb+texture2D(tDiffuse,vUv-vec2(0.,d.y)).rgb)*0.125;
        c+=(texture2D(tDiffuse,vUv+d).rgb+texture2D(tDiffuse,vUv-d).rgb+texture2D(tDiffuse,vUv+vec2(d.x,-d.y)).rgb+texture2D(tDiffuse,vUv+vec2(-d.x,d.y)).rgb)*0.0625;
      }
      if(sunIntensity>0.0){
        vec2 stepUv=(sunPosition-vUv)*(0.25+sunSpread*0.5)/12.0; vec2 sampleUv=vUv; vec3 rays=vec3(0.0);
        for(int i=0;i<12;i++){ sampleUv+=stepUv; vec3 lit=texture2D(tDiffuse,clamp(sampleUv,0.0,1.0)).rgb; rays+=max(lit-vec3(0.65),vec3(0.0)); }
        c+=rays*(sunIntensity/12.0);
      }
      if(atmosphereGlare>0.0){
        vec2 delta=vUv-sunPosition; delta.x*=resolution.x/max(resolution.y,1.0);
        float halo=exp(-dot(delta,delta)*32.0)*atmosphereGlare*0.15;
        c+=vec3(1.0,0.95,0.85)*halo*smoothstep(0.3,1.0,dot(c,vec3(0.2126,0.7152,0.0722)));
      }
      c=(c-0.5)*(1.0+contrast)+0.5+brightness;
      c=mix(vec3(dot(c,vec3(0.2126,0.7152,0.0722))),c,1.0+saturation)*tint;
      gl_FragColor=vec4(max(c,vec3(0.0)),1.0);
    }`,
  };
}
