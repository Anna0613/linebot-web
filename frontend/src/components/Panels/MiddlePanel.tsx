import { useState, useRef, useEffect } from 'react';
import { blockList } from '../Blocks/blockList';

interface BlockInstance {
  id: string;
  type: string;
  parentType?: string;
  children?: BlockInstance[];  // 新增！每個積木可以有自己的 children
}

const parentType = 'container';

const MiddlePanel = () => {
  const [zoom, setZoom] = useState(1);
  const [blocks, setBlocks] = useState<BlockInstance[]>([
    { id: 'placeholder-0', type: 'placeholder' }
  ]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingGroupStart, setDraggingGroupStart] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const draggingGroupRef = useRef<BlockInstance[]>([]);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSave = () => alert('已儲存目前設計！');
  const handleDeleteAll = () => setBlocks([{ id: 'placeholder-0', type: 'placeholder' }]);
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const isInternal = event.dataTransfer.getData('internalDrag') === 'true';
    const blockType = event.dataTransfer.getData('blockType');
    const blockId = event.dataTransfer.getData('blockId');
  
    setBlocks((prevBlocks) => {
      const newBlocks = [...prevBlocks];
  
      // 看看滑到的這個 block 是不是容器型
      const targetBlock = newBlocks.find(block => block.id === dragOverBlockId);
  
      const isContainer = targetBlock && ['horizontal', 'vertical', 'baseline'].includes(targetBlock.type);
  
      const newBlock: BlockInstance = {
        id: `${blockType}-${Date.now()}`,
        type: blockType,
        parentType: parentType,
        children: [], // 預設新的積木也可以有 children
      };
  
      if (isContainer && targetBlock) {
        // 如果有找到容器，就把新積木丟到它 children 裡
        targetBlock.children = targetBlock.children || [];
        targetBlock.children.push(newBlock);
      } else {
        // 沒有對到容器，就直接放外層
        newBlocks.push(newBlock);
      }
  
      return newBlocks;
    });
  
    setDragOverIndex(null);
    setDragOverBlockId(null);
    setDraggingGroupStart(null);
    setDraggingBlockId(null);
    draggingGroupRef.current = [];
  };
  
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    setDragOverIndex(index); // 每次拖曳到不同積木，就設定新的目標位置
    if (!dropZoneRef.current) return;
  
    const dropZoneRect = dropZoneRef.current.getBoundingClientRect();
    const targetElements = dropZoneRef.current.querySelectorAll('.block-wrapper'); // 👈等等積木要加這個 class
  
    const currentMouseX = event.clientX - dropZoneRect.left;
    const currentMouseY = event.clientY - dropZoneRect.top;
  
    const targetElement = targetElements[index] as HTMLElement;
    if (!targetElement) return;
  
    const targetRect = targetElement.getBoundingClientRect();
    const targetLeft = targetRect.left - dropZoneRect.left;
    const targetTop = targetRect.top - dropZoneRect.top;
    const targetHeight = targetRect.height;

    const blockId = blocks[index].id;
    setDragOverBlockId(blockId); // 👈 記住目前滑過的是哪一個 block

    const isConnected =
      Math.abs(currentMouseX - targetLeft) < 10 &&
      Math.abs(currentMouseY - (targetTop + targetHeight)) < 10;
  
    if (isConnected) {
      setDragOverIndex(index);
    } else {
      setDragOverIndex(null);
    }
  };
  
  const handleContextMenu = (event: React.MouseEvent, blockId: string) => {
    event.preventDefault();
    if (!dropZoneRef.current) return;
    const dropZoneRect = dropZoneRef.current.getBoundingClientRect();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      x: rect.right - dropZoneRect.left + 5,
      y: rect.top - dropZoneRect.top + 5,
      blockId,
    });
  };

  const handleMenuAction = (action: string) => {
    if (!contextMenu) return;
    const block = blocks.find((b) => b.id === contextMenu.blockId);
    if (!block) return;

    if (action === 'delete') {
      setBlocks((prev) => {
        const filtered = prev.filter((b) => b.id !== block.id);
        return filtered.length > 0 ? filtered : [{ id: 'placeholder-0', type: 'placeholder' }];
      });
    } else if (action === 'copy') {
      const newBlock: BlockInstance = {
        id: `${block.type}-${Date.now()}`,
        type: block.type,
      };
      setBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === block.id);
        const newBlocks = [...prev];
        newBlocks.splice(index + 1, 0, newBlock);
        return newBlocks;
      });
    }

    setContextMenu(null);
  };

  const handleGroupDragStart = (event: React.DragEvent, index: number, blockId: string, blockType: string) => {
    setDraggingGroupStart(index);
    setDraggingBlockId(blockId);
    draggingGroupRef.current = blocks.slice(index);
    event.dataTransfer.setData('internalDrag', 'true');
    event.dataTransfer.setData('blockId', blockId);
    event.dataTransfer.setData('blockType', blockType);
    event.dataTransfer.effectAllowed = 'move';

    const ghost = event.currentTarget.cloneNode(true) as HTMLElement;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const renderBlock = (block: BlockInstance) => {
    const blockItem = blockList.find(b => b.type === block.type);
    if (!blockItem) return null;
    const BlockComponent = blockItem.component;

    return (
      <div key={block.id} className="block-wrapper">
        <BlockComponent />

        {/* 如果有 children，遞迴畫 */}
        {block.children && block.children.length > 0 && (
          <div className="pl-4">
            {block.children.map(child => renderBlock(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full xs:w-[520px] sm:w-[580px] md:w-[624px] h-[360px] xs:h-[400px] sm:h-[460px] md:h-[520px] rounded-[12px] xs:rounded-[15px] sm:rounded-[20px] md:rounded-[25px] bg-white border border-black shadow-[-6px_6px_0_#819780] xs:shadow-[-8px_8px_0_#819780] sm:shadow-[-12px_12px_0_#819780] md:shadow-[-15px_15px_0_#819780] p-2 xs:p-3 sm:p-4 md:p-5 flex-shrink-0 flex flex-col transition-all duration-300">
      {/* 儲存按鈕 */}
      <button 
        onClick={handleSave} 
        className="absolute top-2 xs:top-3 sm:top-4 left-2 xs:left-3 sm:left-4 p-1.5 xs:p-2 touch-manipulation hover:scale-110 transition-all duration-200 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 group"
        title="儲存設計"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6">
          <path fill="#454658" d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-242.7c0-17-6.7-33.3-18.7-45.3L352 50.7C340 38.7 323.7 32 306.7 32L64 32zm0 96c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32l0 64c0 17.7-14.3 32-32 32L96 224c-17.7 0-32-14.3-32-32l0-64zM224 288a64 64 0 1 1 0 128 64 64 0 1 1 0-128z" />
        </svg>
      </button>

      {/* 清空按鈕 */}
      <button 
        onClick={handleDeleteAll} 
        className="absolute top-2 xs:top-3 sm:top-4 right-2 xs:right-3 sm:right-4 p-1.5 xs:p-2 touch-manipulation hover:scale-110 transition-all duration-200 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-red-50 group"
        title="清空設計"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6">
          <path fill="#454658" d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z" />
        </svg>
      </button>

      {/* 放大縮小 */}
      <div className="absolute bottom-2 xs:bottom-3 sm:bottom-4 right-2 xs:right-3 sm:right-4 flex flex-col space-y-2 xs:space-y-3">
        <button 
          onClick={handleZoomIn} 
          className="p-1.5 xs:p-2 touch-manipulation hover:scale-110 transition-all duration-200 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 group"
          title="放大"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6">
            <path fill="#454658" d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM184 296c0 13.3 10.7 24 24 24s24-10.7 24-24l0-64 64 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-64 0 0-64c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 64-64 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l64 0 0 64z" />
          </svg>
        </button>
        <button 
          onClick={handleZoomOut} 
          className="p-1.5 xs:p-2 touch-manipulation hover:scale-110 transition-all duration-200 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 group"
          title="縮小"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6">
            <path fill="#454658" d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM136 184c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z" />
          </svg>
        </button>
      </div>

      {/* Drop 區域 */}
      <div
        ref={dropZoneRef}
        className="flex flex-col items-center w-full h-full overflow-auto transition-transform relative"
        style={{ transform: `scale(${zoom})` }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {blocks.map((block, index) => {
        const blockItem = blockList.find((b) => b.type === block.type);
        if (!blockItem) return null;
        const BlockComponent = blockItem.component;

        return (
          <div key={block.id} className="flex flex-col items-start">
            {/* 當拖曳到這個位置時，插一個吸附提示 */}
            {dragOverIndex === index && (
              <div className="w-[140px] xs:w-[160px] sm:w-[180px] md:w-[200px] h-[14px] xs:h-[16px] sm:h-[18px] md:h-[20px] bg-[#F4CD41] rounded-lg mb-1.5 xs:mb-2 animate-pulse shadow-lg"></div>
            )}
            <div
              key={block.id}
              className="block-wrapper relative flex justify-center transition-all duration-200 hover:scale-105 cursor-grab active:cursor-grabbing active:scale-95"
              onDragOver={(e) => handleDragOver(e, index)}
              onContextMenu={(e) => handleContextMenu(e, block.id)}
              draggable
              onDragStart={(e) => handleGroupDragStart(e, index, block.id, block.type)}
            >
              <div className="relative hover:shadow-lg transition-shadow duration-200">
                <BlockComponent topCircleVisible={true} topCircleColor="green" />
              </div>
            </div>
          </div>
        );
      })}

      </div>

      {/* 右鍵選單 */}
      {contextMenu && (
        <div
          className="absolute bg-white/95 border border-gray-200 rounded-lg shadow-xl z-50 w-[120px] xs:w-[130px] sm:w-[140px] md:w-[150px] overflow-hidden backdrop-blur-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            className="block w-full px-3 xs:px-4 py-2.5 xs:py-3 sm:py-2.5 text-xs xs:text-sm hover:bg-blue-50 text-left touch-manipulation transition-colors duration-200 flex items-center gap-2" 
            onClick={() => handleMenuAction('copy')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4">
              <path fill="currentColor" d="M272 0H396.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H272c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128H192v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z"/>
            </svg>
            複製
          </button>
          <button 
            className="block w-full px-3 xs:px-4 py-2.5 xs:py-3 sm:py-2.5 text-xs xs:text-sm hover:bg-red-50 text-left touch-manipulation transition-colors duration-200 flex items-center gap-2 text-red-600" 
            onClick={() => handleMenuAction('delete')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4">
              <path fill="currentColor" d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
            </svg>
            刪除
          </button>
        </div>
      )}
    </div>
  );
};

export default MiddlePanel;
