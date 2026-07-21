'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const smoothstep = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

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
      group.rotation.y = currentScroll * Math.PI * 1.7 + pointer.x * 0.28 + time * (prefersReducedMotion ? 0 : 0.035);
      group.rotation.z = currentScroll * -0.72;
      halos[0].rotation.z = time * (prefersReducedMotion ? 0 : 0.055) + currentScroll * 1.8;
      halos[1].rotation.y = -time * (prefersReducedMotion ? 0 : 0.04) - currentScroll * 1.3;

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
      halos.forEach((halo) => halo.geometry.dispose());
      haloMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme]);

  return <div ref={mountRef} className="scene" aria-hidden="true" />;
}
