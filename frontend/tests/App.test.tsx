import { describe, it, expect } from "vitest";
// import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "../src/home";

// Mock component to avoid router issues in tests
const AppWithRouter = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

describe("App", () => {
  it("renders without crashing", () => {
    render(<AppWithRouter />);
    expect(document.body).toBeDefined();
  });
});
