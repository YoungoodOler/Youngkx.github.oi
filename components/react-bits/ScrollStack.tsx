import {
  Children,
  isValidElement,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import './ScrollStack.css';

const stackMedia = '(prefers-reduced-motion: no-preference) and (min-height: 34rem)';

export default function ScrollStack({
  heading,
  children,
}: {
  heading: ReactNode;
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || items.length < 2) return;

    const title = section.querySelector<HTMLElement>('.scroll-stack-section__heading');
    const list = section.querySelector<HTMLElement>('.scroll-stack');
    if (!title || !list) return;
    const slots = Array.from(list.querySelectorAll<HTMLElement>(':scope > .scroll-stack__slot'));
    const media = window.matchMedia(stackMedia);
    let frame = 0;

    const update = () => {
      frame = 0;
      if (!media.matches) return;

      const rects = slots.map((slot) => slot.getBoundingClientRect());
      const style = getComputedStyle(list);
      const step = parseFloat(style.getPropertyValue('--stack-step'));
      const gap = parseFloat(style.rowGap);
      const depths = slots.map(() => 0);

      for (let index = 1; index < rects.length; index += 1) {
        const previous = rects[index - 1];
        const distance = rects[index].top - previous.top;
        const start = previous.height + gap + (slots.length - index) * step;
        const cover = Math.min(1, Math.max(0, (start - distance) / Math.max(1, start - step)));
        for (let behind = 0; behind < index; behind += 1) depths[behind] += cover;
      }

      slots.forEach((slot, index) => {
        const depth = depths[index];
        slot.style.setProperty('--stack-scale', Math.max(0.8, 1 - 0.05 * depth).toFixed(4));
        slot.style.setProperty('--stack-dim', (1 - Math.pow(0.8, depth)).toFixed(4));
      });
    };

    const schedule = () => {
      if (media.matches && !frame) frame = window.requestAnimationFrame(update);
    };

    const resize = () => {
      if (!media.matches) return;
      const heights = slots.map((slot) => slot.offsetHeight);
      const tallest = Math.max(...heights);
      section.style.setProperty('--stack-height', `${tallest}px`);
      section.style.setProperty('--stack-heading-height', `${title.offsetHeight}px`);
      slots.forEach((slot, index) => {
        slot.style.setProperty('--stack-tail', `${tallest - heights[index]}px`);
        if (index > 0) {
          slot.style.setProperty('--stack-preceding-tail', `${tallest - heights[index - 1]}px`);
        }
      });
      schedule();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(title);
    slots.forEach((slot) => resizeObserver.observe(slot));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    media.addEventListener('change', resize);
    resize();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      media.removeEventListener('change', resize);
    };
  }, [items.length]);

  return (
    <div
      className={
        items.length > 1
          ? 'scroll-stack-section scroll-stack-section--active'
          : 'scroll-stack-section'
      }
      ref={sectionRef}
      style={{ '--stack-count': items.length } as CSSProperties}
    >
      <div className="scroll-stack-section__heading">{heading}</div>
      <div className="scroll-stack">
        {items.map((item, index) => (
          <div
            className="scroll-stack__slot"
            key={isValidElement(item) ? item.key : index}
            style={
              {
                '--stack-index': index,
                '--stack-remaining': items.length - index - 1,
              } as CSSProperties
            }
          >
            <div className="scroll-stack__card">{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
