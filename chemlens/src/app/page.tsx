// src/app/page.tsx  

import EnvironmentalRisk from '@/components/EnvironmentalRisk';  

export default function Home() {
  return (
 
    <div className="flex min-h-screen flex-col items-center bg-gray-100 px-5 py-10 md:px-10 md:py-16">
    
      <h1 className="mb-8 max-w-3xl text-center text-3xl font-bold text-gray-800 md:mb-12 md:text-4xl">
       ChemLens Environmental & Safety Risk Assessor for Chemical Compounds
      </h1>

    
      <EnvironmentalRisk />
    </div>
  );
}