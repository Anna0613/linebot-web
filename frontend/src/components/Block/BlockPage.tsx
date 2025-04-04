const Block = () => {
    return (
      <div className="flex flex-col bg-[#FFFDFA]">
        <main className="pt-24 flex flex-col items-center">
          <div className="flex gap-[35px] px-6 mb-24 justify-start items-start translate-x-[10px]">
   
            <div className="w-[352px] h-[480px] rounded-[25px] bg-white border border-black shadow-[-15px_15px_0_#819780] p-5 flex-shrink-0 relative">
              <h2 className="text-center text-[26px] font-bold text-[#383A45] mb-4">功能選單</h2>
              <div className="relative w-[306px] h-[30px] mx-auto mt-[15px] mb-4">
                <input
                  type="text"
                  placeholder="搜尋..."
                  className="w-full h-full rounded-[10px] border border-gray-300 bg-[#ECECEC] px-2.5 pr-10 text-sm shadow"
                />
                <svg
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                  height="14"
                  width="14"
                  viewBox="0 0 512 512"
                >
                  <path
                    fill="#454658"
                    d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"
                  />
                </svg>
              </div>
  
              <div className="flex flex-col relative mt-5 ml-[2px]">
                <div className="w-[30px] h-[30px] rounded-full bg-[#AF3C3C] mb-[30px]"></div>
                <div className="w-[30px] h-[30px] rounded-full bg-[#153F7A] mb-[30px]"></div>
                <div className="w-[30px] h-[30px] rounded-full bg-[#E9CD4C] mb-[30px]"></div>
                <div className="w-[30px] h-[30px] rounded-full bg-[#36563C] mb-[30px]"></div>
                <div className="absolute top-0 left-[50px] w-[2px] h-[340px] bg-black"></div>
              </div>
  
              <div className="relative mt-8">
                <div
                  className="w-[77px] h-[30px] bg-[#AF3C3C] rounded-[5px] text-white text-[14px] text-center leading-[30px] font-sans relative mb-4 transform translate-x-[73px] -translate-y-[180px] cursor-move"
                  draggable="true"
                >
                  單一訊息
                  <div className="absolute bottom-[-8px] left-1/2 transform -translate-x-1/2 w-[16px] h-[16px] bg-[#AF3C3C] rounded-full"></div>
                </div>
                <div
                  className="w-[77px] h-[30px] bg-[#AF3C3C] rounded-[5px] text-white text-[14px] text-center leading-[30px] font-sans relative transform translate-x-[73px] -translate-y-[160px] cursor-move"
                  draggable="true"
                >
                  多個訊息
                  <div className="absolute bottom-[-8px] left-1/2 transform -translate-x-1/2 w-[16px] h-[16px] bg-[#AF3C3C] rounded-full"></div>
                </div>
              </div>
            </div>
  
            <div className="w-[624px] h-[480px] rounded-[25px] bg-white border border-black shadow-[-15px_15px_0_#819780] p-5 flex-shrink-0 flex items-center justify-center">
              <div id="dropZone" className="w-full h-full flex items-center justify-center">
                
              </div>
            </div>
  
            
            <div className="w-[288px] h-[480px] rounded-[25px] bg-white border border-black shadow-[-15px_15px_0_#819780] p-5 flex-shrink-0">
              <h2 className="text-center text-[26px] font-bold text-[#383A45] mb-4">預覽畫面</h2>
             
            </div>
          </div>
        </main>
      </div>
    );
  };
  
  export default Block;
  