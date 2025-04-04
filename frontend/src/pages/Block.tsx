import BlockPage from '../components/Block/BlockPage';
import Navbar2 from '../components/LoginHome/Navbar2';
import Footer from '../components/Index/Footer';

const Block = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFA]">
      <Navbar2 />
      <main className="pt-20 flex flex-col items-center">
        <BlockPage />
      </main>
      <Footer />
    </div>
  );
};

export default Block;