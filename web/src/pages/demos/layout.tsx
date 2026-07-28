import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const DemoLayout = () => {
  const links = [
    {
      to: 'embedded',
      label: 'Embedded Mode',
    },
    {
      to: 'preview',
      label: 'Preview Mode',
    },
    {
      to: '01agent',
      label: '01agent',
    },
    {
      to: 'components',
      label: 'components',
    },
    {
      to: 'widgets',
      label: 'widgets',
    },
    {
      to: 'virtual-scroll',
      label: 'virtual-scroll',
    },
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Playground</h1>
            </div>
            <div className="flex items-center gap-4">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `font-semibold ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `font-semibold ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'}`
                }
              >

                Back to Home
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default DemoLayout;
