import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { X } from "lucide-react";
import * as THREE from "three";
import { TOUCH } from "three";

const COLOR = {
  bg: "#010101",
  orbit: "#ececec",
  sun: "#fff8ee",
  mercury: "#c8c2b8",
  venus: "#e7d3a6",
  earth: "#4e86c4",
  mars: "#c25b3a",
  jupiter: "#d2b184",
  saturn: "#e6d4ae",
  ring: "#f3e6cc",
  uranus: "#b5e3de",
  neptune: "#456fc4",
  moon: "#ddd9d3",
  sunLight: "#fff3df",
} as const;

type MoonSpec = {
  radius: number;
  distance: number;
  speed: number;
  phase: number;
  color: string;
};

type PlanetSpec = {
  name: string;
  radius: number;
  distance: number;
  speed: number;
  phase: number;
  inclination: number;
  axial: number;
  spin: number;
  color: string;
  atmosphere?: string;
  ring?: { inner: number; outer: number };
  moons?: MoonSpec[];
};

const PLANETS: PlanetSpec[] = [
  {
    name: "Mercury",
    radius: 0.09,
    distance: 2.05,
    speed: 0.34,
    phase: 0.4,
    inclination: 0.11,
    axial: 0.02,
    spin: 0.15,
    color: COLOR.mercury,
  },
  {
    name: "Venus",
    radius: 0.145,
    distance: 2.78,
    speed: 0.26,
    phase: 2.2,
    inclination: -0.05,
    axial: 0.09,
    spin: 0.08,
    color: COLOR.venus,
    atmosphere: "#f0d9a8",
  },
  {
    name: "Earth",
    radius: 0.155,
    distance: 3.58,
    speed: 0.2,
    phase: 4.1,
    inclination: 0.02,
    axial: 0.41,
    spin: 0.55,
    color: COLOR.earth,
    atmosphere: "#6eb6ff",
    moons: [
      {
        radius: 0.042,
        distance: 0.36,
        speed: 1.15,
        phase: 1.1,
        color: COLOR.moon,
      },
    ],
  },
  {
    name: "Mars",
    radius: 0.115,
    distance: 4.4,
    speed: 0.16,
    phase: 1.35,
    inclination: 0.08,
    axial: 0.44,
    spin: 0.5,
    color: COLOR.mars,
    atmosphere: "#d4845c",
  },
  {
    name: "Jupiter",
    radius: 0.38,
    distance: 5.95,
    speed: 0.09,
    phase: 3.4,
    inclination: -0.03,
    axial: 0.05,
    spin: 0.9,
    color: COLOR.jupiter,
    atmosphere: "#e8c898",
  },
  {
    name: "Saturn",
    radius: 0.32,
    distance: 7.5,
    speed: 0.065,
    phase: 5.5,
    inclination: 0.07,
    axial: 0.47,
    spin: 0.8,
    color: COLOR.saturn,
    atmosphere: "#f0dfb8",
    ring: { inner: 0.46, outer: 0.72 },
  },
  {
    name: "Uranus",
    radius: 0.21,
    distance: 8.95,
    speed: 0.045,
    phase: 0.85,
    inclination: -0.09,
    axial: 1.68,
    spin: 0.45,
    color: COLOR.uranus,
    atmosphere: "#c8f4ef",
  },
  {
    name: "Neptune",
    radius: 0.2,
    distance: 10.25,
    speed: 0.034,
    phase: 2.75,
    inclination: 0.05,
    axial: 0.49,
    spin: 0.48,
    color: COLOR.neptune,
    atmosphere: "#6a9cff",
  },
];

const FACTS: Record<string, { line: string; stats: [string, string][] }> = {
  Mercury: {
    line: "Closest to the Sun. A year here lasts 88 days.",
    stats: [
      ["Year", "88 days"],
      ["Moons", "None"],
    ],
  },
  Venus: {
    line: "The hottest planet. It spins the other way.",
    stats: [
      ["Day", "243 Earth days"],
      ["Moons", "None"],
    ],
  },
  Earth: {
    line: "The only world we know that holds life.",
    stats: [
      ["Moons", "1"],
      ["Day", "24 hours"],
    ],
  },
  Mars: {
    line: "Iron dust turns the ground and the sky red.",
    stats: [
      ["Moons", "2"],
      ["Day", "24.6 hours"],
    ],
  },
  Jupiter: {
    line: "The largest planet. A storm bigger than Earth.",
    stats: [
      ["Moons", "95"],
      ["Year", "12 Earth years"],
    ],
  },
  Saturn: {
    line: "Rings of ice, wide enough to see from here.",
    stats: [
      ["Rings", "Ice and rock"],
      ["Moons", "140+"],
    ],
  },
  Uranus: {
    line: "Rolled onto its side. Seasons last for decades.",
    stats: [
      ["Tilt", "98°"],
      ["Year", "84 Earth years"],
    ],
  },
  Neptune: {
    line: "The far one. Winds faster than sound.",
    stats: [
      ["Winds", "2,000 km/h"],
      ["Year", "165 Earth years"],
    ],
  },
};

type RestPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  distance: number;
};

type LiveState = {
  distance: number;
  rest: number;
  focused: boolean;
};

type CameraApi = {
  dolly: (deltaY: number) => void;
  armSnap: () => void;
  focus: (name: string | null) => void;
};

