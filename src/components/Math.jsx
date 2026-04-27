import katex from 'katex';

const KATEX_OPTIONS = {
  throwOnError: false,
  strict: 'ignore',
  output: 'html',
  trust: false,
  macros: {
    '\\R': '\\mathbb{R}',
    '\\given': '\\,|\\,',
  },
};

export function InlineMath({ children, math }) {
  const src = math ?? (typeof children === 'string' ? children : '');
  return (
    <span
      className="katex-inline"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(src, {
          ...KATEX_OPTIONS,
          displayMode: false,
        }),
      }}
    />
  );
}

export function BlockMath({ children, math }) {
  const src = math ?? (typeof children === 'string' ? children : '');
  return (
    <div
      className="katex-block"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(src, {
          ...KATEX_OPTIONS,
          displayMode: true,
        }),
      }}
    />
  );
}
