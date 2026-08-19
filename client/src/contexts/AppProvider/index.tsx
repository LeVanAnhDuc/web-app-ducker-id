"use client";
// types
import type { PropsWithChildren } from "react";
// contexts
import ReactQueryProvider from "../ReactQueryProvider";
import ThemeProvider from "../ThemeProvider";
import LazyMotionProvider from "../LazyMotionProvider";

const AppProvider = ({ children }: PropsWithChildren) => {
  const Provider = [ReactQueryProvider, ThemeProvider, LazyMotionProvider];

  return Provider.reduceRight(
    (acc, Provider) => <Provider>{acc}</Provider>,
    children
  );
};

export default AppProvider;
