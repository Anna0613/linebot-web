import { useState, useRef } from 'react';

const Vertical_CenterBlock = () => {
  const [color, setColor] = useState('#CDB4DB');
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleBlockClick = () => {
    if (colorInputRef.current) {
      colorInputRef.current.click(); // 點積木打開 color picker
    }
  };
    return (
      <div
        className="w-[70px] h-[28px] rounded-full flex items-center justify-center cursor-pointer text-sm font-sans"
        style={{
          backgroundColor: color,
        }}
        onClick={handleBlockClick}
      >
        中間對齊
      </div>
    );
  };
  
  export default Vertical_CenterBlock;
  