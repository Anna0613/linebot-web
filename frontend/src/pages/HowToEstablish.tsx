import StepOne from '../components/HowToEstablish/StepOne';
import StepTwo from '../components/HowToEstablish/StepTwo';
import StepThree from '../components/HowToEstablish/StepThree';
import StepFour from '../components/HowToEstablish/StepFour';
import Navbar2 from '../components/LoginHome/Navbar2';
import Footer from '../components/Index/Footer';

const HowToEstablish = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFA]">
      <Navbar2 />
      <main className="pt-24 flex flex-col items-center">
        <StepOne />
        <StepTwo />
        <StepThree />
        <StepFour />
      </main>
      <Footer />
    </div>
  );
};

export default HowToEstablish;

