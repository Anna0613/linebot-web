import AddServerPage from '../components/AddServer/AddServerPage';
import Navbar2 from '../components/LoginHome/Navbar2';
import Footer from '../components/Index/Footer';

const AddServer = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFA]">
      <Navbar2 />
      <main className="pt-8 flex flex-col items-center">
        <AddServerPage />
      </main>
      <Footer />
    </div>
  );
};

export default AddServer;