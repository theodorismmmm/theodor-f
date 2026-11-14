import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { X } from "lucide-react";
import * as THREE from "three";
import { TOUCH } from "three";

const COLOR = {
  bg: "#000000",
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
  // Vertical fov is what the camera stores. On a tall phone that makes the
  // horizontal view very narrow, so step back until the outer orbit fits.
  if (aspect < 0.85) return { y: 48, z: 42, fov: 48 };
  if (height < 560) return { y: 15, z: 32, fov: 36 };
  return { y: 13.5, z: 30, fov: 33 };
}

function OrbitLine({ radius }: { radius: number }) {
  const line = useMemo(() => {
    const segments = 288;
    const positions = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: COLOR.orbit,
      transparent: true,
      opacity: 0.55,
    });
    const orbit = new THREE.Line(geometry, material);
    orbit.raycast = () => undefined;
    return orbit;
  }, [radius]);

  useEffect(() => {
    return () => {
      line.geometry.dispose();
      const material = line.material;
      if (!Array.isArray(material)) material.dispose();
    };
  }, [line]);

  return <primitive object={line} />;
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function makePlanetTexture(name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width: w, height: h } = canvas;

  if (name === "Earth") {
    ctx.fillStyle = "#1a4f86";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = i % 3 === 0 ? "#6d8f45" : "#2f6b3a";
      ctx.beginPath();
      ctx.ellipse(
        hash(i + 1) * w,
        h * 0.2 + hash(i + 8) * h * 0.58,
        14 + hash(i + 3) * 30,
        8 + hash(i + 5) * 14,
        hash(i + 2) * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    const ice = ctx.createLinearGradient(0, 0, 0, h);
    ice.addColorStop(0, "rgba(255,255,255,0.92)");
    ice.addColorStop(0.14, "rgba(255,255,255,0)");
    ice.addColorStop(0.86, "rgba(255,255,255,0)");
    ice.addColorStop(1, "rgba(255,255,255,0.92)");
    ctx.fillStyle = ice;
    ctx.fillRect(0, 0, w, h);
  } else if (name === "Jupiter" || name === "Saturn") {
    const bands =
      name === "Jupiter"
        ? ["#c9a36a", "#efe0c2", "#a87448", "#e7d3aa", "#8d5a38", "#f3e6c8", "#b88958"]
        : ["#f0e2c4", "#d7c094", "#efe6d0", "#c6a56e", "#f7edd8", "#b99668"];
    const bandH = h / bands.length;
    bands.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * bandH, w, bandH + 1);
    });
    if (name === "Jupiter") {
      ctx.fillStyle = "#c4553a";
      ctx.beginPath();
      ctx.ellipse(w * 0.62, h * 0.58, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (name === "Mars") {
    ctx.fillStyle = "#b55232";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#8a3a24";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.ellipse(hash(i) * w, hash(i + 4) * h, 20 + hash(i + 2) * 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(245,236,230,0.85)";
    ctx.fillRect(0, 0, w, 8);
    ctx.fillRect(0, h - 8, w, 8);
  } else if (name === "Venus") {
    const wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, "#f3e2b8");
    wash.addColorStop(1, "#c9a56a");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,248,230,0.45)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, hash(i) * h);
      ctx.bezierCurveTo(w * 0.3, hash(i + 2) * h, w * 0.6, hash(i + 4) * h, w, hash(i + 6) * h);
      ctx.stroke();
    }
  } else if (name === "Uranus" || name === "Neptune") {
    ctx.fillStyle = name === "Uranus" ? "#b7e4df" : "#2f62b8";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = name === "Uranus" ? "rgba(255,255,255,0.28)" : "rgba(140,190,255,0.35)";
    ctx.fillRect(0, h * 0.42, w, 6);
    if (name === "Neptune") {
      ctx.fillStyle = "#d7ecff";
      ctx.beginPath();
      ctx.ellipse(w * 0.3, h * 0.38, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = name === "Moon" ? "#c8c4bc" : "#b7b1a8";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(70,66,60,0.45)";
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.arc(hash(i) * w, hash(i + 3) * h, 2 + hash(i + 6) * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeRingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const bands = [
    { radius: 60, width: 10, color: "rgba(243,230,204,0.95)" },
    { radius: 48, width: 4, color: "rgba(243,230,204,0.12)" },
    { radius: 40, width: 8, color: "rgba(214,186,140,0.9)" },
    { radius: 30, width: 5, color: "rgba(255,246,228,0.75)" },
  ];
  for (const band of bands) {
    ctx.beginPath();
    ctx.arc(64, 64, band.radius, 0, Math.PI * 2);
    ctx.strokeStyle = band.color;
    ctx.lineWidth = band.width;
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Moon({ moon, animate }: { moon: MoonSpec; animate: boolean }) {
  const pivot = useRef<THREE.Group>(null);
  const angle = useRef(moon.phase);
  const texture = useMemo(() => makePlanetTexture("Moon"), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (animate) angle.current += moon.speed * dt;
    if (pivot.current) pivot.current.rotation.y = angle.current;
  });

  return (
    <group ref={pivot} rotation={[0, moon.phase, 0]}>
      <mesh position={[moon.distance, 0, 0]}>
        <sphereGeometry args={[moon.radius, 24, 16]} />
        <meshStandardMaterial map={texture} color="white" roughness={0.94} metalness={0} />
      </mesh>
    </group>
  );
}

function Planet({
  spec,
  animate,
  selected,
  nodes,
  onSelect,
}: {
  spec: PlanetSpec;
  animate: boolean;
  selected: boolean;
  nodes: { current: Record<string, THREE.Object3D> };
  onSelect: (name: string) => void;
}) {
  const pivot = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const angle = useRef(spec.phase);
  const [hot, setHot] = useState(false);
  const texture = useMemo(() => makePlanetTexture(spec.name), [spec.name]);
  const ringTexture = useMemo(() => (spec.ring ? makeRingTexture() : null), [spec.ring]);

  useLayoutEffect(() => {
    if (body.current) nodes.current[spec.name] = body.current;
  }, [nodes, spec.name]);

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

  return (
    <group rotation={[spec.inclination, 0, 0]}>
      <OrbitLine radius={spec.distance} />
      <group ref={pivot} rotation={[0, spec.phase, 0]}>
        <group position={[spec.distance, 0, 0]}>
          <group ref={spin} rotation={[0, 0, spec.axial]}>
            <mesh ref={body}>
              <sphereGeometry args={[spec.radius, 32, 24]} />
              <meshStandardMaterial
                map={texture}
                color="white"
                emissive={spec.color}
                emissiveIntensity={selected || hot ? 0.22 : 0}
                roughness={spec.name === "Jupiter" || spec.name === "Saturn" ? 0.55 : 0.86}
                metalness={0.02}
              />
            </mesh>
            {spec.name === "Earth" ? (
              <mesh>
                <sphereGeometry args={[spec.radius * 1.08, 24, 16]} />
                <meshBasicMaterial
                  color={COLOR.earth}
                  transparent
                  opacity={0.16}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            ) : null}
            <mesh onClick={choose} onPointerOver={over} onPointerOut={out}>
              <sphereGeometry args={[Math.max(spec.radius * 2.4, 1.15), 16, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {spec.ring ? (
              <mesh
                rotation={[Math.PI / 2.15, 0, 0]}
                onClick={choose}
                onPointerOver={over}
                onPointerOut={out}
              >
                <ringGeometry args={[spec.ring.inner, spec.ring.outer, 96]} />
                <meshBasicMaterial
                  map={ringTexture}
                  color="white"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.92}
                />
              </mesh>
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

function makeSunTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width: w, height: h } = canvas;

  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#ffd27a");
  base.addColorStop(0.5, "#ffe7a8");
  base.addColorStop(1, "#ffc56a");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 1600; i++) {
    const hot = hash(i * 1.3) > 0.46;
    ctx.fillStyle = hot
      ? `rgba(255, 250, 230, ${0.16 + hash(i + 2) * 0.38})`
      : `rgba(196, 78, 12, ${0.1 + hash(i + 5) * 0.28})`;
    ctx.beginPath();
    ctx.arc(
      hash(i + 11) * w,
      hash(i + 17) * h,
      0.8 + hash(i + 23) * 2.8,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const spots = [
    [0.28, 0.46, 9],
    [0.31, 0.5, 5],
    [0.62, 0.38, 7],
    [0.66, 0.42, 4],
    [0.48, 0.62, 5],
  ] as const;
  for (const [u, v, radius] of spots) {
    const x = u * w;
    const y = v * h;
    ctx.fillStyle = "rgba(232, 120, 28, 0.55)";
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 2.1, radius * 1.35, hash(x) * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(92, 28, 8, 0.82)";
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.72, hash(y) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
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
  glow.addColorStop(0.08, "rgba(255, 214, 120, 0.9)");
  glow.addColorStop(0.28, "rgba(255, 140, 36, 0.28)");
  glow.addColorStop(0.62, "rgba(255, 90, 12, 0.06)");
  glow.addColorStop(1, "rgba(255, 60, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Sun({ animate }: { animate: boolean }) {
  const surface = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => makeSunTexture(), []);
  const limb = useMemo(() => makeGlowTexture(0.42), []);
  const corona = useMemo(() => makeGlowTexture(0.3), []);
  const material = useMemo(() => {
    if (!texture) return null;
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      toneMapped: false,
    });
    mat.customProgramCacheKey = () => "sun-photosphere";
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "varying vec3 vSunNormal;\n#include <common>",
        )
        .replace(
          "#include <project_vertex>",
          "vSunNormal = normalize(mat3(modelViewMatrix) * normal);\n#include <project_vertex>",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "varying vec3 vSunNormal;\n#include <common>")
        .replace(
          "#include <opaque_fragment>",
          `
          float mu = clamp(normalize(vSunNormal).z, 0.0, 1.0);
          float limb = pow(mu, 0.45);
          vec3 edge = vec3(0.62, 0.12, 0.015);
          outgoingLight = mix(edge, outgoingLight, smoothstep(0.0, 0.8, limb));
          outgoingLight *= 0.78 + 0.4 * limb;
          #include <opaque_fragment>
          `,
        );
    };
    return mat;
  }, [texture]);

  useEffect(() => {
    return () => {
      texture?.dispose();
      limb?.dispose();
      corona?.dispose();
      material?.dispose();
    };
  }, [texture, limb, corona, material]);

  useFrame((_, delta) => {
    if (surface.current && animate) surface.current.rotation.y += Math.min(delta, 0.05) * 0.035;
  });

  return (
    <group>
      <mesh ref={surface} material={material ?? undefined}>
        <sphereGeometry args={[0.5, 64, 48]} />
        {material ? null : <meshBasicMaterial color={COLOR.sun} toneMapped={false} />}
      </mesh>
      {limb ? (
        <sprite scale={[2.05, 2.05, 1]}>
          <spriteMaterial
            map={limb}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ) : null}
      {corona ? (
        <sprite scale={[3.1, 3.1, 1]}>
          <spriteMaterial
            map={corona}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            opacity={0.85}
          />
        </sprite>
      ) : null}
      <pointLight color={COLOR.sunLight} intensity={140} decay={2} distance={0} />
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
    // Only refit when the layout bucket changes, so a mobile toolbar resize
    // does not snap the orrery back while it is turning.
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
    const blend = animate ? 1 - Math.exp(-3.4 * dt) : 1;

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
          overlay.svg.style.opacity = visible ? "1" : "0";
        }
      }
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

function Scene({
  animate,
  focused,
  onSelect,
  nodes,
  rest,
  live,
  api,
  overlay,
}: {
  animate: boolean;
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
      <ambientLight intensity={0.28} />
      <directionalLight position={[9, 12, 7]} intensity={0.85} color="#f4f4f4" />
      <Sun animate={animate} />
      {PLANETS.map((planet) => (
        <Planet
          key={planet.name}
          spec={planet}
          animate={animate}
          selected={focused === planet.name}
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
        autoRotateSpeed={0.32}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
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
    </>
  );
}

export function SolarSystem({ onReady }: { onReady?: () => void }) {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
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
      const atRest = Math.abs(live.current.distance - live.current.rest) < Math.max(0.45, live.current.rest * 0.03);
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

  const fact = focused ? FACTS[focused] : null;

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 touch-pan-y transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <Canvas
        camera={{ position: [0.4, 16, 30], fov: 40, near: 0.1, far: 240 }}
        dpr={[1, 1.75]}
        frameloop={reduced ? "demand" : "always"}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onCreated={() => {
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
          focused={focused}
          onSelect={select}
          nodes={nodes}
          rest={rest}
          live={live}
          api={api}
          overlay={overlay.current}
        />
      </Canvas>

      {focused && fact ? (
        <>
          <svg
            ref={(node) => {
              overlay.current.svg = node;
            }}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
            aria-hidden
          >
            <line
              ref={(node) => {
                overlay.current.line = node;
              }}
              stroke="white"
              strokeWidth="1"
            />
            <circle
              ref={(node) => {
                overlay.current.dot = node;
              }}
              r="3.5"
              fill="white"
            />
          </svg>
          <article
            ref={(node) => {
              overlay.current.card = node;
            }}
            role="dialog"
            aria-label={focused}
            className="absolute top-28 left-5 z-20 w-[min(18rem,calc(100%-6.5rem))] border border-line bg-bg p-5 sm:top-32 sm:left-14"
          >
            <p className="text-xs tracking-widest text-muted uppercase">Planet</p>
            <h2 className="mt-2 text-2xl font-medium tracking-wide">{focused}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{fact.line}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              {fact.stats.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs tracking-widest text-muted uppercase">{label}</dt>
                  <dd className="mt-1 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={close}
              className="mt-6 inline-flex h-11 items-center gap-2 border border-line px-4 text-sm tracking-wide transition-colors duration-200 hover:bg-fg/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg"
            >
              <X className="h-4 w-4" aria-hidden />
              Close
            </button>
          </article>
        </>
      ) : null}
    </div>
  );
}
