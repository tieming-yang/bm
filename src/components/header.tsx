"use client";

import React from "react";
import Logo from "./logo";

type Props = {};

export default function Header({}: Props) {
  return (
    <section className="absolute z-50 flex items-center w-full pt-3 pl-3 h-fit">
      <Logo />
    </section>
  );
}
