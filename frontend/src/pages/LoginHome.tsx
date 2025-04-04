import Footer from '../components/Index/Footer';
import Navbar2 from '../components/LoginHome/Navbar2';
import LogInIn from '../components/LoginHome/HomeBotfly';

const LoginHome = () => {
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

export default LoginHome;