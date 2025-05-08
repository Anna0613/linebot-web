const Mybot = () => (
    <div className="bg-white shadow-md rounded-xl p-4 w-1/3 border">
      <h2 className="text-xl font-bold text-center mb-4">我的 Bot</h2>
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