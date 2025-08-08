import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders headline", () => {
    render(<App />);
    const headline = screen.getByText(/MindType Web Demo/i);
    expect(headline).toBeInTheDocument();
  });
});
