import { useState, useRef, useEffect } from 'react';

const TextBlock = () => {
  const [text, setText] = useState('文字');
  const [editing, setEditing] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(50);

  useEffect(() => {
    if (spanRef.current) {
      const newWidth = spanRef.current.offsetWidth + 20;
      setWidth(Math.max(newWidth, 50));
    }
  }, [text]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (editing) {
      // 如果正在編輯，不讓拖曳
      e.preventDefault();
      return;
    }

    const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    ghost.style.width = `${e.currentTarget.offsetWidth}px`;
    ghost.style.height = `${e.currentTarget.offsetHeight}px`;
    ghost.style.opacity = '1';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);

    setTimeout(() => {
      document.body.removeChild(ghost);
    }, 0);
  };

  return (
    <div
      className="bg-[#8ECAE6] rounded-full flex items-center justify-center cursor-pointer"
      style={{ width: `${width}px`, height: '32px', padding: '0 8px' }}
      draggable={!editing} // 正常拖曳（但正在編輯時禁止）
      onDragStart={handleDragStart}
      onClick={() => setEditing(true)}
    >
      {editing ? (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => setEditing(false)}
          className="bg-transparent text-sm font-sans outline-none text-center w-full"
          onClick={(e) => e.stopPropagation()} // 防止冒泡
        />
      ) : (
        <p className="text-sm font-sans">{text}</p>
      )}

      <span ref={spanRef} className="absolute opacity-0 pointer-events-none text-sm font-sans">
        {text || '文字'}
      </span>
    </div>
  );
};

export default TextBlock;