type OverlayRefs = {
  svg: SVGSVGElement | null;
  line: SVGLineElement | null;
  dot: SVGCircleElement | null;
  card: HTMLElement | null;
  wrap: HTMLDivElement | null;
};

const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float v=0.0;float a=0.5;
  for(int i=0;i<5;i++){v+=a*snoise(p);p*=2.05;a*=0.5;}
  return v;
}
`;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return reduced;
}

const FOCUS_Y = -1.05;

function frameFor(width: number, height: number) {
  const aspect = width / height;
  if (aspect < 0.85) return { y: 48, z: 42, fov: 48 };
  if (height < 560) return { y: 15, z: 32, fov: 36 };
  return { y: 13.5, z: 30, fov: 33 };
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function makePlanetTexture(name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width: w, height: h } = canvas;

  if (name === "Earth") {
    ctx.fillStyle = "#123a6a";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 3 === 0 ? "#6f9a4a" : "#2f6b3a";
      ctx.beginPath();
      ctx.ellipse(
        hash(i + 1) * w,
        h * 0.18 + hash(i + 8) * h * 0.62,
        18 + hash(i + 3) * 42,
        10 + hash(i + 5) * 18,
        hash(i + 2) * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      ctx.ellipse(
        hash(i + 50) * w,
        hash(i + 60) * h,
        20 + hash(i + 70) * 36,
        4 + hash(i + 80) * 8,
        hash(i + 90) * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    const ice = ctx.createLinearGradient(0, 0, 0, h);
    ice.addColorStop(0, "rgba(255,255,255,0.95)");
    ice.addColorStop(0.12, "rgba(255,255,255,0)");
    ice.addColorStop(0.88, "rgba(255,255,255,0)");
    ice.addColorStop(1, "rgba(255,255,255,0.95)");
    ctx.fillStyle = ice;
    ctx.fillRect(0, 0, w, h);
  } else if (name === "Jupiter" || name === "Saturn") {
    const bands =
      name === "Jupiter"
        ? ["#c9a36a", "#efe0c2", "#a87448", "#e7d3aa", "#8d5a38", "#f3e6c8", "#b88958", "#d8b078"]
        : ["#f0e2c4", "#d7c094", "#efe6d0", "#c6a56e", "#f7edd8", "#b99668", "#e8d4ae"];
    const bandH = h / bands.length;
    bands.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * bandH, w, bandH + 1);
      const swirl = ctx.createLinearGradient(0, i * bandH, w, i * bandH + bandH);
      swirl.addColorStop(0, "rgba(255,255,255,0)");
      swirl.addColorStop(0.45, "rgba(255,255,255,0.08)");
      swirl.addColorStop(1, "rgba(0,0,0,0.08)");
      ctx.fillStyle = swirl;
      ctx.fillRect(0, i * bandH, w, bandH + 1);
    });
    if (name === "Jupiter") {
      const spot = ctx.createRadialGradient(w * 0.62, h * 0.58, 2, w * 0.62, h * 0.58, 22);
      spot.addColorStop(0, "#e8784a");
      spot.addColorStop(0.55, "#c4553a");
      spot.addColorStop(1, "rgba(164,84,48,0)");
      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.ellipse(w * 0.62, h * 0.58, 20, 12, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (name === "Mars") {
    ctx.fillStyle = "#b55232";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = i % 2 ? "#8a3a24" : "#c86a44";
      ctx.beginPath();
      ctx.ellipse(hash(i) * w, hash(i + 4) * h, 20 + hash(i + 2) * 28, 8 + hash(i + 7) * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(245,236,230,0.88)";
    ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(0, h - 12, w, 12);
  } else if (name === "Venus") {
    const wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, "#f3e2b8");
    wash.addColorStop(0.5, "#e0c484");
    wash.addColorStop(1, "#c9a56a");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,248,230,0.5)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(0, hash(i) * h);
      ctx.bezierCurveTo(w * 0.3, hash(i + 2) * h, w * 0.6, hash(i + 4) * h, w, hash(i + 6) * h);
      ctx.stroke();
    }
  } else if (name === "Uranus" || name === "Neptune") {
    ctx.fillStyle = name === "Uranus" ? "#9fdad4" : "#2458a8";
    ctx.fillRect(0, 0, w, h);
    const band = ctx.createLinearGradient(0, 0, 0, h);
    band.addColorStop(0.35, "rgba(255,255,255,0)");
    band.addColorStop(0.48, name === "Uranus" ? "rgba(255,255,255,0.28)" : "rgba(140,190,255,0.4)");
    band.addColorStop(0.55, "rgba(255,255,255,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, w, h);
    if (name === "Neptune") {
      const spot = ctx.createRadialGradient(w * 0.3, h * 0.38, 1, w * 0.3, h * 0.38, 14);
      spot.addColorStop(0, "#d7ecff");
      spot.addColorStop(1, "rgba(80,130,210,0)");
      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.ellipse(w * 0.3, h * 0.38, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = name === "Moon" ? "#c8c4bc" : "#b7b1a8";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(70,66,60,0.5)";
    for (let i = 0; i < 36; i++) {
      ctx.beginPath();
      ctx.arc(hash(i) * w, hash(i + 3) * h, 2 + hash(i + 6) * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function makeRingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  for (let x = 0; x < 512; x++) {
    const t = x / 511;
    const gap = Math.abs(t - 0.42) < 0.035 ? 0.05 : 1;
    const grain = 0.55 + hash(x * 0.17) * 0.45;
    const alpha = gap * grain * (0.15 + 0.85 * Math.sin(t * Math.PI));
    const shade = 180 + hash(x * 0.31) * 75;
    ctx.fillStyle = `rgba(${shade},${shade - 12},${shade - 36},${alpha})`;
    ctx.fillRect(x, 0, 1, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function makeGlowTexture(inner: number) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const c = size / 2;
  const glow = ctx.createRadialGradient(c, c, c * inner, c, c, c);
  glow.addColorStop(0, "rgba(255, 236, 190, 0)");
  glow.addColorStop(0.08, "rgba(255, 214, 120, 0.95)");
  glow.addColorStop(0.28, "rgba(255, 140, 36, 0.32)");
  glow.addColorStop(0.55, "rgba(255, 90, 12, 0.08)");
  glow.addColorStop(1, "rgba(255, 60, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Starfield({ animate }: { animate: boolean }) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vDir;
        uniform float uTime;
        uniform float uIntensity;

        float hash31(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        void main() {
          vec3 dir = normalize(vDir);
          float milky = pow(1.0 - abs(dir.y), 2.4) * 0.045;
          vec3 col = vec3(0.004, 0.004, 0.006) + milky * vec3(0.1, 0.11, 0.16);

          float cells = 180.0;
          vec3 cell = floor(dir * cells);
          float n = hash31(cell);
          float twinkle = 0.65 + 0.35 * sin(uTime * (1.4 + n * 3.2) + n * 40.0);
          float star = smoothstep(0.992, 1.0, n) * twinkle;
          float bright = smoothstep(0.997, 1.0, n);
          col += star * vec3(0.75, 0.82, 1.0) * uIntensity;
          col += bright * vec3(1.0, 0.95, 0.85) * 1.4 * uIntensity;

          float dust = hash31(dir * 42.0);
          col += smoothstep(0.86, 1.0, dust) * 0.02 * vec3(0.5, 0.6, 1.0);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (animate) material.uniforms.uTime.value += delta;
  });

  return (
    <mesh material={material} renderOrder={-10}>
      <sphereGeometry args={[90, 48, 32]} />
    </mesh>
  );
}

function OrbitLine({
  radius,
  dim,
  animate,
}: {
  radius: number;
  dim: number;
  animate: boolean;
}) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const segments = 320;
    const positions = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [radius]);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uDim: { value: 0 },
        uColor: { value: new THREE.Color(COLOR.orbit) },
      },
      vertexShader: /* glsl */ `
        varying float vAngle;
        void main() {
          vAngle = atan(position.z, position.x);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying float vAngle;
        uniform float uTime;
        uniform float uDim;
        uniform vec3 uColor;
        void main() {
          float dash = 0.55 + 0.45 * sin(vAngle * 28.0 - uTime * 0.55);
          float glow = 0.22 + 0.18 * sin(vAngle * 3.0 + uTime * 0.35);
          float alpha = mix(0.18, 0.55, dash) * glow;
          alpha *= mix(1.0, 0.18, uDim);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      mat.dispose();
    };
  }, [geometry, mat]);

  useFrame((_, delta) => {
    mat.uniforms.uDim.value = THREE.MathUtils.damp(mat.uniforms.uDim.value, dim, 4, delta);
    if (animate) mat.uniforms.uTime.value += delta;
    if (material.current) material.current.uniforms.uDim.value = mat.uniforms.uDim.value;
  });

  const line = useMemo(() => {
    const object = new THREE.Line(geometry, mat);
    object.raycast = () => undefined;
    return object;
  }, [geometry, mat]);

  return <primitive object={line} />;
}

