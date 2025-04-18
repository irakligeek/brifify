export default function Footer() {
  return (
    <footer className="bg-gray-800 py-4">
      <div className="max-w-screen-lg mx-auto px-4 text-center text-white">
        <p>&copy; {new Date().getFullYear()} All rights reserved</p>
      </div>
    </footer>
  );
}
