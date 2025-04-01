import StepOne from '../components/StepOne';
import StepTwo from '../components/StepTwo';
import StepThree from '../components/StepThree';
import StepFour from '../components/StepFour';
import Navbar2 from '../components/Navbar2';
import Footer from '../components/Footer';

const HowToEstablish = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFA]">
      <Navbar2 />
      <main className="pt-24 flex flex-col items-center">
        <StepOne />
        <StepTwo />
        
      </main>
      <Footer />
    </div>
  );
};

export default HowToEstablish;

