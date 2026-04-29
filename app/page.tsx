"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "@/components/login-form";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/ui/mode-toggle";

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black relative overflow-hidden transition-colors duration-300">
      {/* Clean geometric pattern overlay */}
      <div className="absolute inset-0 z-10" style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px),
          linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px'
      }} />
      <div className="absolute inset-0 z-10 dark:hidden" style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(0,0,0,0.01) 1px, transparent 1px),
          linear-gradient(rgba(0,0,0,0.01) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }} />
      <div className="absolute inset-0 z-10 hidden dark:block" style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px'
      }} />

      <AnimatePresence mode="wait">
        {!showAuth ? (
          // Hero Section
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-20 min-h-screen flex flex-col"
          >
            {/* Header */}
            <header className="p-6 flex justify-between items-center">
              <div className="flex items-center space-x-3">
            <Image
                  src="/images/biv-logo.png"
                  alt="BioInvision Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
                <span className="font-trajan text-lg text-black dark:text-white">CryoViz™</span>
              </div>
              
              {/* Theme Toggle */}
              <ModeToggle />
            </header>

            {/* Main Content */}
            <div className="flex-1 px-6 py-12">
              <div className="max-w-7xl mx-auto">
                {/* Hero Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-center mb-16"
                >
                  <motion.h1 
                    className="font-trajan text-4xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white leading-tight mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    CryoViz™ Web
                  </motion.h1>
                  <motion.h2
                    className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    The 3D Solution for Your Animal Studies
                  </motion.h2>
                  <motion.div 
                    className="flex flex-wrap justify-center gap-4 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                  >
                    <Badge variant="secondary" className="text-lg px-4 py-2">Microscopic Resolution</Badge>
                    <Badge variant="secondary" className="text-lg px-4 py-2">Single-cell Sensitivity</Badge>
                    <Badge variant="secondary" className="text-lg px-4 py-2">Mouse-sized Specimens</Badge>
                  </motion.div>
                  <motion.p 
                    className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1 }}
                  >
                    CryoViz™ provides high-detail answers with its unique combination of resolution, field-of-view, contrast, and sensitivity. Explore your samples in the digital domain. In 3D. In real color. With microscopic resolution.
                  </motion.p>
                </motion.div>

                {/* Action Buttons */}
                <motion.div 
                  className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.2 }}
                >
                  <Button 
                    size="lg"
                    onClick={() => { setAuthMode('login'); setShowAuth(true); }}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-6 text-lg"
                  >
                    Start Exploring
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={() => { setAuthMode('signup'); setShowAuth(true); }}
                    className="px-8 py-6 text-lg border-2"
                  >
                    Request Access
                  </Button>
                </motion.div>

                {/* Key Features */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.4 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
                >
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-center">Cellular & Molecular Imaging</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-sm text-muted-foreground">Color anatomy and exactly-registered multi-spectral molecular fluorescence</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-center">Expansive Capabilities</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-sm text-muted-foreground">Perfect combination of resolution, field-of-view, contrast, and sensitivity</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-center">Automated Work-Flow</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-sm text-muted-foreground">Easy sample preparation, unattended imaging sessions, single-click 3D visualization</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-center">Integrated Software Suite</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-sm text-muted-foreground">Automated multi-scale 3D color visualization, quantification and analysis</p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Technical Specifications */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.6 }}
                  className="mb-16"
                >
                  <h3 className="text-3xl font-bold text-center mb-8">Technical Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="text-base">Specimen Size</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">250 x 110 x 50mm max</p>
                        <p className="text-sm text-muted-foreground">Typically 90 x 60 x 30mm (whole mouse)</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="text-base">Section Thickness</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">2-200 microns</p>
                        <p className="text-sm text-muted-foreground">Programmable</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="text-base">Imaging Modes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">Bright-field and Fluorescence</p>
                        <p className="text-sm text-muted-foreground">Multiple filter cubes</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="text-base">System Resolution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">2.4 microns</p>
                        <p className="text-sm text-muted-foreground">At 1X objective and max zoom</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="text-base">Temperature Control</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">Automated 0 to -30°C</p>
                        <p className="text-sm text-muted-foreground">Precise control</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="text-base">Progress Alert</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">Cell phone and email</p>
                        <p className="text-sm text-muted-foreground">Automated messaging during imaging</p>
                      </CardContent>
                    </Card>
        </div>
                </motion.div>

                {/* Software Features */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.8 }}
                  className="text-center mb-16"
                >
                  <h3 className="text-3xl font-bold mb-8">Integrated Interactive Software</h3>
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50 max-w-4xl mx-auto">
                    <CardContent className="p-8">
                      <p className="text-lg mb-6">
                        From sectioning of samples and acquisition of images to 3D visualization, the CryoViz™ software suite allows you to run your imaging experiments unattended with complete automation.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-semibold mb-2">Automation</h4>
                          <p className="text-sm text-muted-foreground">Cell phone and email alerts keep you in touch</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Real-time Preview</h4>
                          <p className="text-sm text-muted-foreground">3D reconstruction while sectioning</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Extensible</h4>
                          <p className="text-sm text-muted-foreground">Plug-ins and scripting for custom needs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* Footer */}
            <footer className="p-6 text-center">
              <motion.p 
                className="text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 2 }}
              >
                A proud product of{" "}
                <a
                  href="https://bioinvision.com"
          target="_blank"
          rel="noopener noreferrer"
                  className="font-trajan text-base hover:text-primary transition-colors"
                >
                  BioInvision
                </a>
              </motion.p>
      </footer>

            {/* Floating Bottom Navigation Dock */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.5 }}
              className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30"
            >
              <div className="dock-container flex items-center justify-center space-x-2 bg-gray-200/60 dark:bg-gray-500/60 backdrop-blur-2xl rounded-full px-4 py-3 border border-gray-700/40 shadow-lg">
                <div className="dock-item relative group">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setAuthMode('login'); setShowAuth(true); }}
                    className="h-10 w-10 rounded-full bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black shadow-md flex items-center justify-center border border-transparent hover:border-gray-300/50 dark:hover:border-gray-600/50 transition-all duration-300"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-white  dark:text-black">
                      <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M3 14c0-3 2.5-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </Button>
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                    <div className="bg-black/90 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                      Login
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90"></div>
                    </div>
                  </div>
                </div>
                
                <div className="h-6 w-px bg-gray-400/30 dark:bg-gray-600/30" />
                
                <div className="dock-item relative group">
                  <Button 
                    size="sm"
                    onClick={() => { setAuthMode('signup'); setShowAuth(true); }}
                    className="h-10 w-10 rounded-full bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black shadow-md flex items-center justify-center border border-transparent hover:border-gray-300/50 dark:hover:border-gray-600/50 transition-all duration-300"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-white dark:text-black">
                      <path d="M8 1L9 7L15 8L9 9L8 15L7 9L1 8L7 7L8 1Z" fill="currentColor"/>
                    </svg>
                  </Button>
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                    <div className="bg-black/90 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                      Get Access
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          // Auth Section
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="relative z-20 min-h-screen flex items-center justify-center p-6"
          >
            <div className="w-full max-w-md">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {authMode === 'login' ? 'Welcome Back' : 'Get Access'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAuth(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ← Back
                  </Button>
                </div>

                {authMode === 'login' ? (
                  <LoginForm />
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      Request access to CryoViz™ Web platform
                    </p>
                    <Link href="/auth/signup">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                        Request Access
                      </Button>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Already have access?{" "}
                      <button 
                        onClick={() => setAuthMode('login')}
                        className="text-primary hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}