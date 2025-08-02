import { useRef } from "react";

const LeftPanel = () => {
  const _categoryMap = {
    container: {
      label: "容器",
      color: "#F4A261",
      ref: useRef<HTMLDivElement>(null),
    },
    box: {
      label: "區塊",
      color: "#2A9D8F",
      ref: useRef<HTMLDivElement>(null),
    },
    component: {
      label: "元件",
      color: "#8ECAE6",
      ref: useRef<HTMLDivElement>(null),
    },
    style: {
      label: "樣式",
      color: "#CDB4DB",
      ref: useRef<HTMLDivElement>(null),
    },
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const _handleScrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current && scrollContainerRef.current) {
      const containerTop =
        scrollContainerRef.current.getBoundingClientRect().top;
      const targetTop = ref.current.getBoundingClientRect().top;
      const scrollOffset =
        targetTop - containerTop + scrollContainerRef.current.scrollTop;

      scrollContainerRef.current.scrollTo({
        top: scrollOffset,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="w-full sm:w-[352px] h-[400px] sm:h-[520px] rounded-[15px] sm:rounded-[25px] bg-white border border-black shadow-[-8px_8px_0_#819780] sm:shadow-[-15px_15px_0_#819780] p-3 sm:p-5 flex-shrink-0 relative flex">
      <div className="flex flex-col relative mt-3 sm:mt-5 ml-[2px] items-center">
        <div className="absolute top-0 left-[40px] sm:left-[50px] w-[2px] h-[340px] sm:h-[440px] bg-black"></div>
      </div>

      <div
        className="flex flex-col gap-3 sm:gap-4 mt-1 ml-[30px] sm:ml-[40px] overflow-y-auto h-full pr-0 w-full scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
        ref={scrollContainerRef}
      ></div>
    </div>
  );
};

export default LeftPanel;
