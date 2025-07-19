import { useState, useRef, useEffect } from "react";

const parentType = "container";

const MiddlePanel = () => {
  return (
    <div className="relative w-full xs:w-[520px] sm:w-[580px] md:w-[624px] h-[360px] xs:h-[400px] sm:h-[460px] md:h-[520px] rounded-[12px] xs:rounded-[15px] sm:rounded-[20px] md:rounded-[25px] bg-white border border-black shadow-[-6px_6px_0_#819780] xs:shadow-[-8px_8px_0_#819780] sm:shadow-[-12px_12px_0_#819780] md:shadow-[-15px_15px_0_#819780] p-2 xs:p-3 sm:p-4 md:p-5 flex-shrink-0 flex flex-col transition-all duration-300">
      {/* 儲存按鈕 */}
      <button
        className="absolute top-2 xs:top-3 sm:top-4 left-2 xs:left-3 sm:left-4 p-1.5 xs:p-2 touch-manipulation hover:scale-110 transition-all duration-200 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 group"
        title="儲存設計"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 448 512"
          className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6"
        >
          <path
            fill="#454658"
            d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-242.7c0-17-6.7-33.3-18.7-45.3L352 50.7C340 38.7 323.7 32 306.7 32L64 32zm0 96c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32l0 64c0 17.7-14.3 32-32 32L96 224c-17.7 0-32-14.3-32-32l0-64zM224 288a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"
          />
        </svg>
      </button>

      {/* 清空按鈕 */}
      <button
        className="absolute top-2 xs:top-3 sm:top-4 right-2 xs:right-3 sm:right-4 p-1.5 xs:p-2 touch-manipulation hover:scale-110 transition-all duration-200 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-red-50 group"
        title="清空設計"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 448 512"
          className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6"
        >
          <path
            fill="#454658"
            d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"
          />
        </svg>
      </button>

      {/* 放大縮小 */}
      <div className="absolute bottom-2 xs:bottom-3 sm:bottom-4 right-2 xs:right-3 sm:right-4 flex flex-col space-y-2 xs:space-y-3">
        <button
          className="p-1.5 xs:p-2 touch-manipulation hover:scale-110 transition-all duration-200 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 group"
          title="放大"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6"
          >
            <path
              fill="#454658"
              d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM184 296c0 13.3 10.7 24 24 24s24-10.7 24-24l0-64 64 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-64 0 0-64c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 64-64 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l64 0 0 64z"
            />
          </svg>
        </button>
        <button
          className="p-1.5 xs:p-2 touch-manipulation hover:scale-110 transition-all duration-200 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 group"
          title="縮小"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6"
          >
            <path
              fill="#454658"
              d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM136 184c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MiddlePanel;
