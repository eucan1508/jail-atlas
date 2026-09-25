import { describe, expect, it } from "vitest";

import { CliArgumentError, parseCliArguments, parseLiveCliArguments } from "./cli-arguments.ts";
import { SYNTHETIC_SCOTT_ADAPTER_ID, SYNTHETIC_SCOTT_SOURCE_ID } from "./execution-guard.ts";

describe("parseCliArguments", () => {
  it("creates a closed synthetic execution request", () => {
    expect(parseCliArguments(["run", "--scenario=valid-empty", "--dry-run"])).toEqual({
      adapterId: SYNTHETIC_SCOTT_ADAPTER_ID,
      sourceId: SYNTHETIC_SCOTT_SOURCE_ID,
      scenario: "valid-empty",
      dryRun: true
    });
  });

  it.each([
    ["missing dry-run", ["run", "--scenario=current-custody"]],
    ["unknown command", ["live", "--scenario=current-custody", "--dry-run"]],
    ["unknown scenario", ["run", "--scenario=live", "--dry-run"]],
    ["unknown argument", ["run", "--scenario=current-custody", "--dry-run", "--write"]]
  ])("rejects %s", (_name, arguments_) => {
    expect(() => parseCliArguments(arguments_)).toThrow(CliArgumentError);
  });
});

describe("parseLiveCliArguments", () => {
  it("accepts an explicit live dry-run", () => {
    expect(parseLiveCliArguments(["run", "--dry-run"])).toEqual({ dryRun: true });
  });

  it("defaults live execution to a write-capable run", () => {
    expect(parseLiveCliArguments(["run"])).toEqual({ dryRun: false });
  });

  it("accepts a state batch request", () => {
    expect(parseLiveCliArguments(["run", "--state=ia", "--dry-run"])).toEqual({
      dryRun: true,
      state: "IA"
    });
  });

  it("accepts the separator pnpm passes to a package script", () => {
    expect(parseLiveCliArguments(["--", "run", "--state=IA", "--dry-run"])).toEqual({
      dryRun: true,
      state: "IA"
    });
  });

  it("rejects an unsupported state", () => {
    expect(() => parseLiveCliArguments(["run", "--state=TX", "--dry-run"])).toThrow(
      CliArgumentError
    );
  });
});
