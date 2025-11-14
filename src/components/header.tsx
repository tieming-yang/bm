"use client";

import React from "react";
import Logo from "./logo";
import { Breadcrumb } from "./breadcrumb";

type Props = {};

export default function Header({}: Props) {
  return (
    <header className="fixed z-100 flex justify-center items-start pt-1 w-full h-fit">
      <div className="fixed left-3">
        <Logo />
      </div>
      <Breadcrumb />
    </header>
  );
}
