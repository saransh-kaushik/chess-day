import { Navbar } from './Navbar';
import { Outlet } from 'react-router-dom';

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};
