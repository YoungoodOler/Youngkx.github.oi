'use client';

import Image from 'next/image';
import { type ComponentType, useCallback, useEffect, useRef, useState } from 'react';
import type { LanyardProps } from './react-bits/lanyard/Lanyard';
import styles from './ArchivePass.module.css';

const frontImage = '/archive-pass/front.svg';
const backImage = '/archive-pass/back.svg';
const strapImage = '/archive-pass/strap.svg';
const visibleThreshold = 0.12;

export default function ArchivePass({
  compactLayout,
  heroReady,
}: {
  compactLayout: boolean;
  heroReady: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [Model, setModel] = useState<ComponentType<LanyardProps> | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [settled, setSettled] = useState(false);
  const onModelLoad = useCallback(() => setModelLoaded(true), []);

  useEffect(() => {
    if (!heroReady) return;
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (!disposed) setPageReady(true);
    });
    return () => {
      disposed = true;
    };
  }, [heroReady]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (typeof IntersectionObserver === 'undefined') {
      setModelLoaded(true);
      return;
    }

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    let disposed = false;

    const syncModel = () => {
      if (preference.matches) {
        setSettled(true);
        setModel(null);
        setModelLoaded(true);
      } else if (inView) {
        import('./react-bits/lanyard/Lanyard')
          .then(({ default: Lanyard }) => {
            if (!disposed && inView && !preference.matches) setModel(() => Lanyard);
          })
          .catch(() => {
            if (!disposed) setModelLoaded(true);
          });
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.intersectionRatio >= visibleThreshold;
        syncModel();
      },
      { threshold: visibleThreshold },
    );
    observer.observe(stage);
    syncModel();
    preference.addEventListener('change', syncModel);
    return () => {
      disposed = true;
      observer.disconnect();
      preference.removeEventListener('change', syncModel);
    };
  }, []);

  return (
    <div
      className={styles.stage}
      ref={stageRef}
      data-enter={pageReady && modelLoaded ? '' : undefined}
      data-settled={settled ? '' : undefined}
      onAnimationEnd={(event) => {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          (target.classList.contains('lanyard-content') ||
            target.classList.contains(styles.printed))
        ) {
          setSettled(true);
        }
      }}
      role="group"
      aria-label="Young 的数字身份卡。英文名 Kian。CS Student / Developer。Computer Science & Technology。AI / Computer Vision / Algorithms。"
    >
      <div className={styles.still} aria-hidden="true">
        <div className={styles.printed}>
          <Image src={frontImage} width={640} height={900} loading="eager" alt="" />
        </div>
      </div>
      {Model && (
        <Model
          className={styles.model}
          frontImage={frontImage}
          backImage={backImage}
          strapImage={strapImage}
          cardColor="#000000"
          finish={compactLayout ? 'matte' : 'metallic'}
          offsetFaces={compactLayout}
          metal="silver"
          anchor="right"
          strapColor="#111521"
          strapLength={0.55}
          strapWidth={0.55}
          cornerRadius={0.14}
          size={0.6}
          damping={0.66}
          breeze={0}
          intro={false}
          inert={!settled}
          onLoad={onModelLoad}
        />
      )}
    </div>
  );
}
