/*
 * This file is part of email-forward-parser
 *
 * Copyright (c) 2026 Crisp IM SAS
 * All rights belong to Crisp IM SAS
 */

/**************************************************************************
 * IMPORTS
 ***************************************************************************/

// NPM
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import type RE2 from "re2";

/**************************************************************************
 * INSTANCES
 ***************************************************************************/

const RE2Engine: typeof RE2 | null = detectRE2();

/**************************************************************************
 * FUNCTIONS
 ***************************************************************************/

/**
 * Detects whether the RE2 engine is available
 */
function detectRE2(): typeof RE2 | null {
  // Notice: RE2 can be explicitly disabled, to test the RegExp fallback
  if (process.env.EMAIL_FORWARD_PARSER_DISABLE_RE2) {
    return null;
  }

  try {
    return (require("re2") as typeof RE2);
  } catch {
    return null;
  }
}

/**
 * Builds a safe regular expression (RE2 when available, RegExp otherwise)
 */
export function buildSafeRegExp(source: string | RegExp, flags?: string): RegExp {
  // Important: never pass an undefined 'flags', as RE2 would drop the flags
  if (RE2Engine !== null) {
    return (
      (flags === undefined)
        ? new RE2Engine(source as string)
        : new RE2Engine(source as string, flags)
    );
  }

  return (
    (flags === undefined) ? new RegExp(source) : new RegExp(source, flags)
  );
}

type LoopRegexesMode = "match" | "split" | "replace";
type LoopRegexesResult<Mode extends LoopRegexesMode> = (
  Mode extends "replace" ? string : RegExpMatchArray
);

/**
 * Executes a regular expression on a string, in the given mode
 */
function executeRegex(
  regex: RegExp, str: string, mode: LoopRegexesMode
): string | RegExpMatchArray | null {
  // Notice: call String methods, as they support both RE2 and RegExp
  switch (mode) {
    case "replace": {
      return str.replace(regex, "");
    }

    case "split": {
      return (str.split(regex) as RegExpMatchArray);
    }

    default: {
      return str.match(regex);
    }
  }
}

/**
 * Executes multiple regular expressions until one succeeds
 */
export function loopRegexes<Mode extends LoopRegexesMode = "match">(
  regexes: RegExp[], str: string, mode: Mode = ("match" as Mode), highestPosition: boolean = true
): LoopRegexesResult<Mode> {
  let match: string | RegExpMatchArray | null = null;

  const minLength = (mode === "split") ? 1 : 0;
  const maxLength = str.length;

  for (let i = 0; i < regexes.length; i++) {
    let regex = regexes[i];

    if (typeof regex === "string") {
      // Build the regex
      regex = buildSafeRegExp(regex);
    }

    const currentMatch = executeRegex(regex, (str || ""), mode);

    if (mode === "replace") {
      match = currentMatch;

      // A successfull replace must return a smaller string than the input
      if (match.length < maxLength) {
        break;
      }
    } else if (mode === "split" || mode === "match") {
      // A successfull split must return an array with at least two items
      if ((currentMatch?.length || 0) > minLength) {
        if (highestPosition === true) {
          // No previous match?
          if (!match) {
            // Save match and continue looking for other matches
            match = currentMatch;
          } else {
            let higher = false;

            if (mode === "match") {
              higher = (
                (match as RegExpMatchArray).index >
                  (currentMatch as RegExpMatchArray).index
              );
            } else if (mode === "split") {
              higher = match[0].length > currentMatch[0].length;
            }

            // Match positioned higher than previous one?
            if (higher) {
              // Replace match and continue looking for other matches
              match = currentMatch;
            }
          }
        } else {
          // Save match and stop
          match = currentMatch;

          break;
        }
      }
    }
  }

  return (
    (mode === "replace") ? (match || "") : (match || ([] as unknown as RegExpMatchArray))
  ) as LoopRegexesResult<Mode>;
}

/**
 * Reconciliates match substrings after a "split" operation
 */
export function reconciliateSplitMatch(
  match: string[],
  minSubstrings: number,
  defaultSubstrings: number[],
  fnExclude: ((index: number) => boolean) | null = null
): string {
  let currentString = "";

  // Add default substrings
  for (let i = 0; i < defaultSubstrings.length; i++) {
    currentString += match[defaultSubstrings[i]];
  }

  // More substrings than expected?
  if (match.length > minSubstrings) {
    // Reconciliate them
    for (let i = minSubstrings; i < match.length; i++) {
      let exclude = false;

      // Exclude the substring?
      if (typeof fnExclude === "function") {
        exclude = fnExclude(i);
      }

      if (exclude === false) {
        currentString += match[i];
      }
    }
  }

  return currentString;
}

/**
 * Trims a string
 */
export function trimString(str: string | null): string {
  return ((str || "").trim() || "");
}
