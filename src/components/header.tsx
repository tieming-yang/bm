"use client";

import React from "react";
import Logo from "./logo";

type Props = {};

export default function Header({}: Props) {
  return (
    <section className=" z-50 pt-3 pl-3 w-full absolute flex items-center">
      <Logo />
    </section>
  );
}
