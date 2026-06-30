import React, { useRef, useEffect, useState } from 'react';

interface Subject {
  id: number;
  name: string;
  code: string;
  semester: number;
  examDate?: string;
}

interface ExamCarouselProps {
  subjects: Subject[];
}

export default function ExamCarousel({ subjects }: ExamCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  // Sorting
  const getDaysLeft = (examDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(examDate);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sortedSubjects = [...subjects].sort((a, b) => {
    const diffA = getDaysLeft(a.examDate!);
    const diffB = getDaysLeft(b.examDate!);
    if (diffA < 0 && diffB >= 0) return 1;
    if (diffB < 0 && diffA >= 0) return -1;
    if (diffA < 0 && diffB < 0) return diffB - diffA; // both completed, closest to 0 first
    return diffA - diffB;
  });

  // Duplicate items to ensure we fill the screen and can infinite scroll
  let duplicatedSubjects = [...sortedSubjects];
  // Ensure we have enough items to scroll infinitely (at least 6 or 8)
  while (duplicatedSubjects.length < 8) {
    duplicatedSubjects = [...duplicatedSubjects, ...sortedSubjects];
  }
  // Double it one more time for the infinite scroll trick (so first half = second half)
  const renderSubjects = [...duplicatedSubjects, ...duplicatedSubjects];

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const scroll = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      if (scrollRef.current && !isHovered && !isInteracting && !isDragging) {
        // Stop scroll if document is not visible
        if (document.visibilityState === 'visible') {
          // Slow scroll: ~30px per second
          scrollRef.current.scrollLeft += (deltaTime * 30) / 1000;
          
          // Infinite loop logic:
          // The container has `renderSubjects` which is 2x `duplicatedSubjects`.
          // We want to loop back when we reach halfway.
          // Half of the scrollWidth is exactly the width of `duplicatedSubjects`.
          const halfWidth = scrollRef.current.scrollWidth / 2;
          if (scrollRef.current.scrollLeft >= halfWidth) {
            scrollRef.current.scrollLeft -= halfWidth;
          } else if (scrollRef.current.scrollLeft <= 0) {
             // In case they scroll backwards past the start
             // scrollRef.current.scrollLeft += halfWidth; // This can cause slight jitter if we aren't careful, but fine for basic use
          }
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isHovered, isInteracting, isDragging]);

  const handleInteraction = () => {
    setIsInteracting(true);
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 3500);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction();
    startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeftStart.current = scrollRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    handleInteraction();
    const x = e.pageX - (scrollRef.current.offsetLeft || 0);
    const walk = (x - startX.current) * 2; // scroll-fast
    scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleInteraction();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleInteraction();
  };

  const handleScroll = () => {
    handleInteraction();
    // Seamless loop backwards
    if (scrollRef.current) {
        const halfWidth = scrollRef.current.scrollWidth / 2;
        if (scrollRef.current.scrollLeft <= 0) {
            scrollRef.current.scrollLeft += halfWidth;
        } else if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth - scrollRef.current.clientWidth) {
            scrollRef.current.scrollLeft -= halfWidth;
        }
    }
  };

  return (
    <div 
      className="relative w-full overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar cursor-grab active:cursor-grabbing w-full items-stretch py-2"
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseUpOrLeave}
        onMouseUp={handleMouseUpOrLeave}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onScroll={handleScroll}
        style={{ scrollBehavior: 'auto' }}
      >
        {renderSubjects.map((subject, index) => {
          const days = getDaysLeft(subject.examDate!);
          const isCompleted = days < 0;
          return (
            <div 
              key={`${subject.id}-${index}`} 
              className={`w-[240px] h-[150px] flex-shrink-0 flex flex-col rounded-xl p-5 border ${isCompleted ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 opacity-70' : 'bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 border-indigo-100 dark:border-indigo-900/50'}`}
            >
              <p className={`text-sm font-medium ${isCompleted ? 'text-gray-500' : 'text-indigo-600 dark:text-indigo-400'} truncate`}>
                {subject.code}
              </p>
              <div className="flex-1 mt-1">
                 <p className={`font-bold line-clamp-2 ${isCompleted ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`} title={subject.name}>
                   {subject.name}
                 </p>
              </div>
              <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex items-baseline gap-1">
                <span className={`text-2xl font-black ${isCompleted ? 'text-gray-400 dark:text-gray-500 text-lg' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {isCompleted ? 'Completed' : days}
                </span>
                {!isCompleted && <span className="text-sm font-medium text-gray-500 dark:text-gray-400">days left</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
