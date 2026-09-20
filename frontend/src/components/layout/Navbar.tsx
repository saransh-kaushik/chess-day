export const Navbar = () => {
  return (
    <nav className="bg-gray-800 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <a href="/" className="text-2xl font-bold text-blue-400">Chess Day</a>
        <div className="space-x-4">
          <a href="/" className="hover:text-blue-300">Play</a>
          <a href="/stats" className="hover:text-blue-300">Stats</a>
          <a href="/login" className="hover:text-blue-300">Login</a>
        </div>
      </div>
    </nav>
  );
};
