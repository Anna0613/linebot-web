interface LoaderProps {
  fullPage?: boolean;
}

export function Loader({ fullPage = false }: LoaderProps) {
  const loaderContent = (
    <div className="loader">
      <div className="cell d-1"></div>
      <div className="cell d-2"></div>
      <div className="cell d-3"></div>
      <div className="cell d-4"></div>
      <div className="cell"></div>
      <div className="cell"></div>
      <div className="cell"></div>
      <div className="cell"></div>
      <div className="cell"></div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="loading-overlay">
        {loaderContent}
      </div>
    );
  }

  return (
    <div className="button-loader">
      {loaderContent}
    </div>
  );
}
