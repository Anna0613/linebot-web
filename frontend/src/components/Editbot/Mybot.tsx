const Mybot = () => (
  <div className="relative w-full xs:w-[520px] sm:w-[580px] md:w-[624px] h-[360px] xs:h-[400px] sm:h-[460px] md:h-[520px] rounded-[12px] xs:rounded-[15px] sm:rounded-[20px] md:rounded-[25px] bg-white border border-black shadow-[-6px_6px_0_#819780] xs:shadow-[-8px_8px_0_#819780] sm:shadow-[-12px_12px_0_#819780] md:shadow-[-15px_15px_0_#819780] p-2 xs:p-3 sm:p-4 md:p-5 flex-shrink-0 flex flex-col transition-all duration-300">
      <h2 className="text-center text-[20px] sm:text-[26px] font-bold text-[#383A45] mb-3 sm:mb-4">我的 Bot</h2>
      <input
        type="text"
        placeholder="搜尋"
        className="w-full p-2 border rounded mb-4"
      />
      <table className="w-full text-left">
        <thead>
          <tr className="text-red-600 font-bold">
            <th>1</th><th>名字</th><th>選擇</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-red-600 font-bold">
            <td>2</td><td>名字</td><td>選擇</td>
          </tr>
          <tr>
            <td>3</td><td>名字</td><td>選擇</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

export default Mybot;