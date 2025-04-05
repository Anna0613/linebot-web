import { useState, useRef, useEffect } from 'react';
import { blockList } from '../Blocks/blockList';

interface BlockInstance {
  id: string;
  type: string;
}

const MiddlePanel = () => {
  const [zoom, setZoom] = useState(1);
  const [blocks, setBlocks] = useState<BlockInstance[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingGroupStart, setDraggingGroupStart] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const draggingGroupRef = useRef<BlockInstance[]>([]);

  // 點空白處自動關閉右鍵選單
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSave = () => alert('已儲存目前設計！');
  const handleDeleteAll = () => setBlocks([]);
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const blockType = event.dataTransfer.getData('blockType');
    const isInternal = event.dataTransfer.getData('internalDrag') === 'true';

    setBlocks((prev) => {
      const newBlocks = [...prev];
      if (isInternal && draggingGroupRef.current.length > 0 && draggingGroupStart !== null) {
        const group = draggingGroupRef.current;
        newBlocks.splice(draggingGroupStart, group.length);
        const insertIndex = dragOverIndex !== null ? dragOverIndex : newBlocks.length;
        newBlocks.splice(insertIndex, 0, ...group);
      } else if (blockType) {
        const newBlock: BlockInstance = {
          id: `${blockType}-${Date.now()}`,
          type: blockType,
        };
        const insertIndex = dragOverIndex !== null ? dragOverIndex : newBlocks.length;
        newBlocks.splice(insertIndex, 0, newBlock);
      }
      return newBlocks;
    });

    setDragOverIndex(null);
    setDraggingGroupStart(null);
    draggingGroupRef.current = [];
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    setDragOverIndex(index);
  };

  const handleContextMenu = (event: React.MouseEvent, blockId: string) => {
    event.preventDefault();
    if (!dropZoneRef.current) return;
    const dropZoneRect = dropZoneRef.current.getBoundingClientRect();
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
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
      setBlocks((prev) => prev.filter((b) => b.id !== contextMenu.blockId));
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
    draggingGroupRef.current = blocks.slice(index);
    event.dataTransfer.setData('internalDrag', 'true');
    event.dataTransfer.setData('blockId', blockId);
    event.dataTransfer.setData('blockType', blockType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="relative w-[624px] h-[520px] rounded-[25px] bg-white border border-black shadow-[-15px_15px_0_#819780] p-5 flex-shrink-0 flex flex-col">
      {/* 儲存按鈕 */}
      <button onClick={handleSave} className="absolute top-2 left-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="20" height="20">
          <path fill="#454658" d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-242.7c0-17-6.7-33.3-18.7-45.3L352 50.7C340 38.7 323.7 32 306.7 32L64 32zm0 96c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32l0 64c0 17.7-14.3 32-32 32L96 224c-17.7 0-32-14.3-32-32l0-64zM224 288a64 64 0 1 1 0 128 64 64 0 1 1 0-128z" />
        </svg>
      </button>

      {/* 清空按鈕 */}
      <button onClick={handleDeleteAll} className="absolute top-2 right-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="20" height="20">
          <path fill="#454658" d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z" />
        </svg>
      </button>

      {/* 放大縮小 */}
      <div className="absolute bottom-2 right-2 flex flex-col space-y-2">
        <button onClick={handleZoomIn}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="20" height="20">
            <path fill="#454658" d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM184 296c0 13.3 10.7 24 24 24s24-10.7 24-24l0-64 64 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-64 0 0-64c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 64-64 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l64 0 0 64z" />
          </svg>
        </button>
        <button onClick={handleZoomOut}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="20" height="20">
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
        {blocks.length === 0 && (
          <p className="text-gray-400 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            拖曳積木到這裡！
          </p>
        )}

        {blocks.map((block, index) => {
          const blockItem = blockList.find((b) => b.type === block.type);
          if (!blockItem) return null;
          const BlockComponent = blockItem.component;
          const isDraggingGroup = draggingGroupStart !== null && index >= draggingGroupStart;

          return (
            <div
              key={block.id}
              className={`relative w-[100px] h-[40px] flex justify-center transition-all duration-200 ${
                dragOverIndex === index ? 'mb-4' : ''
              } ${isDraggingGroup ? 'opacity-50' : 'opacity-100'}`}
              onDragOver={(e) => handleDragOver(e, index)}
              onContextMenu={(e) => handleContextMenu(e, block.id)}
              draggable
              onDragStart={(e) => handleGroupDragStart(e, index, block.id, block.type)}
            >
              <BlockComponent />
            </div>
          );
        })}
      </div>

      {/* 右鍵選單 */}
      {contextMenu && (
        <div
          className="absolute bg-white border border-gray-300 rounded shadow-md z-50 w-[150px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button className="block px-4 py-2 text-sm hover:bg-gray-100 w-full text-left" onClick={() => handleMenuAction('copy')}>
            複製
          </button>
          <button className="block px-4 py-2 text-sm hover:bg-gray-100 w-full text-left" onClick={() => handleMenuAction('delete')}>
            刪除
          </button>
        </div>
      )}
    </div>
  );
};

export default MiddlePanel;
