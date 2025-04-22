import logoImage from '../../assets/logo.png';

export default function Logo() {
  return (
    <a href="/" className="!text-gray-900 hover:!text-gray-800 !font-bold tracking-wide flex items-center gap-2">
      <img src={logoImage} alt="Brifify Logo" className="h-8 w-auto" />
    </a>
  );
}
