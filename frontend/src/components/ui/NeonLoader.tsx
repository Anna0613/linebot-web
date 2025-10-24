export default function NeonLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-32 h-32">
          {/* 外圈 - 順時針旋轉 */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-cyan-400 animate-spin shadow-lg shadow-cyan-400/50"></div>

          {/* 中圈 - 逆時針旋轉 */}
          <div
            className="absolute inset-3 rounded-full border-4 border-transparent border-b-blue-500 border-l-blue-500 shadow-lg shadow-blue-500/50"
            style={{
              animation: 'spin-reverse 1.5s linear infinite'
            }}
          ></div>

          {/* 內圈 - 順時針快速旋轉 */}
          <div className="absolute inset-6 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-500 animate-spin shadow-lg shadow-purple-500/50" style={{animationDuration: '0.8s'}}></div>

          {/* 中心脈動點 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 rounded-full animate-pulse shadow-2xl shadow-purple-500/80"></div>
          </div>

          {/* 裝飾性光環 */}
          <div className="absolute inset-[-8px] rounded-full border border-cyan-400/20 animate-ping" style={{animationDuration: '2s'}}></div>
        </div>

        {/* Loading 文字 */}
        <div className="text-blue-400 font-semibold text-lg tracking-wider animate-pulse">
          Loading...
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
      `}} />
    </div>
  );
}

