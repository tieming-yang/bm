import Link from "next/link";
import Image from "next/image";

type Props = {
  children?: React.ReactNode;
};

function Logo({ children }: Props) {
  return (
    <Link href="/" className="flex items-center">
      <Image src="/logos/logo.webp" alt="彼岸數位媒體" width={40} height={40} />
      {children}
    </Link>
  );
}

export default Logo;
