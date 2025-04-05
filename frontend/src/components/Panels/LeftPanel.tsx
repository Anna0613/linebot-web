import { useRef } from 'react';
import { blockList } from '../Blocks/blockList';

const LeftPanel = () => {
  const sortedBlockList = [
    {
      label: '訊息',
      color: '#AF3C3C',
      types: ['message', 'messagess'],
      ref: useRef<HTMLDivElement>(null),
    },
    {
      label: '元件',
      color: '#153F7A',
      types: ['text', 'image', 'button', 'icon', 'video'],
      ref: useRef<HTMLDivElement>(null),
    },
    {
      label: '樣式',
      color: '#E9CD4C',
      types: ['color', 'size', 'width', 'height'],
      ref: useRef<HTMLDivElement>(null),
    },
  ];

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current && scrollContainerRef.current) {
      const containerTop = scrollContainerRef.current.getBoundingClientRect().top;
      const targetTop = ref.current.getBoundingClientRect().top;
      const scrollOffset = targetTop - containerTop + scrollContainerRef.current.scrollTop;

      scrollContainerRef.current.scrollTo({
        top: scrollOffset,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="w-[352px] h-[520px] rounded-[25px] bg-white border border-black shadow-[-15px_15px_0_#819780] p-5 flex-shrink-0 relative flex">

      <div className="flex flex-col relative mt-5 ml-[2px] items-center">
        {sortedBlockList.map((group) => (
          <div key={group.label} className="flex flex-col items-center mb-[30px] cursor-pointer" onClick={() => handleScrollTo(group.ref)}>
            <div
              className="w-[30px] h-[30px] rounded-full mb-1"
              style={{ backgroundColor: group.color }}
            ></div>
            <span className="text-[12px]" style={{ color: group.color }}>
              {group.label}
            </span>
          </div>
        ))}

        <div className="absolute top-0 left-[50px] w-[2px] h-[440px] bg-black"></div>
      </div>

      <div
        className="flex flex-col gap-4 mt-1 ml-[40px] overflow-y-auto h-full pr-0 w-full"
        ref={scrollContainerRef}
      >
        {sortedBlockList.map((group) => {
          const blocksInGroup = blockList.filter((block) => group.types.includes(block.type));

          return (
            <div key={group.label} ref={group.ref}>
              <h3 className="text-[14px] font-medium mb-2 text-[#383A45]">{group.label}</h3>

              <div className="flex flex-col gap-2">
                {blocksInGroup.map((block) => (
                  <div
                    key={block.type}
                    className="w-[120px] h-[40px] rounded-[5px] text-white text-center leading-[40px] cursor-move"
                    style={{ backgroundColor: group.color }}
                    draggable="true"
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData('blockType', block.type);
                    }}
                  >
                    {block.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeftPanel;
