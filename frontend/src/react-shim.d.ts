declare namespace React {
  type ReactNode = any;
  type ReactElement = any;
  type CSSProperties = Record<string, string | number | undefined>;
  type DependencyList = readonly unknown[];
  type SetStateAction<S> = S | ((prevState: S) => S);
  type Dispatch<A> = (value: A) => void;
  type RefObject<T> = { current: T };
  interface DragEvent<T = any> extends SyntheticEvent<T> {
    dataTransfer: any;
  }

  interface SyntheticEvent<T = any> {
    target: T;
    currentTarget: T;
    preventDefault(): void;
    stopPropagation(): void;
  }

  interface FormEvent<T = any> extends SyntheticEvent<T> {}
  interface ChangeEvent<T = any> extends SyntheticEvent<T> {}

  interface Context<T> {
    Provider: any;
    Consumer: any;
    _currentValue?: T;
  }

  function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  function useEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  function useMemo<T = any>(factory: () => any, deps?: DependencyList): any;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: DependencyList): T;
  function useRef<T>(initialValue: T): RefObject<T>;
  function useRef<T>(initialValue: T | null): RefObject<T | null>;
  function useRef<T = undefined>(): RefObject<T | undefined>;
  function createContext<T>(defaultValue: T): Context<T>;
  function useContext<T>(context: Context<T>): T;

  const StrictMode: any;
  const Fragment: any;
}

declare module "react" {
  export = React;
}

declare module "react/jsx-runtime" {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare module "react/jsx-dev-runtime" {
  export const Fragment: any;
  export function jsxDEV(
    type: any,
    props: any,
    key: any,
    isStaticChildren: boolean,
    source: any,
    self: any
  ): any;
}

declare namespace JSX {
  interface Element {}

  interface CommonProps {
    children?: any;
    className?: string;
    style?: React.CSSProperties;
    onClick?: (event: any) => void;
    onSubmit?: (event: React.FormEvent<any>) => void;
    onChange?: (event: React.ChangeEvent<any>) => void;
    [propName: string]: any;
  }

  interface IntrinsicElements {
    [elemName: string]: CommonProps;
  }
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: any): void;
    unmount(): void;
  };
}
