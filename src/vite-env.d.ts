/// <reference types="vite/client" />

interface ImportMetaGlob {
  [key: string]: {
    [key: string]: any;
  };
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
} 