import { useToast } from "@/hooks/use-toast";

const RightPanel = () => {
    const { toast } = useToast();

    const handleExport = () => {
      toast({
        title: "匯出功能",
        description: "這裡將會導出 JSON！🚀",
      });
    };
  
    return (
      <div className="w-full sm:w-[288px] h-[400px] sm:h-[520px] rounded-[15px] sm:rounded-[25px] bg-white border border-black shadow-[-8px_8px_0_#819780] sm:shadow-[-15px_15px_0_#819780] p-3 sm:p-5 flex-shrink-0 flex flex-col justify-between">
        <div>
          <h2 className="text-center text-[20px] sm:text-[26px] font-bold text-[#383A45] mb-3 sm:mb-4">預覽畫面</h2>
  
          <div className="h-[280px] sm:h-[360px] flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400 text-sm sm:text-base">這裡是預覽區</p>
          </div>
        </div>

        <button
          onClick={handleExport}
          className="text-white bg-[#82C29B] px-4 py-3 sm:py-2 text-sm sm:text-base font-semibold rounded-lg hover:bg-[#6BAF88] transition duration-200 shadow-sm w-[90%] sm:w-[80%] mx-auto touch-manipulation"
        >
          匯出 JSON
        </button>
      </div>
    );
  };
  
  export default RightPanel;
