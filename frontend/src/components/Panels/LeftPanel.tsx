import { useRef } from 'react';
import { blockList } from '../Blocks/blockList';
import MessageOneBlock from '../Blocks/MessageOneBlock';
import MessageManyBlock from '../Blocks/MessageManyBlock';
import HorizontalBlock from '../Blocks/HorizontalBlock';
import VerticalBlock from '../Blocks/VerticalBlock';
import BaselineBlock from '../Blocks/BaselineBlock';
import EndBlock from '../Blocks/EndBlock';
import ColorBlock from '../Blocks/ColorBlock';
import ImageBlock from '../Blocks/ImageBlock';
import SizeBlock from '../Blocks/SizeBlock';
import TextBlock from '../Blocks/TextBlock';
import StartBlock from '../Blocks/StartBlock';
import Horizontal_CenterBlock from '../Blocks/Horizontal_CenterBlock';
import HendlBlock from '../Blocks/HendlBlock';
import Vertical_CenterBlock from '../Blocks/Vertical_CenterBlock';
import TopBlock from '../Blocks/TopBlock';
import BottomBlock from '../Blocks/BottomBlock';
import SpacingBlock from '../Blocks/SpacingBlock';

const LeftPanel = () => {
  const categoryMap = {
      container: {
        label: '容器',
        color: '#F4A261',
        ref: useRef<HTMLDivElement>(null),
      },
      box: {
        label: '區塊',
        color: '#2A9D8F',
        ref: useRef<HTMLDivElement>(null),
      },
      component: {
        label: '元件',
        color: '#8ECAE6',
        ref: useRef<HTMLDivElement>(null),
      },
      style: {
        label: '樣式',
        color: '#CDB4DB',
        ref: useRef<HTMLDivElement>(null),
      },
    };
    
    // 自動分類
    const sortedBlockList = Object.keys(categoryMap).map((category) => ({
      ...categoryMap[category],
      types: blockList.filter(block => block.category === category).map(block => block.type)
    }));
    

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
    <div className="w-full sm:w-[352px] h-[400px] sm:h-[520px] rounded-[15px] sm:rounded-[25px] bg-white border border-black shadow-[-8px_8px_0_#819780] sm:shadow-[-15px_15px_0_#819780] p-3 sm:p-5 flex-shrink-0 relative flex">

      <div className="flex flex-col relative mt-3 sm:mt-5 ml-[2px] items-center">
        {sortedBlockList.map((group) => (
          <div key={group.label} className="flex flex-col items-center mb-[20px] sm:mb-[30px] cursor-pointer touch-manipulation" onClick={() => handleScrollTo(group.ref)}>       
            <div
              className="w-[24px] h-[24px] sm:w-[30px] sm:h-[30px] rounded-full mb-1"
              style={{ backgroundColor: group.color }}
            ></div>
            <span className="text-[10px] sm:text-[12px] text-black">
              {group.label}
            </span>
          </div>
        ))}

        <div className="absolute top-0 left-[40px] sm:left-[50px] w-[2px] h-[340px] sm:h-[440px] bg-black"></div>
      </div>

      <div
        className="flex flex-col gap-3 sm:gap-4 mt-1 ml-[30px] sm:ml-[40px] overflow-y-auto h-full pr-0 w-full scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
        ref={scrollContainerRef}
      >
        {sortedBlockList.map((group) => {
          const blocksInGroup = blockList.filter((block) => group.types.includes(block.type));

          return (
            <div key={group.label} ref={group.ref}>
              <h3 className="text-[12px] sm:text-[14px] font-medium mb-2 text-[#383A45]">{group.label}</h3>

              <div className="flex flex-col gap-2">

              {blocksInGroup.map((block) => {
                const commonProps = {
                  key: block.type,
                  draggable: true,
                  onDragStart: (event: React.DragEvent<HTMLDivElement>) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData('blockType', block.type);
                  }
                };

                let blockElement = null;

                switch (block.type) {
                  case 'bubble':
                    blockElement = <MessageOneBlock />;
                    break;
                  case 'carousel':
                    blockElement = <MessageManyBlock />;
                    break;
                  case 'horizontal':
                    blockElement = <HorizontalBlock />;
                    break;
                  case 'vertical':
                    blockElement = <VerticalBlock />;
                    break;
                  case 'baseline':
                    blockElement = <BaselineBlock />;
                    break;
                  case 'end':
                      blockElement = <EndBlock />;
                      break;  
                  case 'color':
                      blockElement = <ColorBlock />;
                      break;    
                  case 'image':
                      blockElement = <ImageBlock />;
                      break;     
                  case 'size':
                      blockElement = <SizeBlock />;
                      break;  
                  case 'text':
                      blockElement = <TextBlock />;
                      break;   
                  case 'start':
                      blockElement = <StartBlock />;
                      break; 
                  case 'horizontal_center':
                      blockElement = <Horizontal_CenterBlock />;
                      break;  
                  case 'hend':
                      blockElement = <HendlBlock />;
                      break;  
                  case 'vertical_center':
                      blockElement = <Vertical_CenterBlock />;
                      break;    
                  case 'top':
                      blockElement = <TopBlock />;
                      break;   
                  case 'bottom':
                      blockElement = <BottomBlock />;
                      break; 
                  case 'spacing':
                      blockElement = <SpacingBlock />;
                      break;      
                  default:
                    blockElement = (
                      <div
                        className="w-[100px] h-[40px] rounded-[50px] flex items-center justify-center leading-[40px]"
                        style={{ backgroundColor: group.color }}
                      >
                        {block.label}
                      </div>
                    );
                }

                return (
                  <div {...commonProps} className="cursor-move mb-3 sm:mb-4 touch-manipulation">
                    
                      {blockElement}
                    
                  </div>
                );
              })}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeftPanel;
