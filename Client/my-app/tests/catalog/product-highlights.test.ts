import { describe, expect, it } from "vitest";
import { getProductHighlights } from "@/lib/product-highlights";

const product = (category: string, specs: Record<string, string>) => ({
  category,
  specifications: Object.entries(specs).map(([key, value]) => ({ key, value })),
});

describe("shopping highlights from published specifications", () => {
  it("prioritizes GPU memory aliases independently of API field order", () => {
    expect(
      getProductHighlights(
        product("Graphics Cards", {
          Memory: "12 GB",
          boost_clock: "2.5 GHz",
          vRaM: "12 GB GDDR6X",
          "Graphics Processor": "RTX 4070",
          Power: "200 W",
        }),
      ),
    ).toEqual([
      { label: "Memory", value: "12 GB GDDR6X" },
      { label: "Chipset", value: "RTX 4070" },
      { label: "Boost clock", value: "2.5 GHz" },
    ]);
  });

  it("puts monitor resolution and refresh rate before decorative details", () => {
    expect(
      getProductHighlights(
        product("MONITORS", {
          Lighting: "RGB",
          Panel: "IPS",
          Size: "27 inch",
          "Refresh-rate": "165 Hz",
          native_resolution: "2560 x 1440",
        }),
      ),
    ).toEqual([
      { label: "Resolution", value: "2560 x 1440" },
      { label: "Refresh", value: "165 Hz" },
      { label: "Screen", value: "27 inch" },
    ]);
  });

  it("uses CPU facts without inventing an absent socket", () => {
    expect(
      getProductHighlights(
        product("Processors", {
          Threads: "24",
          "Core Count": "16",
          "Base Clock": "3.4 GHz",
        }),
      ),
    ).toEqual([
      { label: "Cores", value: "16" },
      { label: "Threads", value: "24" },
      { label: "Base clock", value: "3.4 GHz" },
    ]);
  });

  it("selects RAM capacity, generation and speed with category-specific labels", () => {
    expect(
      getProductHighlights(
        product("Memory", {
          Latency: "CL30",
          "Memory Speed": "6000 MT/s",
          "DDR Generation": "DDR5",
          "Total Capacity": "32 GB (2 x 16 GB)",
        }),
      ),
    ).toEqual([
      { label: "Capacity", value: "32 GB (2 x 16 GB)" },
      { label: "Generation", value: "DDR5" },
      { label: "Speed", value: "6000 MT/s" },
    ]);
  });

  it("recognizes broad peripheral records by actual specification keys", () => {
    expect(
      getProductHighlights(
        product("Peripherals", {
          "Polling Rate": "8000 Hz",
          Layout: "TKL",
          Connection: "USB-C",
          "Switch Type": "Optical",
        }),
      ),
    ).toEqual([
      { label: "Switches", value: "Optical" },
      { label: "Layout", value: "TKL" },
      { label: "Connection", value: "USB-C" },
    ]);
  });

  it("returns only useful known facts when category metadata is sparse", () => {
    expect(
      getProductHighlights(
        product("GPU", {
          Warranty: "1 year",
          VRAM: "N/A",
          Power: "200 W",
          "Boost Clock": "  ",
        }),
      ),
    ).toEqual([{ label: "Power", value: "200 W" }]);
    expect(getProductHighlights({ category: "GPU" })).toEqual([]);
  });

  it("deduplicates repeated unknown-category fields and values", () => {
    expect(
      getProductHighlights(
        product("Accessories", {
          Connection: "USB-C",
          connection: "Bluetooth",
          Interface: "USB-C",
          Color: "Black",
          Length: "2 m",
        }),
      ),
    ).toEqual([
      { label: "Connection", value: "USB-C" },
      { label: "Color", value: "Black" },
      { label: "Length", value: "2 m" },
    ]);
  });

  it("keeps full published values for storage and power supplies", () => {
    expect(
      getProductHighlights(
        product("SSD", {
          "Write Speed": "5100 MB/s",
          "Read Speed": "7000 MB/s",
          Capacity: "2 TB",
          Interface: "PCIe 4.0 x4",
        }),
      ),
    ).toEqual([
      { label: "Capacity", value: "2 TB" },
      { label: "Interface", value: "PCIe 4.0 x4" },
      { label: "Read speed", value: "7000 MB/s" },
    ]);
    expect(
      getProductHighlights(
        product("Power Supplies", {
          Wattage: "850 W",
          Efficiency: "80+ Gold",
          Modular: "Fully",
        }),
      ),
    ).toEqual([
      { label: "Output", value: "850 W" },
      { label: "Efficiency", value: "80+ Gold" },
      { label: "Cables", value: "Fully" },
    ]);
  });

  it("allows a shorter summary without changing decision priorities", () => {
    const cpu = product("CPU", {
      Cores: "8",
      Socket: "AM5",
      "Boost Clock": "5.4 GHz",
    });
    expect(getProductHighlights(cpu, 2)).toEqual([
      { label: "Cores", value: "8" },
      { label: "Socket", value: "AM5" },
    ]);
    expect(getProductHighlights(cpu, 0)).toEqual([]);
  });
});
