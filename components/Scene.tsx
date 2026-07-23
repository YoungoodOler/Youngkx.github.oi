'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const smoothstep = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

function createRandom(seed = 137) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export default function Scene({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
    camera.position.set(0, 0, 6.3);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const mobileAtMount = window.innerWidth < 700;
    const isLight = theme === 'light';
    const particleCount = mobileAtMount ? 360 : 920;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particlePhases = new Float32Array(particleCount);
    const particleStrengths = new Float32Array(particleCount);
    const random = createRandom();
    const particlePalette = (theme === 'light'
      ? ['#1f324f', '#465f80', '#68788d', '#776d61']
      : ['#f3f6fb', '#bac9df', '#8399b8', '#ded4c7'])
      .map((color) => new THREE.Color(color));

    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 3;
      const foreground = index > particleCount * 0.72;
      const radius = foreground ? 4.8 : 7.8;
      const angle = random() * Math.PI * 2;
      const radial = radius * Math.sqrt(random());
      particlePositions[offset] = Math.cos(angle) * radial;
      particlePositions[offset + 1] = (random() - 0.5) * (foreground ? 6.6 : 8.8);
      particlePositions[offset + 2] = foreground ? random() * 2.8 - 0.2 : random() * 4.8 - 4.6;

      const color = particlePalette[Math.floor(random() * particlePalette.length)];
      particleColors[offset] = color.r;
      particleColors[offset + 1] = color.g;
      particleColors[offset + 2] = color.b;
      particleSizes[index] = foreground ? 1.8 + random() * 3.2 : 0.8 + random() * 1.9;
      particlePhases[index] = random() * Math.PI * 2;
      particleStrengths[index] = foreground ? 0.56 + random() * 0.42 : 0.22 + random() * 0.45;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(particleSizes, 1));
    particleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(particlePhases, 1));
    particleGeometry.setAttribute('aStrength', new THREE.BufferAttribute(particleStrengths, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uOpacity: { value: theme === 'light' ? 0.58 : 0.82 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.65) },
        uPointer: { value: new THREE.Vector2(20, 20) },
        uPointerPower: { value: 0 },
        uPulseOrigin: { value: new THREE.Vector2(20, 20) },
        uPulseProgress: { value: 2 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        attribute float aStrength;
        uniform float uTime;
        uniform float uScroll;
        uniform float uPixelRatio;
        uniform vec2 uPointer;
        uniform float uPointerPower;
        uniform vec2 uPulseOrigin;
        uniform float uPulseProgress;
        varying vec3 vColor;
        varying float vStrength;
        varying float vInteraction;

        void main() {
          vec3 animated = position;
          animated.x += sin(uTime * 0.11 + aPhase + uScroll * 5.0) * 0.09;
          animated.y += cos(uTime * 0.14 + aPhase * 1.7 + uScroll * 4.0) * 0.075;

          vec2 pointerDelta = animated.xy - uPointer;
          float pointerDistance = max(length(pointerDelta), 0.001);
          vec2 pointerDirection = pointerDelta / pointerDistance;
          vec2 pointerTangent = vec2(-pointerDirection.y, pointerDirection.x);
          float pointerFalloff = 1.0 - smoothstep(0.18, 2.65, pointerDistance);
          float pointerVariation = 0.72 + sin(aPhase * 2.1 + uTime * 0.8) * 0.28;
          animated.xy += (
            pointerDirection * 0.32 +
            pointerTangent * (0.2 + aStrength * 0.1)
          ) * pointerFalloff * pointerVariation * uPointerPower;

          vec2 pulseDelta = animated.xy - uPulseOrigin;
          float pulseDistance = max(length(pulseDelta), 0.001);
          float pulseFront = uPulseProgress * 5.8;
          float pulseWave = exp(-abs(pulseDistance - pulseFront) * 3.4)
            * max(0.0, 1.0 - uPulseProgress);
          animated.xy += (pulseDelta / pulseDistance) * pulseWave * 0.52;

          vec4 viewPosition = modelViewMatrix * vec4(animated, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          vInteraction = clamp(pointerFalloff * uPointerPower + pulseWave, 0.0, 1.0);
          gl_PointSize = clamp(
            aSize * (1.0 + vInteraction * 0.72) * uPixelRatio * (18.0 / max(1.0, -viewPosition.z)),
            1.0,
            10.0
          );
          vColor = aColor;
          vStrength = aStrength * (0.72 + sin(uTime * 0.7 + aPhase) * 0.28);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vStrength;
        varying float vInteraction;

        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float core = smoothstep(0.23, 0.0, distanceToCenter);
          float glow = smoothstep(0.5, 0.05, distanceToCenter) * 0.42;
          float sparkle = 1.0 + vInteraction * 1.25;
          float alpha = (core + glow) * vStrength * uOpacity * sparkle;
          if (alpha < 0.015) discard;
          vec3 interactiveColor = mix(vColor, vec3(1.0), vInteraction * 0.32);
          gl_FragColor = vec4(interactiveColor, min(alpha, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: theme === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const particleField = new THREE.Points(particleGeometry, particleMaterial);
    particleField.frustumCulled = false;
    scene.add(particleField);

    const trailCount = mobileAtMount ? 54 : 108;
    const trailPositions = new Float32Array(trailCount * 3);
    const trailColors = new Float32Array(trailCount * 3);
    const trailSizes = new Float32Array(trailCount);
    const trailLives = new Float32Array(trailCount);
    const trailVelocities = new Float32Array(trailCount * 3);
    const trailAges = new Float32Array(trailCount);
    const trailDurations = new Float32Array(trailCount);
    trailPositions.fill(100);

    const trailGeometry = new THREE.BufferGeometry();
    const trailPositionAttribute = new THREE.BufferAttribute(trailPositions, 3);
    const trailLifeAttribute = new THREE.BufferAttribute(trailLives, 1);
    trailPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    trailLifeAttribute.setUsage(THREE.DynamicDrawUsage);
    trailGeometry.setAttribute('position', trailPositionAttribute);
    trailGeometry.setAttribute('aColor', new THREE.BufferAttribute(trailColors, 3));
    trailGeometry.setAttribute('aSize', new THREE.BufferAttribute(trailSizes, 1));
    trailGeometry.setAttribute('aLife', trailLifeAttribute);

    const trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: isLight ? 0.78 : 0.96 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.65) },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aLife;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vLife;

        void main() {
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = clamp(
            aSize * (0.36 + aLife * 0.9) * uPixelRatio * (19.0 / max(1.0, -viewPosition.z)),
            1.0,
            13.0
          );
          vColor = aColor;
          vLife = aLife;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vLife;

        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float core = smoothstep(0.2, 0.0, distanceToCenter);
          float glow = smoothstep(0.5, 0.05, distanceToCenter) * 0.48;
          float alpha = (core + glow) * pow(vLife, 1.35) * uOpacity;
          if (alpha < 0.012) discard;
          gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.28), min(alpha, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const pointerTrail = new THREE.Points(trailGeometry, trailMaterial);
    pointerTrail.frustumCulled = false;
    scene.add(pointerTrail);

    const geometry = new THREE.IcosahedronGeometry(1.58, 4);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const sphere = new Float32Array(position.array);
    const ribbon = new Float32Array(sphere.length);
    const diamond = new Float32Array(sphere.length);

    for (let index = 0; index < sphere.length; index += 3) {
      const x = sphere[index];
      const y = sphere[index + 1];
      const z = sphere[index + 2];
      const twist = y * 0.72;
      ribbon[index] = (x * Math.cos(twist) - z * Math.sin(twist)) * 1.18;
      ribbon[index + 1] = y * 0.62;
      ribbon[index + 2] = (x * Math.sin(twist) + z * Math.cos(twist)) * 0.82;

      const length = Math.hypot(x, y, z) || 1;
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;
      const octahedronRadius = 1.82 / (Math.abs(nx) + Math.abs(ny) + Math.abs(nz));
      diamond[index] = nx * octahedronRadius * 1.08;
      diamond[index + 1] = ny * octahedronRadius * 1.2;
      diamond[index + 2] = nz * octahedronRadius;
    }

    const colors = [
      new THREE.Color(isLight ? '#687b98' : '#1c2b43'),
      new THREE.Color(isLight ? '#778397' : '#263750'),
      new THREE.Color(isLight ? '#5e7388' : '#192a3d'),
    ];
    const emissives = [
      new THREE.Color(isLight ? '#2d4261' : '#071426'),
      new THREE.Color(isLight ? '#394a61' : '#0c1b30'),
      new THREE.Color(isLight ? '#294258' : '#08131f'),
    ];
    const material = new THREE.MeshPhysicalMaterial({
      color: colors[0],
      roughness: 0.3,
      metalness: 0.42,
      transmission: 0.05,
      transparent: true,
      opacity: isLight ? 0.28 : 0.54,
      emissive: emissives[0],
      emissiveIntensity: isLight ? 0.18 : 0.72,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const subject = new THREE.Mesh(geometry, material);
    group.add(subject);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: isLight ? 0x405a7d : 0xa9bdd9,
      transparent: true,
      opacity: isLight ? 0.12 : 0.17,
      wireframe: true,
    });
    const wire = new THREE.Mesh(geometry, wireMaterial);
    wire.scale.setScalar(1.008);
    group.add(wire);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: isLight ? 0x536b8a : 0x9db4d2,
      transparent: true,
      opacity: isLight ? 0.08 : 0.13,
      side: THREE.DoubleSide,
    });
    const halos = [2.1, 2.42].map((radius, index) => {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 4, 160), haloMaterial);
      halo.rotation.set(Math.PI * (0.32 + index * 0.17), index * 0.6, index * 0.5);
      group.add(halo);
      return halo;
    });

    const keyLight = new THREE.PointLight(0xa9bfe0, isLight ? 18 : 38, 14);
    keyLight.position.set(3, 2, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xd8d1c7, isLight ? 12 : 28, 13);
    rimLight.position.set(-3, -1, 2);
    scene.add(rimLight);
    const fillLight = new THREE.PointLight(0x718cae, isLight ? 8 : 18, 11);
    fillLight.position.set(1, -3, 3);
    scene.add(fillLight);

    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const interactionRingGeometry = new THREE.RingGeometry(0.21, 0.225, 64);
    const hoverRingMaterial = new THREE.MeshBasicMaterial({
      color: isLight ? 0x425d80 : 0xb3c7e2,
      transparent: true,
      opacity: 0,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const pulseRingMaterial = hoverRingMaterial.clone();
    const hoverRing = new THREE.Mesh(interactionRingGeometry, hoverRingMaterial);
    const pulseRing = new THREE.Mesh(interactionRingGeometry, pulseRingMaterial);
    hoverRing.renderOrder = 8;
    pulseRing.renderOrder = 7;
    scene.add(hoverRing, pulseRing);

    const pointer = { x: 0, y: 0 };
    const pointerNdc = new THREE.Vector2(2, 2);
    const targetPointerWorld = new THREE.Vector3(20, 20, 0.18);
    const currentPointerWorld = targetPointerWorld.clone();
    const previousTrailPoint = new THREE.Vector3(100, 100, 0);
    const pulseOrigin = new THREE.Vector3(20, 20, 0.16);
    const particlePointerLocal = new THREE.Vector3();
    const particlePulseLocal = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    let targetScroll = 0;
    let currentScroll = 0;
    let pointerInside = false;
    let pointerPressed = false;
    let currentPointerPower = 0;
    let pulseStarted = -10;
    let trailCursor = 0;
    let lastTrailEmission = 0;

    const updateScroll = () => {
      const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetScroll = window.scrollY / maximum;
    };

    const mapPointer = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      const normalizedX = (event.clientX - rect.left) / Math.max(1, rect.width);
      const normalizedY = (event.clientY - rect.top) / Math.max(1, rect.height);
      pointerInside = normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1;
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 0.7;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 0.5;
      if (!pointerInside) return false;

      pointerNdc.set(normalizedX * 2 - 1, -(normalizedY * 2 - 1));
      raycaster.setFromCamera(pointerNdc, camera);
      if (!raycaster.ray.intersectPlane(interactionPlane, targetPointerWorld)) return false;
      targetPointerWorld.z = 0.18;
      return true;
    };

    const spawnTrail = (origin: THREE.Vector3, amount: number, burst = false) => {
      for (let index = 0; index < amount; index += 1) {
        const trailIndex = trailCursor;
        const offset = trailIndex * 3;
        const angle = random() * Math.PI * 2;
        const speed = burst ? 0.75 + random() * 1.65 : 0.16 + random() * 0.38;
        const jitter = burst ? random() * 0.08 : random() * 0.045;
        const color = particlePalette[(trailIndex + index) % particlePalette.length];

        trailPositions[offset] = origin.x + Math.cos(angle) * jitter;
        trailPositions[offset + 1] = origin.y + Math.sin(angle) * jitter;
        trailPositions[offset + 2] = 0.18 + (random() - 0.5) * 0.12;
        trailVelocities[offset] = Math.cos(angle) * speed;
        trailVelocities[offset + 1] = Math.sin(angle) * speed + (burst ? 0.06 : 0.02);
        trailVelocities[offset + 2] = (random() - 0.5) * 0.12;
        trailColors[offset] = color.r;
        trailColors[offset + 1] = color.g;
        trailColors[offset + 2] = color.b;
        trailSizes[trailIndex] = burst ? 2.5 + random() * 4.8 : 1.7 + random() * 3.2;
        trailAges[trailIndex] = 0;
        trailDurations[trailIndex] = burst ? 0.7 + random() * 0.8 : 0.42 + random() * 0.58;
        trailLives[trailIndex] = 1;
        trailCursor = (trailCursor + 1) % trailCount;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!mapPointer(event) || prefersReducedMotion) return;
      const now = performance.now();
      if (
        now - lastTrailEmission > 24 &&
        targetPointerWorld.distanceToSquared(previousTrailPoint) > 0.0012
      ) {
        spawnTrail(targetPointerWorld, event.pointerType === 'touch' ? 1 : 2);
        previousTrailPoint.copy(targetPointerWorld);
        lastTrailEmission = now;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!mapPointer(event) || prefersReducedMotion) return;
      pointerPressed = true;
      pulseStarted = performance.now() * 0.001;
      pulseOrigin.copy(targetPointerWorld);
      pulseRing.position.copy(pulseOrigin);
      spawnTrail(targetPointerWorld, mobileAtMount ? 16 : 28, true);
    };

    const onPointerUp = () => {
      pointerPressed = false;
    };

    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) {
        pointerInside = false;
        pointerPressed = false;
      }
    };

    const onWindowBlur = () => {
      pointerInside = false;
      pointerPressed = false;
    };

    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    window.addEventListener('pointerout', onPointerOut, { passive: true });
    window.addEventListener('blur', onWindowBlur);
    updateScroll();

    const mixedColor = new THREE.Color();
    const mixedEmissive = new THREE.Color();
    const clock = new THREE.Clock();
    let frame = 0;
    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const motionTime = prefersReducedMotion ? 0 : time;
      currentScroll = prefersReducedMotion ? targetScroll : THREE.MathUtils.damp(currentScroll, targetScroll, 4.6, delta);
      const targetPointerPower = pointerInside && !prefersReducedMotion ? (pointerPressed ? 1.48 : 1) : 0;
      currentPointerPower = THREE.MathUtils.damp(currentPointerPower, targetPointerPower, 8.5, delta);
      currentPointerWorld.lerp(targetPointerWorld, 1 - Math.exp(-12 * delta));
      const pulseProgress = THREE.MathUtils.clamp(
        (performance.now() * 0.001 - pulseStarted) / 1.15,
        0,
        1.4,
      );

      const articleMix = smoothstep((currentScroll - 0.055) / 0.3);
      const categoryMix = smoothstep((currentScroll - 0.61) / 0.24);
      for (let index = 0; index < sphere.length; index += 1) {
        const articleShape = THREE.MathUtils.lerp(sphere[index], ribbon[index], articleMix);
        position.array[index] = THREE.MathUtils.lerp(articleShape, diamond[index], categoryMix);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();

      const mobile = window.innerWidth < 700;
      const heroX = mobile ? 0.7 : 1.55;
      const articleX = mobile ? -0.68 : -1.72;
      const categoryX = mobile ? 0.76 : 1.72;
      const firstX = THREE.MathUtils.lerp(heroX, articleX, articleMix);
      group.position.x = THREE.MathUtils.lerp(firstX, categoryX, categoryMix) + pointer.x * 0.1;
      group.position.y = THREE.MathUtils.lerp(-0.05, 0.28, articleMix) - categoryMix * 0.46 - pointer.y * 0.1;
      const desiredScale = THREE.MathUtils.lerp(1, mobile ? 0.54 : 0.64, articleMix) + categoryMix * 0.1;
      group.scale.setScalar(desiredScale);

      group.rotation.x = currentScroll * Math.PI * 1.08 - pointer.y * 0.24;
      group.rotation.y = currentScroll * Math.PI * 1.7 + pointer.x * 0.28 + motionTime * 0.035;
      group.rotation.z = currentScroll * -0.72;
      halos[0].rotation.z = motionTime * 0.055 + currentScroll * 1.8;
      halos[1].rotation.y = -motionTime * 0.04 - currentScroll * 1.3;

      particleMaterial.uniforms.uTime.value = motionTime;
      particleMaterial.uniforms.uScroll.value = currentScroll;
      particleMaterial.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        isLight ? 0.58 : 0.82,
        isLight ? 0.32 : 0.46,
        articleMix * (1 - categoryMix * 0.45),
      );
      particleField.rotation.z = currentScroll * 0.14 + motionTime * 0.003;
      particleField.rotation.y = currentScroll * -0.22 + motionTime * 0.005;
      particleField.position.x = pointer.x * -0.15;
      particleField.position.y = pointer.y * 0.12 - currentScroll * 0.08;
      particleField.updateMatrixWorld();
      particlePointerLocal.copy(currentPointerWorld);
      particleField.worldToLocal(particlePointerLocal);
      particlePulseLocal.copy(pulseOrigin);
      particleField.worldToLocal(particlePulseLocal);
      particleMaterial.uniforms.uPointer.value.set(particlePointerLocal.x, particlePointerLocal.y);
      particleMaterial.uniforms.uPointerPower.value = currentPointerPower;
      particleMaterial.uniforms.uPulseOrigin.value.set(particlePulseLocal.x, particlePulseLocal.y);
      particleMaterial.uniforms.uPulseProgress.value = pulseProgress;

      hoverRing.position.copy(currentPointerWorld);
      hoverRing.position.z = 0.16;
      hoverRing.scale.setScalar(0.82 + currentPointerPower * 0.34);
      hoverRingMaterial.opacity = currentPointerPower * (isLight ? 0.26 : 0.4);
      pulseRing.scale.setScalar(1 + Math.min(pulseProgress, 1) * 22);
      pulseRingMaterial.opacity = Math.max(0, 1 - pulseProgress) * (isLight ? 0.3 : 0.52);

      let trailActive = false;
      const trailDrag = Math.exp(-2.35 * delta);
      for (let index = 0; index < trailCount; index += 1) {
        if (trailLives[index] <= 0) continue;
        trailActive = true;
        const offset = index * 3;
        trailAges[index] += delta;
        const life = 1 - trailAges[index] / trailDurations[index];
        trailLives[index] = Math.max(0, life);
        if (life <= 0) {
          trailPositions[offset] = 100;
          trailPositions[offset + 1] = 100;
          trailPositions[offset + 2] = 100;
          continue;
        }
        trailPositions[offset] += trailVelocities[offset] * delta;
        trailPositions[offset + 1] += trailVelocities[offset + 1] * delta;
        trailPositions[offset + 2] += trailVelocities[offset + 2] * delta;
        trailVelocities[offset] *= trailDrag;
        trailVelocities[offset + 1] = trailVelocities[offset + 1] * trailDrag + delta * 0.025;
        trailVelocities[offset + 2] *= trailDrag;
      }
      if (trailActive) {
        trailPositionAttribute.needsUpdate = true;
        trailLifeAttribute.needsUpdate = true;
        (trailGeometry.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
        (trailGeometry.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
      }

      if (categoryMix > 0) {
        mixedColor.copy(colors[1]).lerp(colors[2], categoryMix);
        mixedEmissive.copy(emissives[1]).lerp(emissives[2], categoryMix);
      } else {
        mixedColor.copy(colors[0]).lerp(colors[1], articleMix);
        mixedEmissive.copy(emissives[0]).lerp(emissives[1], articleMix);
      }
      material.color.copy(mixedColor);
      material.emissive.copy(mixedEmissive);
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('blur', onWindowBlur);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      wireMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      trailGeometry.dispose();
      trailMaterial.dispose();
      interactionRingGeometry.dispose();
      hoverRingMaterial.dispose();
      pulseRingMaterial.dispose();
      halos.forEach((halo) => halo.geometry.dispose());
      haloMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme]);

  return <div ref={mountRef} className="scene" aria-hidden="true" />;
}
