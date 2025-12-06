"use client";

import Logo from "./logo";
import { Breadcrumb } from "./breadcrumb";

type Props = {};

export default function Header({}: Props) {
  return (
    <header className="fixed flex items-start justify-center w-full pt-1 z-100 h-fit">
      <div className="fixed left-3">
        <Logo />
      </div>
      <Breadcrumb />
    </header>
  );
}
