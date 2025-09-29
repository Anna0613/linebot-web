interface LoaderProps {
  fullPage?: boolean;
  text?: string;
  web3Style?: boolean;
}

export function Loader({ fullPage = false, text, web3Style = true }: LoaderProps) {
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

  const web3LoaderContent = (
    <div className="web3-loader-container">
      {loaderContent}
      {text && <div className="web3-loader-text">{text}</div>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="loading-overlay">
        {web3Style ? web3LoaderContent : loaderContent}
      </div>
    );
  }

  return (
    <div className="button-loader">
      {web3Style ? web3LoaderContent : loaderContent}
    </div>
  );
}
