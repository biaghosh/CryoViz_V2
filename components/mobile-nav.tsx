"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, CuboidIcon as Cube, Settings, Layers, Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function MobileNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden h-9 w-9 px-0">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <div className="flex flex-col space-y-6 mt-6">
          <Link
            href="#features"
            className="flex items-center space-x-3 text-lg font-medium hover:text-primary transition-colors"
            onClick={() => setOpen(false)}
          >
            <Cube className="h-5 w-5" />
            <span>3D Imaging</span>
          </Link>

          <Link
            href="#specifications"
            className="flex items-center space-x-3 text-lg font-medium hover:text-primary transition-colors"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-5 w-5" />
            <span>Specifications</span>
          </Link>

          <Link
            href="#software"
            className="flex items-center space-x-3 text-lg font-medium hover:text-primary transition-colors"
            onClick={() => setOpen(false)}
          >
            <Layers className="h-5 w-5" />
            <span>Software</span>
          </Link>

          <Link
            href="#contact"
            className="flex items-center space-x-3 text-lg font-medium hover:text-primary transition-colors"
            onClick={() => setOpen(false)}
          >
            <Phone className="h-5 w-5" />
            <span>Contact</span>
          </Link>

          <div className="pt-6 border-t">
            <Button className="w-full bg-gradient-to-r from-primary to-green-600 hover:from-primary/90 hover:to-green-600/90">
              Launch CryoViz Web
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
