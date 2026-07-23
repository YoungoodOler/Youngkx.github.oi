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
    const particleCount = mobileAtMount ? 210 : 520;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particlePhases = new Float32Array(particleCount);
    const particleStrengths = new Float32Array(particleCount);
    const random = createRandom();
    const particlePalette = (theme === 'light'
      ? ['#4967af', '#72539d', '#2e7c69', '#8a6c45']
      : ['#91aaff', '#bd91ff', '#67e0c1', '#ffd49a'])
      .map((color) => new THREE.Color(color));

    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 3;
      const foreground = index > particleCount * 0.78;
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
      particleSizes[index] = foreground ? 1.6 + random() * 2.8 : 0.7 + random() * 1.65;
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
        uOpacity: { value: theme === 'light' ? 0.48 : 0.72 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.65) },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        attribute float aStrength;
        uniform float uTime;
        uniform float uScroll;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vStrength;

        void main() {
          vec3 animated = position;
          animated.x += sin(uTime * 0.11 + aPhase + uScroll * 5.0) * 0.09;
          animated.y += cos(uTime * 0.14 + aPhase * 1.7 + uScroll * 4.0) * 0.075;
          vec4 viewPosition = modelViewMatrix * vec4(animated, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = clamp(aSize * uPixelRatio * (18.0 / max(1.0, -viewPosition.z)), 1.0, 8.0);
          vColor = aColor;
          vStrength = aStrength * (0.72 + sin(uTime * 0.7 + aPhase) * 0.28);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vStrength;

        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float core = smoothstep(0.23, 0.0, distanceToCenter);
          float glow = smoothstep(0.5, 0.05, distanceToCenter) * 0.42;
          float alpha = (core + glow) * vStrength * uOpacity;
          if (alpha < 0.015) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: theme === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const particleField = new THREE.Points(particleGeometry, particleMaterial);
    particleField.frustumCulled = false;
    scene.add(particleField);

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

    const isLight = theme === 'light';
    const colors = [
      new THREE.Color(isLight ? '#687fbe' : '#27345f'),
      new THREE.Color(isLight ? '#7f6aa8' : '#3b2859'),
      new THREE.Color(isLight ? '#4d927d' : '#17473e'),
    ];
    const emissives = [
      new THREE.Color(isLight ? '#263e80' : '#0b183d'),
      new THREE.Color(isLight ? '#553a82' : '#241039'),
      new THREE.Color(isLight ? '#276a58' : '#072e27'),
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
      color: isLight ? 0x415caa : 0x89a5ff,
      transparent: true,
      opacity: isLight ? 0.12 : 0.17,
      wireframe: true,
    });
    const wire = new THREE.Mesh(geometry, wireMaterial);
    wire.scale.setScalar(1.008);
    group.add(wire);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: isLight ? 0x536fc4 : 0x819fff,
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

    const keyLight = new THREE.PointLight(0x8aa6ff, isLight ? 18 : 38, 14);
    keyLight.position.set(3, 2, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xa989ff, isLight ? 12 : 28, 13);
    rimLight.position.set(-3, -1, 2);
    scene.add(rimLight);
    const mintLight = new THREE.PointLight(0x62e6bf, isLight ? 8 : 18, 11);
    mintLight.position.set(1, -3, 3);
    scene.add(mintLight);

    const pointer = { x: 0, y: 0 };
    let targetScroll = 0;
    let currentScroll = 0;
    const updateScroll = () => {
      const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetScroll = window.scrollY / maximum;
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 0.7;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 0.5;
    };
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    updateScroll();

    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      updateScroll();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const mixedColor = new THREE.Color();
    const mixedEmissive = new THREE.Color();
    const clock = new THREE.Clock();
    let frame = 0;
    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const motionTime = prefersReducedMotion ? 0 : time;
      currentScroll = prefersReducedMotion ? targetScroll : THREE.MathUtils.damp(currentScroll, targetScroll, 4.6, delta);

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
        isLight ? 0.48 : 0.72,
        isLight ? 0.24 : 0.38,
        articleMix * (1 - categoryMix * 0.45),
      );
      particleField.rotation.z = currentScroll * 0.14 + motionTime * 0.003;
      particleField.rotation.y = currentScroll * -0.22 + motionTime * 0.005;
      particleField.position.x = pointer.x * -0.15;
      particleField.position.y = pointer.y * 0.12 - currentScroll * 0.08;

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
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      wireMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      halos.forEach((halo) => halo.geometry.dispose());
      haloMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme]);

  return <div ref={mountRef} className="scene" aria-hidden="true" />;
}
