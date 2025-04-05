import LeftPanel from '../components/Panels/LeftPanel';
import MiddlePanel from '../components/Panels/MiddlePanel';
import RightPanel from '../components/Panels/RightPanel';
import Navbar2 from '../components/LoginHome/Navbar2';
import Footer from '../components/Index/Footer';

const Block = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFA]">
      <Navbar2 />
      <main className="pt-32 flex flex-col items-center">
      <div className="flex gap-[35px] px-6 mb-24 justify-start items-start translate-x-[10px]">
          <LeftPanel />
          <MiddlePanel />
          <RightPanel />
      </div>
      </main>
      <Footer />
    </div>
  );
};

export default Block;