function Atmosphere({
  radius,
  color,
  intensity,
  animate,
  selected,
}: {
  radius: number;
  color: string;
  intensity: number;
  animate: boolean;
  selected: boolean;
}) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
        uPulse: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalW;
        varying vec3 vView;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vView = normalize(cameraPosition - world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vNormalW;
        varying vec3 vView;
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uPulse;
        uniform float uTime;
        void main() {
          float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vView)), 0.0), 2.8);
          float breath = 0.92 + 0.08 * sin(uTime * 1.2);
          float alpha = fresnel * uIntensity * breath * (1.0 + uPulse * 0.55);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
  }, [color, intensity]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (animate) material.uniforms.uTime.value += delta;
    const target = selected ? 1 : 0;
    material.uniforms.uPulse.value = THREE.MathUtils.damp(
      material.uniforms.uPulse.value,
      target,
      5,
      delta,
    );
  });

  return (
    <mesh scale={1.18} material={material}>
      <sphereGeometry args={[radius, 48, 32]} />
    </mesh>
  );
}

function PlanetBody({
  name,
  radius,
  texture,
  selected,
  hot,
  animate,
  gas,
}: {
  name: string;
  radius: number;
  texture: THREE.Texture | null;
  selected: boolean;
  hot: boolean;
  animate: boolean;
  gas: boolean;
}) {
  const material = useMemo(() => {
    const tintKey = name.toLowerCase() as keyof typeof COLOR;
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uHasMap: { value: texture ? 1 : 0 },
        uColor: { value: new THREE.Color("white") },
        uSunPos: { value: new THREE.Vector3(0, 0, 0) },
        uTime: { value: 0 },
        uSelect: { value: 0 },
        uGas: { value: gas ? 1 : 0 },
        uTint: { value: new THREE.Color(COLOR[tintKey] ?? "#ffffff") },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPos = world.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWorldPos;
        varying vec3 vNormalW;
        varying vec2 vUv;
        uniform sampler2D uMap;
        uniform float uHasMap;
        uniform vec3 uColor;
        uniform vec3 uSunPos;
        uniform float uTime;
        uniform float uSelect;
        uniform float uGas;
        uniform vec3 uTint;

        void main() {
          vec3 N = normalize(vNormalW);
          vec3 L = normalize(uSunPos - vWorldPos);
          float ndl = max(dot(N, L), 0.0);
          float wrap = ndl * 0.72 + 0.28;
          float soft = smoothstep(0.0, 0.55, ndl);
          float night = 1.0 - soft;

          vec3 albedo = uTint;
          if (uHasMap > 0.5) {
            albedo = texture2D(uMap, vUv).rgb;
          }
          albedo *= uColor;

          vec3 light = vec3(1.0, 0.96, 0.88);
          vec3 ambient = vec3(0.035, 0.038, 0.05);
          vec3 diffuse = albedo * light * (0.16 + 0.98 * wrap);

          float rim = pow(1.0 - max(dot(N, normalize(cameraPosition - vWorldPos)), 0.0), 3.0);
          vec3 atmosphere = mix(uTint, light, 0.35) * rim * (0.16 + 0.38 * soft);

          float spec = pow(max(dot(reflect(-L, N), normalize(cameraPosition - vWorldPos)), 0.0), mix(48.0, 18.0, uGas));
          vec3 specular = light * spec * mix(0.07, 0.24, uGas) * soft;

          vec3 nightGlow = albedo * vec3(0.015, 0.02, 0.04) * night;
          vec3 color = ambient * albedo + diffuse + atmosphere + specular + nightGlow;
          float pulse = 0.5 + 0.5 * sin(uTime * 2.4);
          color += uTint * uSelect * (0.14 + 0.12 * pulse);
          color = pow(max(color, 0.0), vec3(0.96));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, [texture, gas, name]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (animate) material.uniforms.uTime.value += delta;
    const target = selected || hot ? 1 : 0;
    material.uniforms.uSelect.value = THREE.MathUtils.damp(
      material.uniforms.uSelect.value,
      target,
      6,
      delta,
    );
  });

  return (
    <mesh material={material}>
      <sphereGeometry args={[radius, 64, 48]} />
    </mesh>
  );
}

function Ring({
  inner,
  outer,
  texture,
  animate,
}: {
  inner: number;
  outer: number;
  texture: THREE.Texture | null;
  animate: boolean;
}) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uMap: { value: texture },
        uHasMap: { value: texture ? 1 : 0 },
        uSunPos: { value: new THREE.Vector3(0, 0, 0) },
        uTime: { value: 0 },
        uInner: { value: inner },
        uOuter: { value: outer },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPos = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        uniform sampler2D uMap;
        uniform float uHasMap;
        uniform vec3 uSunPos;
        uniform float uTime;
        uniform float uInner;
        uniform float uOuter;

        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float t = clamp((r - uInner / uOuter) / (1.0 - uInner / uOuter), 0.0, 1.0);
          // ringGeometry uv maps radial differently — use distance from center in plane
          float radial = (r - (uInner / uOuter)) / max(1e-4, 1.0 - (uInner / uOuter));
          radial = clamp(radial, 0.0, 1.0);

          float alpha = 0.0;
          vec3 color = vec3(0.92, 0.86, 0.72);
          if (uHasMap > 0.5) {
            vec4 tex = texture2D(uMap, vec2(radial, 0.5));
            color = tex.rgb;
            alpha = tex.a;
          } else {
            alpha = smoothstep(0.0, 0.08, radial) * smoothstep(1.0, 0.9, radial);
          }

          float lit = 0.55 + 0.45 * max(dot(normalize(uSunPos - vWorldPos), vec3(0.0, 1.0, 0.0)), 0.0);
          float shimmer = 0.92 + 0.08 * sin(radial * 40.0 - uTime * 0.4);
          alpha *= 0.92 * shimmer;
          gl_FragColor = vec4(color * lit, alpha);
        }
      `,
    });
  }, [texture, inner, outer]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (animate) material.uniforms.uTime.value += delta;
  });

  return (
    <mesh rotation={[Math.PI / 2.15, 0, 0]} material={material}>
      <ringGeometry args={[inner, outer, 128]} />
    </mesh>
  );
}

function Moon({ moon, animate }: { moon: MoonSpec; animate: boolean }) {
  const pivot = useRef<THREE.Group>(null);
  const angle = useRef(moon.phase);
  const texture = useMemo(() => makePlanetTexture("Moon"), []);

  useEffect(() => () => texture?.dispose(), [texture]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (animate) angle.current += moon.speed * dt;
    if (pivot.current) pivot.current.rotation.y = angle.current;
  });

  return (
    <group ref={pivot} rotation={[0, moon.phase, 0]}>
      <group position={[moon.distance, 0, 0]}>
        <PlanetBody
          name="Moon"
          radius={moon.radius}
          texture={texture}
          selected={false}
          hot={false}
          animate={animate}
          gas={false}
        />
      </group>
    </group>
  );
}

function Planet({
  spec,
  animate,
  selected,
  anyFocused,
  nodes,
  onSelect,
}: {
  spec: PlanetSpec;
  animate: boolean;
  selected: boolean;
  anyFocused: boolean;
  nodes: { current: Record<string, THREE.Object3D> };
  onSelect: (name: string) => void;
}) {
  const pivot = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const angle = useRef(spec.phase);
  const [hot, setHot] = useState(false);
  const texture = useMemo(() => makePlanetTexture(spec.name), [spec.name]);
  const ringTexture = useMemo(() => (spec.ring ? makeRingTexture() : null), [spec.ring]);
  const gas = spec.name === "Jupiter" || spec.name === "Saturn" || spec.name === "Uranus" || spec.name === "Neptune";

  useLayoutEffect(() => {
    if (body.current) nodes.current[spec.name] = body.current;
  }, [nodes, spec.name]);

  useEffect(() => {
    return () => {
      texture?.dispose();
      ringTexture?.dispose();
    };
  }, [texture, ringTexture]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (animate) angle.current += spec.speed * dt;
    if (pivot.current) pivot.current.rotation.y = angle.current;
    if (spin.current && animate) spin.current.rotation.y += dt * spec.spin;
  });

  const choose = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(spec.name);
  };
  const over = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHot(true);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    setHot(false);
    document.body.style.cursor = "";
  };

  const dim = anyFocused && !selected ? 1 : 0;

  return (
    <group rotation={[spec.inclination, 0, 0]}>
      <OrbitLine radius={spec.distance} dim={dim} animate={animate} />
      <group ref={pivot} rotation={[0, spec.phase, 0]}>
        <group position={[spec.distance, 0, 0]}>
          <group ref={spin} rotation={[0, 0, spec.axial]}>
            <group ref={body}>
              <PlanetBody
                name={spec.name}
                radius={spec.radius}
                texture={texture}
                selected={selected}
                hot={hot}
                animate={animate}
                gas={gas}
              />
              {spec.atmosphere ? (
                <Atmosphere
                  radius={spec.radius}
                  color={spec.atmosphere}
                  intensity={spec.name === "Earth" ? 0.55 : 0.32}
                  animate={animate}
                  selected={selected || hot}
                />
              ) : null}
            </group>
            <mesh onClick={choose} onPointerOver={over} onPointerOut={out}>
              <sphereGeometry args={[Math.max(spec.radius * 2.4, 1.15), 16, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {spec.ring ? (
              <group onClick={choose} onPointerOver={over} onPointerOut={out}>
                <Ring
                  inner={spec.ring.inner}
                  outer={spec.ring.outer}
                  texture={ringTexture}
                  animate={animate}
                />
              </group>
            ) : null}
          </group>
          {spec.moons?.map((moon) => (
            <Moon key={moon.phase} moon={moon} animate={animate} />
          ))}
        </group>
      </group>
    </group>
  );
}

function Sun({ animate }: { animate: boolean }) {
  const surface = useRef<THREE.Mesh>(null);
  const limb = useMemo(() => makeGlowTexture(0.42), []);
  const corona = useMemo(() => makeGlowTexture(0.28), []);
  const haze = useMemo(() => makeGlowTexture(0.18), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalV;
        varying vec3 vPos;
        void main() {
          vPos = position;
          vNormalV = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vNormalV;
        varying vec3 vPos;
        uniform float uTime;
        ${NOISE_GLSL}
        void main() {
          vec3 nrm = normalize(vNormalV);
          float mu = clamp(nrm.z, 0.0, 1.0);
          float limb = pow(mu, 0.42);

          vec3 p = normalize(vPos) * 2.4;
          float n1 = fbm(p + vec3(uTime * 0.035, uTime * 0.02, -uTime * 0.015));
          float n2 = fbm(p * 2.2 + vec3(-uTime * 0.05, uTime * 0.03, uTime * 0.02));
          float gran = 0.55 + 0.45 * n1;
          float spot = smoothstep(0.35, 0.75, n2);

          vec3 core = vec3(1.0, 0.93, 0.62);
          vec3 mid = vec3(1.0, 0.62, 0.18);
          vec3 edge = vec3(0.72, 0.14, 0.02);
          vec3 col = mix(mid, core, gran);
          col = mix(col, vec3(0.45, 0.1, 0.02), spot * 0.55);
          col = mix(edge, col, smoothstep(0.0, 0.85, limb));
          col *= 0.72 + 0.55 * limb;
          col += vec3(1.0, 0.7, 0.25) * pow(limb, 8.0) * 0.35;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      toneMapped: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      material.dispose();
      limb?.dispose();
      corona?.dispose();
      haze?.dispose();
    };
  }, [material, limb, corona, haze]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (animate) {
      material.uniforms.uTime.value += dt;
      if (surface.current) surface.current.rotation.y += dt * 0.04;
    }
  });

  return (
    <group>
      <mesh ref={surface} material={material}>
        <sphereGeometry args={[0.5, 96, 64]} />
      </mesh>
      {limb ? (
        <sprite scale={[2.15, 2.15, 1]}>
          <spriteMaterial
            map={limb}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            opacity={0.95}
          />
        </sprite>
      ) : null}
      {corona ? (
        <sprite scale={[3.4, 3.4, 1]}>
          <spriteMaterial
            map={corona}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            opacity={0.8}
          />
        </sprite>
      ) : null}
      {haze ? (
        <sprite scale={[5.2, 5.2, 1]}>
          <spriteMaterial
            map={haze}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            opacity={0.45}
          />
        </sprite>
      ) : null}
      <pointLight color={COLOR.sunLight} intensity={160} decay={2} distance={0} />
      <pointLight color="#ffb060" intensity={28} decay={2} distance={18} />
    </group>
  );
}

function CameraFit({ rest }: { rest: { current: RestPose } }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const bucket = height < 560 ? "short" : width < 760 ? "phone" : "desk";

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const frame = frameFor(width, height);
    cam.fov = frame.fov;
    cam.position.set(0.4, frame.y, frame.z);
    cam.near = 0.1;
    cam.far = 240;
    cam.updateProjectionMatrix();
    cam.lookAt(0, FOCUS_Y, 0);
    rest.current.position.copy(cam.position);
    rest.current.target.set(0, FOCUS_Y, 0);
    rest.current.distance = cam.position.distanceTo(rest.current.target);
    if (
      controls &&
      typeof controls === "object" &&
      "target" in controls &&
      "update" in controls
    ) {
      const orbit = controls as {
        target: THREE.Vector3;
        update: () => void;
      };
      orbit.target.set(0, FOCUS_Y, 0);
      orbit.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, camera, controls]);

  return null;
}

const world = new THREE.Vector3();
const desired = new THREE.Vector3();
const outward = new THREE.Vector3();

type OrbitLike = {
  enabled: boolean;
  target: THREE.Vector3;
  update: () => void;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

function isOrbit(value: unknown): value is OrbitLike {
  return !!value && typeof value === "object" && "target" in value && "update" in value;
}

function CameraRig({
  animate,
  rest,
  live,
  api,
  nodes,
  overlay,
}: {
  animate: boolean;
  rest: { current: RestPose };
  live: { current: LiveState };
  api: { current: CameraApi | null };
  nodes: { current: Record<string, THREE.Object3D> };
  overlay: OverlayRefs;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const size = useThree((state) => state.size);
  const mode = useRef<"free" | "snap" | "focus" | "return">("free");
  const focusName = useRef<string | null>(null);
  const focusZoom = useRef(1);
  const focusReturning = useRef(false);
  const homeOffset = useRef(new THREE.Vector3(0.4, 13.5, 30));
  const homeTarget = useRef(new THREE.Vector3(0, FOCUS_Y, 0));
  const timer = useRef(0);
  const overlayOpacity = useRef(0);

  useEffect(() => {
    const orbit = isOrbit(controls) ? controls : null;
    const onStart = () => {
      window.clearTimeout(timer.current);
      if (mode.current === "snap") mode.current = "free";
    };
    orbit?.addEventListener("start", onStart);

    api.current = {
      dolly: (deltaY: number) => {
        const rig = isOrbit(controls) ? controls : null;
        if (!rig) return;
        if (mode.current === "focus") {
          focusReturning.current = false;
          const next = focusZoom.current * Math.exp(-deltaY * 0.0013);
          focusZoom.current = THREE.MathUtils.clamp(next, 0.5, 2.6);
          return;
        }
        if (mode.current === "return") return;
        mode.current = "free";
        const offset = camera.position.clone().sub(rig.target);
        const min = Math.max(4.2, rest.current.distance * 0.2);
        const max = rest.current.distance * 1.02;
        const dist = THREE.MathUtils.clamp(
          offset.length() * Math.exp(deltaY * 0.00115),
          min,
          max,
        );
        offset.setLength(dist);
        camera.position.copy(rig.target).add(offset);
      },
      armSnap: () => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          if (mode.current === "focus") focusReturning.current = true;
          else if (mode.current !== "return") mode.current = "snap";
        }, 180);
      },
      focus: (name: string | null) => {
        window.clearTimeout(timer.current);
        const rig = isOrbit(controls) ? controls : null;
        if (!name) {
          if (mode.current === "free") return;
          mode.current = "return";
          if (rig) rig.enabled = false;
          return;
        }
        if (rig) {
          homeOffset.current.copy(camera.position).sub(rig.target);
          homeTarget.current.copy(rig.target);
          rig.enabled = false;
        }
        focusName.current = name;
        focusZoom.current = 1;
        focusReturning.current = false;
        mode.current = "focus";
      },
    };

    return () => {
      window.clearTimeout(timer.current);
      orbit?.removeEventListener("start", onStart);
      api.current = null;
    };
  }, [api, camera, controls, rest]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const rig = isOrbit(controls) ? controls : null;
    const blend = animate ? 1 - Math.exp(-3.2 * dt) : 1;

    if (mode.current === "snap" && rig) {
      const offset = camera.position.clone().sub(rig.target);
      const next = THREE.MathUtils.damp(offset.length(), rest.current.distance, 3.1, dt);
      offset.setLength(animate ? next : rest.current.distance);
      camera.position.copy(rig.target).add(offset);
      if (!animate || Math.abs(next - rest.current.distance) < 0.06) mode.current = "free";
    }

    if (mode.current === "focus") {
      const mesh = focusName.current ? nodes.current[focusName.current] : null;
      const spec = PLANETS.find((planet) => planet.name === focusName.current);
      if (mesh && spec) {
        mesh.getWorldPosition(world);
        if (focusReturning.current) {
          focusZoom.current = THREE.MathUtils.damp(focusZoom.current, 1, 4, dt);
          if (!animate || Math.abs(focusZoom.current - 1) < 0.02) {
            focusZoom.current = 1;
            focusReturning.current = false;
          }
        }
        outward.copy(world).multiplyScalar(-1);
        if (outward.lengthSq() < 1e-4) outward.set(0, 0.2, 1);
        outward.normalize();
        const reach = spec.ring ? spec.ring.outer * 4.4 : spec.radius * 7.8 + 0.45;
        const gap = Math.min(reach, world.length() * 0.42) / focusZoom.current;
        desired.copy(world).addScaledVector(outward, gap);
        desired.y += gap * 0.38;
        camera.position.lerp(desired, blend);
        camera.lookAt(world);
        const projected = world.clone().project(camera);
        const x = (projected.x * 0.5 + 0.5) * size.width;
        const y = (-projected.y * 0.5 + 0.5) * size.height;
        const visible = projected.z < 1;
        const card = overlay.card;
        const wrap = overlay.wrap;
        overlayOpacity.current = THREE.MathUtils.damp(
          overlayOpacity.current,
          visible ? 1 : 0,
          8,
          dt,
        );
        if (overlay.line && overlay.dot && overlay.svg && card && wrap) {
          const wrapBox = wrap.getBoundingClientRect();
          const cardBox = card.getBoundingClientRect();
          const anchorRight = cardBox.right - wrapBox.left;
          const anchorLeft = cardBox.left - wrapBox.left;
          const midY = cardBox.top + cardBox.height / 2 - wrapBox.top;
          const fromRight = Math.abs(x - anchorRight) < Math.abs(x - anchorLeft);
          const x1 = fromRight ? anchorRight : anchorLeft;
          overlay.line.setAttribute("x1", String(x1));
          overlay.line.setAttribute("y1", String(midY));
          overlay.line.setAttribute("x2", String(x));
          overlay.line.setAttribute("y2", String(y));
          overlay.dot.setAttribute("cx", String(x));
          overlay.dot.setAttribute("cy", String(y));
          overlay.svg.style.opacity = String(overlayOpacity.current);
        }
      }
    } else {
      overlayOpacity.current = THREE.MathUtils.damp(overlayOpacity.current, 0, 10, dt);
      if (overlay.svg) overlay.svg.style.opacity = String(overlayOpacity.current);
    }

    if (mode.current === "return") {
      const dir = homeOffset.current.clone();
      if (dir.lengthSq() < 1e-4) dir.copy(rest.current.position).sub(rest.current.target);
      dir.setLength(rest.current.distance);
      desired.copy(homeTarget.current).add(dir);
      camera.position.lerp(desired, blend);
      camera.lookAt(homeTarget.current);
      if (!animate || camera.position.distanceTo(desired) < 0.08) {
        camera.position.copy(desired);
        camera.lookAt(homeTarget.current);
        if (rig) {
          rig.target.copy(homeTarget.current);
          rig.enabled = true;
          rig.update();
        }
        mode.current = "free";
      }
    }

    const rigNow = isOrbit(controls) ? controls : null;
    live.current.distance = rigNow
      ? camera.position.distanceTo(rigNow.target)
      : camera.position.length();
    live.current.rest = rest.current.distance;
    live.current.focused = mode.current === "focus" || mode.current === "return";
  });

  return null;
}

function PostFX({ reduced }: { reduced: boolean }) {
  if (reduced) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={1.15}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.28}
        mipmapBlur
        radius={0.65}
      />
      <Vignette offset={0.22} darkness={0.62} />
    </EffectComposer>
  );
}

function Scene({
  animate,
  reduced,
  focused,
  onSelect,
  nodes,
  rest,
  live,
  api,
  overlay,
}: {
  animate: boolean;
  reduced: boolean;
  focused: string | null;
  onSelect: (name: string) => void;
  nodes: { current: Record<string, THREE.Object3D> };
  rest: { current: RestPose };
  live: { current: LiveState };
  api: { current: CameraApi | null };
  overlay: OverlayRefs;
}) {
  return (
    <>
      <color attach="background" args={[COLOR.bg]} />
      <fog attach="fog" args={["#010101", 48, 118]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[9, 12, 7]} intensity={0.22} color="#f4f4f4" />
      <Starfield animate={animate} />
      <Sun animate={animate} />
      {PLANETS.map((planet) => (
        <Planet
          key={planet.name}
          spec={planet}
          animate={animate}
          selected={focused === planet.name}
          anyFocused={!!focused}
          nodes={nodes}
          onSelect={onSelect}
        />
      ))}
      <OrbitControls
        makeDefault
        target={[0, FOCUS_Y, 0]}
        enablePan={false}
        enableZoom={false}
        autoRotate={animate && !focused}
        autoRotateSpeed={0.28}
        enableDamping
        dampingFactor={0.065}
        rotateSpeed={0.42}
        minPolarAngle={Math.PI / 5.2}
        maxPolarAngle={Math.PI / 1.85}
        touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }}
      />
      <CameraFit rest={rest} />
      <CameraRig
        animate={animate}
        rest={rest}
        live={live}
        api={api}
        nodes={nodes}
        overlay={overlay}
      />
      <PostFX reduced={reduced} />
    </>
  );
}

function FocusCard({
  name,
  open,
  onClose,
  cardRef,
}: {
  name: string;
  open: boolean;
  onClose: () => void;
  cardRef: (node: HTMLElement | null) => void;
}) {
  const fact = FACTS[name];
  if (!fact) return null;

  return (
    <article
      ref={cardRef}
      role="dialog"
      aria-label={name}
      aria-hidden={!open}
      className={`absolute top-28 left-5 z-20 w-[min(18rem,calc(100%-6.5rem))] border border-line bg-bg/90 p-5 backdrop-blur-md sm:top-32 sm:left-14 transition-[opacity,transform] duration-500 ease-out ${
        open ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-3"
      }`}
    >
      <p className="text-xs tracking-widest text-muted uppercase transition-opacity duration-500">
        Planet
      </p>
      <h2 className="mt-2 text-2xl font-medium tracking-wide">{name}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{fact.line}</p>
      <dl className="mt-5 grid grid-cols-2 gap-4">
        {fact.stats.map(([label, value]) => (
          <div key={label} className="transition-opacity duration-500">
            <dt className="text-xs tracking-widest text-muted uppercase">{label}</dt>
            <dd className="mt-1 text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className="mt-6 inline-flex h-11 items-center gap-2 border border-line px-4 text-sm tracking-wide transition-colors duration-200 hover:bg-fg/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg"
      >
        <X className="h-4 w-4" aria-hidden />
        Close
      </button>
    </article>
  );
}

export function SolarSystem({ onReady }: { onReady?: () => void }) {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ name: string; open: boolean } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nodes = useRef<Record<string, THREE.Object3D>>({});
  const api = useRef<CameraApi | null>(null);
  const rest = useRef<RestPose>({
    position: new THREE.Vector3(0.4, 13.5, 30),
    target: new THREE.Vector3(0, FOCUS_Y, 0),
    distance: 33,
  });
  const live = useRef<LiveState>({ distance: 33, rest: 33, focused: false });
  const overlay = useRef<OverlayRefs>({
    svg: null,
    line: null,
    dot: null,
    card: null,
    wrap: null,
  });
  const focusedRef = useRef<string | null>(null);
  focusedRef.current = focused;

  useEffect(() => {
    if (focused) {
      setPanel({ name: focused, open: true });
      return;
    }
    if (!panel) return;
    setPanel((current) => (current ? { ...current, open: false } : null));
    const hide = window.setTimeout(() => setPanel(null), 480);
    return () => window.clearTimeout(hide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const select = (name: string) => {
    const next = focusedRef.current === name ? null : name;
    focusedRef.current = next;
    setFocused(next);
    api.current?.focus(next);
  };

  const close = () => {
    if (!focusedRef.current) return;
    focusedRef.current = null;
    setFocused(null);
    api.current?.focus(null);
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    overlay.current.wrap = el;

    const onWheel = (event: WheelEvent) => {
      const top = el.getBoundingClientRect().top;
      const heroPinned = Math.abs(top) < 12;
      if (!heroPinned && !live.current.focused) return;
      if (event.ctrlKey || live.current.focused) {
        event.preventDefault();
        api.current?.dolly(event.deltaY);
        api.current?.armSnap();
        return;
      }
      const atRest =
        Math.abs(live.current.distance - live.current.rest) <
        Math.max(0.45, live.current.rest * 0.03);
      if (event.deltaY > 0 && atRest) return;
      event.preventDefault();
      api.current?.dolly(event.deltaY);
      api.current?.armSnap();
    };

    let pinch = 0;
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const [a, b] = [event.touches[0], event.touches[1]];
        pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const [a, b] = [event.touches[0], event.touches[1]];
      const next = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      api.current?.dolly((pinch - next) * 2.4);
      api.current?.armSnap();
      pinch = next;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onScroll = () => {
      if (window.scrollY > 48) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 touch-pan-y transition-opacity duration-[1100ms] ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <Canvas
        camera={{ position: [0.4, 16, 30], fov: 40, near: 0.1, far: 240 }}
        dpr={[1, 1.75]}
        frameloop={reduced ? "demand" : "always"}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          setVisible(true);
          onReady?.();
        }}
        onPointerMissed={(event) => {
          if (event.type !== "click") return;
          if (focusedRef.current) close();
        }}
      >
        <Scene
          animate={!reduced}
          reduced={reduced}
          focused={focused}
          onSelect={select}
          nodes={nodes}
          rest={rest}
          live={live}
          api={api}
          overlay={overlay.current}
        />
      </Canvas>

      {panel ? (
        <>
          <svg
            ref={(node) => {
              overlay.current.svg = node;
            }}
            className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ${
              panel.open ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden
          >
            <line
              ref={(node) => {
                overlay.current.line = node;
              }}
              stroke="white"
              strokeWidth="1"
              strokeOpacity="0.85"
            />
            <circle
              ref={(node) => {
                overlay.current.dot = node;
              }}
              r="3.5"
              fill="white"
            />
          </svg>
          <FocusCard
            name={panel.name}
            open={panel.open}
            onClose={close}
            cardRef={(node) => {
              overlay.current.card = node;
            }}
          />
        </>
      ) : null}
    </div>
  );
}
