"use client";

import { useEffect, useRef } from "react";

const SLIDE_IMAGES = [
  "/images/gates/science-buet.webp",
  "/images/gates/arts-jahangirnagar.webp",
  "/images/gates/collage-hero.webp",
];

export function HeroImageSlider() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const viewport = root.querySelector<HTMLElement>(".hero-slider");
    const track = root.querySelector<HTMLElement>(".hero-slider-track");
    const dotsContainer = root.querySelector<HTMLElement>(".hero-slider-dots");
    if (!track || !viewport) return;

    const slides = Array.from(track.querySelectorAll<HTMLElement>(".hero-slide"));
    const totalSlides = slides.length;
    let currentIndex = 0;
    let autoplayTimer: ReturnType<typeof setInterval> | null = null;
    let isDragging = false;
    let startX = 0;
    let dragCurrent: HTMLElement | null = null;
    let dragNext: HTMLElement | null = null;
    let dragPrev: HTMLElement | null = null;

    const dots: HTMLElement[] = [];
    if (dotsContainer) {
      slides.forEach((_, i) => {
        const dot = document.createElement("div");
        dot.className = "hero-dot";
        dot.addEventListener("click", () => {
          if (i === currentIndex) return;
          stopAutoplay();
          showSlide(i, i > currentIndex ? 1 : -1);
          startAutoplay();
        });
        dotsContainer.appendChild(dot);
        dots.push(dot);
      });
    }

    function updateDots(activeIndex: number) {
      dots.forEach((dot, i) => dot.classList.toggle("is-current", i === activeIndex));
    }

    function placeInstant(slide: HTMLElement, className: string) {
      slide.style.transition = "none";
      slide.classList.remove("pos-left", "pos-center", "pos-right");
      slide.classList.add(className);
      void slide.offsetWidth;
      slide.style.transition = "";
    }

    function showSlide(index: number, direction: 1 | -1) {
      const nextIndex = (index + totalSlides) % totalSlides;
      if (nextIndex === currentIndex) return;

      const currentSlide = slides[currentIndex];
      const nextSlide = slides[nextIndex];

      placeInstant(nextSlide, direction === 1 ? "pos-right" : "pos-left");

      requestAnimationFrame(() => {
        currentSlide.classList.remove("pos-center");
        currentSlide.classList.add(direction === 1 ? "pos-left" : "pos-right");

        nextSlide.classList.remove("pos-left", "pos-right");
        nextSlide.classList.add("pos-center");
      });

      currentIndex = nextIndex;
      updateDots(currentIndex);
    }

    function nextSlide() {
      showSlide(currentIndex + 1, 1);
    }

    function startAutoplay() {
      stopAutoplay();
      autoplayTimer = setInterval(nextSlide, 3500);
    }

    function stopAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
    }

    function onTouchStart(e: TouchEvent) {
      isDragging = true;
      startX = e.touches[0].clientX;
      stopAutoplay();

      dragCurrent = slides[currentIndex];
      dragNext = slides[(currentIndex + 1) % totalSlides];
      dragPrev = slides[(currentIndex - 1 + totalSlides) % totalSlides];

      [dragCurrent, dragNext, dragPrev].forEach((s) => (s.style.transition = "none"));
      placeInstant(dragNext, "pos-right");
      placeInstant(dragPrev, "pos-left");
      dragNext.style.transition = "none";
      dragPrev.style.transition = "none";
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDragging || !dragCurrent || !dragNext || !dragPrev) return;
      const deltaX = e.touches[0].clientX - startX;
      const percent = (deltaX / viewport!.offsetWidth) * 100;

      dragCurrent.style.transform = `translateX(${percent}%) scale(1)`;
      dragCurrent.style.opacity = "1";

      if (deltaX < 0) {
        dragNext.style.transform = `translateX(${100 + percent}%) scale(0.85)`;
        dragNext.style.opacity = "1";
        dragPrev.style.opacity = "0";
      } else if (deltaX > 0) {
        dragPrev.style.transform = `translateX(${-100 + percent}%) scale(0.85)`;
        dragPrev.style.opacity = "1";
        dragNext.style.opacity = "0";
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isDragging || !dragCurrent || !dragNext || !dragPrev) return;
      isDragging = false;

      const deltaX = e.changedTouches[0].clientX - startX;
      const threshold = viewport!.offsetWidth * 0.15;

      const committedForward = deltaX < -threshold;
      const committedBackward = deltaX > threshold;

      [dragCurrent, dragNext, dragPrev].forEach((s) =>
        s.classList.remove("pos-left", "pos-center", "pos-right"),
      );

      if (committedForward) {
        currentIndex = (currentIndex + 1) % totalSlides;
        dragCurrent.classList.add("pos-left");
        dragNext.classList.add("pos-center");
        dragPrev.classList.add("pos-right");
      } else if (committedBackward) {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        dragCurrent.classList.add("pos-right");
        dragPrev.classList.add("pos-center");
        dragNext.classList.add("pos-right");
      } else {
        dragCurrent.classList.add("pos-center");
        dragNext.classList.add("pos-right");
        dragPrev.classList.add("pos-left");
      }
      updateDots(currentIndex);

      const SWIPE_SPEED = "0.4s";
      const settling = [dragCurrent, dragNext, dragPrev] as HTMLElement[];

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          settling.forEach((s) => {
            s.style.transition = `transform ${SWIPE_SPEED} ease-in-out, opacity ${SWIPE_SPEED} ease-in-out`;
            s.style.transform = "";
            s.style.opacity = "";
          });
        });
      });

      setTimeout(() => {
        settling.forEach((s) => {
          s.style.transition = "";
        });
      }, 400);

      startAutoplay();
    }

    viewport.addEventListener("touchstart", onTouchStart);
    viewport.addEventListener("touchmove", onTouchMove);
    viewport.addEventListener("touchend", onTouchEnd);

    slides.forEach((slide, i) => {
      placeInstant(slide, i === 0 ? "pos-center" : "pos-right");
    });
    updateDots(0);

    startAutoplay();

    return () => {
      stopAutoplay();
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      dots.forEach((dot) => dot.remove());
    };
  }, []);

  return (
    <div ref={containerRef} className="mt-5 w-full max-w-lg">
      <div id="hero-slider" className="hero-slider">
        <div id="hero-slider-track" className="hero-slider-track">
          {SLIDE_IMAGES.map((src) => (
            <div key={src} className="hero-slide">
              <img src={src} alt="" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
      <div id="hero-slider-dots" className="hero-slider-dots" />
    </div>
  );
}