"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "@/components/login-form"


export default function LoginPage() {
  const [showLogin, setShowLogin] = useState(false);


  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogin(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
   
   


   // Choose particle color based on theme

  return (
    <div className=" flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      {showLogin ? (
        <div className="w-full max-w-sm p-6">
          <LoginForm />
        </div>
      ) : (
        <div className="h-[40rem] w-full  flex flex-col items-center justify-center overflow-hidden rounded-md">
      <h1 className="trajan-font md:text-7xl text-3xl lg:text-9xl  text-center  relative z-20">
      CryoViz™ Web
      </h1>
      <p className="md:text-1xl text-1xl lg:text-1xl  text-center  relative z-20"> A proud product of <a href="https://bioinvision.com" target="_blank" rel="noopener noreferrer" >BioInvision</a></p>
      <div className="w-[40rem] h-40 relative">
        {/* Gradients */}
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

       

        {/* Radial Gradient to prevent sharp edges */}
        <div className="absolute inset-0 w-full h-full [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
        </div>
    </div>
      )}
    </div>
  )
}
