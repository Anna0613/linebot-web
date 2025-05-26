// EditOptions.tsx
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type EditOptions = {
  onClose: () => void;
  onConfirm: (option: string) => void;
};

const EditOptions = ({ onClose, onConfirm }: EditOptions) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const { toast } = useToast();

  const isSelected = (option: string) =>
    selectedOption === option
      ? "bg-[#FFD59E] text-[#4B4B4B]"
      : "bg-[#FFF7E0] text-[#4B4B4B] hover:bg-[#f4b1a5]";

  const handleConfirm = () => {
    if (selectedOption) {
      onConfirm(selectedOption);
    } else {
      toast({
        variant: "destructive",
        title: "請選擇選項",
        description: "請選擇一個選項",
      });
    }
  };

  return (
    <div className="w-full sm:w-[320px] h-[520px] rounded-[25px] bg-white border border-black shadow-[-15px_15px_0_#819780] p-6 flex flex-col justify-between items-center">
      <h2 className="text-center text-[20px] sm:text-[26px] font-bold text-[#383A45] mb-3 sm:mb-4">選擇您要修改的項目</h2>

      <div className="flex flex-col w-full items-stretch space-y-4 my-4">
        <button onClick={() => setSelectedOption("name")} className={`h-12 flex items-center justify-center gap-3 rounded-md shadow-md transition ${isSelected("name")}`}>
          <span className="text-xl">✏️</span>
          <span className="text-base font-semibold">修改名字</span>
        </button>
        <button onClick={() => setSelectedOption("message")} className={`h-12 flex items-center justify-center gap-3 rounded-md shadow-md transition ${isSelected("message")}`}>
          <span className="text-xl">📧</span>
          <span className="text-base font-semibold">修改訊息</span>
        </button>
        <button onClick={() => setSelectedOption("logic")} className={`h-12 flex items-center justify-center gap-3 rounded-md shadow-md transition ${isSelected("logic")}`}>
          <span className="text-xl">🤖</span>
          <span className="text-base font-semibold">Bot 邏輯</span>
        </button>
      </div>

      <div className="flex justify-between w-full space-x-4 pt-2">
        <button
          className="flex-1 bg-[#F6B1B1] text-white py-2 rounded-md font-bold shadow hover:brightness-90 transition"
          onClick={onClose}
        >
          取消
        </button>
        <button
          className="flex-1 bg-[#A0D6B4] text-white py-2 rounded-md font-bold shadow hover:brightness-90 transition"
          onClick={handleConfirm}
        >
          確定
        </button>
      </div>
    </div>
  );
};

export default EditOptions;