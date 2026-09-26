import { Navbar } from './Navbar';
import { Outlet } from 'react-router-dom';

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col text-white">
      <Navbar />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};
