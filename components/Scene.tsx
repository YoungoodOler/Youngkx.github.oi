'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Scene({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 5.4);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.IcosahedronGeometry(1.65, 5);
    const isLight = theme === 'light';
    const material = new THREE.MeshPhysicalMaterial({
      color: isLight ? 0xbfc7df : 0x171b31,
      roughness: 0.24,
      metalness: 0.34,
      transmission: 0.08,
      transparent: true,
      opacity: 0.96,
      emissive: isLight ? 0x334a8c : 0x080d20,
      emissiveIntensity: isLight ? 0.28 : 0.8,
      flatShading: true,
    });
    const orb = new THREE.Mesh(geometry, material);
    group.add(orb);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.67, 2)),
      new THREE.LineBasicMaterial({ color: isLight ? 0x3f5dbb : 0x7798ff, transparent: true, opacity: isLight ? 0.24 : 0.16 }),
    );
    group.add(wire);

    const particleCount = window.innerWidth < 700 ? 420 : 900;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const palette = [new THREE.Color('#7c9cff'), new THREE.Color('#a78bfa'), new THREE.Color('#78e8c2')];
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 2.1 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({ size: 0.015, vertexColors: true, transparent: true, opacity: 0.7, sizeAttenuation: true }),
    );
    scene.add(particles);

    const keyLight = new THREE.PointLight(0x8aa6ff, 34, 12);
    keyLight.position.set(3, 2, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xa989ff, 26, 12);
    rimLight.position.set(-3, -1, 2);
    scene.add(rimLight);
    const mintLight = new THREE.PointLight(0x62e6bf, 13, 10);
    mintLight.position.set(1, -3, 3);
    scene.add(mintLight);

    const pointer = { x: 0, y: 0, velocity: 0 };
    let lastPointerX = 0;
    let lastPointerY = 0;
    const onPointerMove = (event: PointerEvent) => {
      const nextX = (event.clientX / window.innerWidth - 0.5) * 0.8;
      const nextY = (event.clientY / window.innerHeight - 0.5) * 0.58;
      pointer.velocity = Math.min(1, Math.hypot(nextX - lastPointerX, nextY - lastPointerY) * 3.5);
      pointer.x = nextX;
      pointer.y = nextY;
      lastPointerX = nextX;
      lastPointerY = nextY;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let frame = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (!prefersReducedMotion) {
        group.rotation.y = THREE.MathUtils.damp(group.rotation.y, pointer.x, 5.8, delta);
        group.rotation.x = THREE.MathUtils.damp(group.rotation.x, -pointer.y, 5.8, delta);
        group.position.x = THREE.MathUtils.damp(group.position.x, pointer.x * 0.14, 4.5, delta);
        keyLight.position.x = THREE.MathUtils.damp(keyLight.position.x, 3 + pointer.x * 2.2, 7, delta);
        keyLight.position.y = THREE.MathUtils.damp(keyLight.position.y, 2 - pointer.y * 2, 7, delta);
        const reactiveScale = 1 + pointer.velocity * 0.025;
        group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, reactiveScale, 8, delta));
        pointer.velocity = THREE.MathUtils.damp(pointer.velocity, 0, 6, delta);
        orb.rotation.z = t * 0.035;
        wire.rotation.y = -t * 0.08;
        particles.rotation.y = t * 0.018;
        particles.rotation.x = Math.sin(t * 0.15) * 0.08;
        group.position.y = Math.sin(t * 0.65) * 0.08;
      }
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      particlesGeometry.dispose();
      (particles.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme]);

  return <div ref={mountRef} className="scene" aria-hidden="true" />;
}
