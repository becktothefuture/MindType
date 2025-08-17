import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders headline", () => {
    render(<App />);
    const headline = screen.getByText(/MindType Web Demo/i);
    expect(headline).toBeInTheDocument();
  });

  it("shows and toggles mode select (rules vs LM)", () => {
    render(<App />);
    const select = screen.getByLabelText("Mode") as HTMLSelectElement;
    expect(select.value).toBe("rules");
    fireEvent.change(select, { target: { value: "lm" } });
    expect(select.value).toBe("lm");
  });

  it("copies and imports presets without throwing", async () => {
    render(<App />);
    const copyBtn = screen.getByText(/Copy preset/i);
    fireEvent.click(copyBtn);
    // Mock prompt return for import
    const stub = { tickMs: 100, minBand: 2, maxBand: 6, useWasmDemo: false };
    const spy = vi.spyOn(window, "prompt").mockReturnValue(JSON.stringify(stub));
    const importBtn = screen.getByText(/Import preset/i);
    fireEvent.click(importBtn);
    spy.mockRestore();
  });

  it("loads a scenario and steps text forward", () => {
    render(<App />);
    const selector = screen.getByLabelText("Scenario") as HTMLSelectElement;
    // pick the first scenario
    fireEvent.change(selector, { target: { value: 'typos-basic' } });
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    // initial stepIndex 0 => empty string
    expect(textarea.value.length).toBe(0);
    const stepBtn = screen.getByText('Step');
    fireEvent.click(stepBtn);
    expect(textarea.value.length).toBe(1);
  });
});
