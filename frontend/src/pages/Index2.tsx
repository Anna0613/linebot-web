import Footer from '../components/Footer';
import Navbar2 from '../components/Navbar2';
import LogInIn from '../components/HomeBotfly';

const Index2 = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar2 />
      <div className="mt-40 mb-20">
        <LogInIn />
      </div>
      <Footer />
    </div>
  );
};

export default Index2;