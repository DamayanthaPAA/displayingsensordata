'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { href: '#home', label: 'Home' },
    { href: '#about', label: 'About' },
    { href: '#features', label: 'Features' },
    { href: '#Donat Now', label: 'Donat Now' },
    { href: '#contactus', label: 'Contact us' },
  ]

  return (
    <nav className="bg-green-900">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <a href="#" className="text-xl font-bold text-white">
            mqttLink
          </a>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <div className="hidden md:flex md:items-center md:gap-8">
            <ul className="flex gap-6">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-gray-300 hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="rounded-md bg-yellow-500 px-4 py-2 text-black hover:bg-yellow-600"
              >
                Log in
              </a>
              <a
                href="/users/new"
                className="rounded-md border border-white px-4 py-2 text-white hover:bg-gray-800"
              >
                Sign up
              </a>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden">
            <ul className="space-y-2 pb-3 pt-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="space-y-2 px-3 pb-3">
              <a
                href="/login"
                className="block rounded-md bg-yellow-500 px-4 py-2 text-center text-black hover:bg-yellow-600"
              >
                Log in
              </a>
              <a
                href="/users/new"
                className="block rounded-md border border-white px-4 py-2 text-center text-white hover:bg-gray-800"
              >
                Sign up
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar