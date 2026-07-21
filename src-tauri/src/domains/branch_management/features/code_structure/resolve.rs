//! Import-specifier resolution against the changed-file set.
//!
//! Pure and filesystem-free: every candidate is matched against the set of
//! paths changed by the diff (the v1 scope only draws edges between changed
//! files), so resolution never needs a checkout. Three strategies, in order:
//! relative paths, tsconfig/jsconfig `paths` aliases (read from the target
//! git tree by the caller), and a conservative unique-suffix heuristic for
//! aliases that only exist in non-machine-readable config (e.g. SvelteKit's
//! `kit.alias`). Ambiguity always loses: a wrong edge is worse than a
//! missing one.

use std::collections::HashSet;

/// Extensions tried when a specifier omits one, in resolution order.
const EXTENSIONS: [&str; 7] = [".ts", ".tsx", ".js", ".jsx", ".svelte", ".mjs", ".cjs"];
/// Extensions tried for `folder` → `folder/index.*`.
const INDEX_EXTENSIONS: [&str; 4] = [".ts", ".tsx", ".js", ".jsx"];

/// Alias configuration extracted from the analyzed repo's own
/// tsconfig/jsconfig (`compilerOptions.baseUrl` + `paths`).
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct AliasMap {
    /// Repo-relative base for `paths` targets (tsconfig `baseUrl`, `.` when
    /// absent).
    pub base_url: String,
    /// `(pattern, targets)` pairs, e.g. `("$ui/*", ["src/ui/*"])`.
    pub paths: Vec<(String, Vec<String>)>,
}

/// Resolves one import to the repo-relative path of another changed file,
/// or `None` (package import, unchanged file, or ambiguous alias).
pub fn resolve_import(
    importer: &str,
    specifier: &str,
    changed: &HashSet<String>,
    aliases: &AliasMap,
) -> Option<String> {
    if specifier.starts_with("./") || specifier.starts_with("../") {
        let dir = importer.rsplit_once('/').map(|(d, _)| d).unwrap_or("");
        let joined = normalize(&format!("{dir}/{specifier}"))?;
        return first_changed_candidate(&joined, changed);
    }

    if let Some(resolved) = resolve_via_alias_paths(specifier, changed, aliases) {
        return Some(resolved);
    }

    resolve_via_unique_suffix(specifier, changed)
}

/// tsconfig `paths` expansion: match the specifier against each pattern
/// (single `*` wildcard or exact), substitute into each target, resolve
/// against `baseUrl`.
fn resolve_via_alias_paths(
    specifier: &str,
    changed: &HashSet<String>,
    aliases: &AliasMap,
) -> Option<String> {
    for (pattern, targets) in &aliases.paths {
        let matched_star = match pattern.split_once('*') {
            Some((prefix, suffix)) => {
                if specifier.len() >= prefix.len() + suffix.len()
                    && specifier.starts_with(prefix)
                    && specifier.ends_with(suffix)
                {
                    Some(&specifier[prefix.len()..specifier.len() - suffix.len()])
                } else {
                    None
                }
            }
            None => (specifier == pattern).then_some(""),
        };
        let Some(star) = matched_star else {
            continue;
        };

        for target in targets {
            let expanded = target.replacen('*', star, 1);
            let joined = normalize(&format!("{}/{}", aliases.base_url, expanded))?;
            if let Some(resolved) = first_changed_candidate(&joined, changed) {
                return Some(resolved);
            }
        }
    }
    None
}

/// Fallback for alias-shaped specifiers (`$x/…`, `@/…`, `~/…`) whose map is
/// unknown: match the part after the alias segment as a path suffix against
/// the changed set — accepted only when exactly ONE file matches.
fn resolve_via_unique_suffix(specifier: &str, changed: &HashSet<String>) -> Option<String> {
    let alias_shaped =
        specifier.starts_with('$') || specifier.starts_with("@/") || specifier.starts_with("~/");
    if !alias_shaped {
        return None;
    }
    let rest = match specifier.split_once('/') {
        Some((_, rest)) if !rest.is_empty() => rest,
        _ => return None,
    };

    // The candidate expansions depend only on the specifier — build them
    // (and their "/…" suffix forms) once, not per changed file.
    let rest_candidates = candidates(rest);
    let suffixes: Vec<String> = rest_candidates
        .iter()
        .map(|candidate| format!("/{candidate}"))
        .collect();
    let mut matches: Vec<&String> = changed
        .iter()
        .filter(|path| {
            suffixes.iter().any(|suffix| path.ends_with(suffix))
                || rest_candidates
                    .iter()
                    .any(|candidate| path.as_str() == candidate)
        })
        .collect();
    matches.sort();
    matches.dedup();
    match matches.as_slice() {
        [only] => Some((*only).clone()),
        _ => None,
    }
}

/// The first candidate expansion of `path` present in the changed set.
fn first_changed_candidate(path: &str, changed: &HashSet<String>) -> Option<String> {
    candidates(path)
        .into_iter()
        .find(|candidate| changed.contains(candidate))
}

/// All file paths a specifier path may denote: as-is, with each extension,
/// as a directory index, and with the TS `./foo.js` → `foo.ts` remap.
fn candidates(path: &str) -> Vec<String> {
    let mut out = vec![path.to_string()];
    for ext in EXTENSIONS {
        out.push(format!("{path}{ext}"));
    }
    for ext in INDEX_EXTENSIONS {
        out.push(format!("{path}/index{ext}"));
    }
    // TS convention: the specifier says `.js` but the file on disk is `.ts`.
    if let Some(stem) = path.strip_suffix(".js") {
        out.push(format!("{stem}.ts"));
        out.push(format!("{stem}.tsx"));
    }
    out.dedup();
    out
}

/// Lexically folds `.` and `..` segments. `None` when the path escapes the
/// repo root.
fn normalize(path: &str) -> Option<String> {
    let mut segments: Vec<&str> = Vec::new();
    for segment in path.split('/') {
        match segment {
            "" | "." => {}
            ".." => {
                segments.pop()?;
            }
            other => segments.push(other),
        }
    }
    Some(segments.join("/"))
}

// --- tsconfig extraction -------------------------------------------------------

/// Parses a tsconfig/jsconfig source into an [`AliasMap`], tolerating the
/// JSONC dialect (comments, trailing commas) tsconfig files habitually use.
/// Returns `None` when the file doesn't parse or has no `paths`.
pub fn parse_tsconfig_aliases(source: &str) -> Option<AliasMap> {
    let value: serde_json::Value = serde_json::from_str(&strip_jsonc(source)).ok()?;
    let compiler_options = value.get("compilerOptions")?;

    let base_url = compiler_options
        .get("baseUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(".")
        .trim_start_matches("./")
        .to_string();

    let mut paths = compiler_options
        .get("paths")?
        .as_object()?
        .iter()
        .filter_map(|(pattern, targets)| {
            let targets: Vec<String> = targets
                .as_array()?
                .iter()
                .filter_map(|t| Some(t.as_str()?.trim_start_matches("./").to_string()))
                .collect();
            (!targets.is_empty()).then(|| (pattern.clone(), targets))
        })
        .collect::<Vec<_>>();
    // Longest (most specific) pattern first, then lexicographic — matching
    // order is deterministic regardless of the JSON map's iteration order.
    paths.sort_by(|a, b| b.0.len().cmp(&a.0.len()).then_with(|| a.0.cmp(&b.0)));

    (!paths.is_empty()).then_some(AliasMap { base_url, paths })
}

/// Strips `//`/`/* */` comments and trailing commas — enough leniency for
/// real-world tsconfig files without a full JSONC parser. One string-aware
/// pass: a comma is dropped only when, still in code (whitespace and
/// comments allowed in between), the next meaningful character closes an
/// object or array — commas inside string literals are never touched.
fn strip_jsonc(source: &str) -> String {
    #[derive(PartialEq)]
    enum State {
        Code,
        InString,
        LineComment,
        BlockComment,
    }
    let mut out = String::with_capacity(source.len());
    let mut state = State::Code;
    // Byte index (in `out`) of a comma that may turn out to be trailing.
    let mut pending_comma: Option<usize> = None;
    let mut chars = source.chars().peekable();

    while let Some(ch) = chars.next() {
        match state {
            State::Code => match ch {
                '"' => {
                    pending_comma = None;
                    state = State::InString;
                    out.push(ch);
                }
                '/' if chars.peek() == Some(&'/') => {
                    chars.next();
                    state = State::LineComment;
                }
                '/' if chars.peek() == Some(&'*') => {
                    chars.next();
                    state = State::BlockComment;
                }
                ',' => {
                    out.push(ch);
                    pending_comma = Some(out.len() - 1);
                }
                '}' | ']' => {
                    if let Some(index) = pending_comma.take() {
                        out.remove(index);
                    }
                    out.push(ch);
                }
                c if c.is_whitespace() => out.push(c),
                _ => {
                    pending_comma = None;
                    out.push(ch);
                }
            },
            State::InString => {
                out.push(ch);
                if ch == '\\' {
                    if let Some(escaped) = chars.next() {
                        out.push(escaped);
                    }
                } else if ch == '"' {
                    state = State::Code;
                }
            }
            State::LineComment => {
                if ch == '\n' {
                    out.push(ch);
                    state = State::Code;
                }
            }
            State::BlockComment => {
                if ch == '*' && chars.peek() == Some(&'/') {
                    chars.next();
                    state = State::Code;
                }
            }
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn changed(paths: &[&str]) -> HashSet<String> {
        paths.iter().map(|p| (*p).to_string()).collect()
    }

    #[test]
    fn resolves_relative_imports_with_extension_and_index_expansion() {
        let set = changed(&["src/a/b.ts", "src/c/index.ts", "src/d.svelte"]);
        let aliases = AliasMap::default();

        assert_eq!(
            resolve_import("src/a/main.ts", "./b", &set, &aliases).as_deref(),
            Some("src/a/b.ts")
        );
        assert_eq!(
            resolve_import("src/a/main.ts", "../c", &set, &aliases).as_deref(),
            Some("src/c/index.ts")
        );
        assert_eq!(
            resolve_import("src/a/main.ts", "../d.svelte", &set, &aliases).as_deref(),
            Some("src/d.svelte")
        );
        assert_eq!(
            resolve_import("src/a/main.ts", "./missing", &set, &aliases),
            None
        );
    }

    #[test]
    fn remaps_ts_style_js_specifiers() {
        let set = changed(&["src/util.ts"]);
        assert_eq!(
            resolve_import("src/main.ts", "./util.js", &set, &AliasMap::default()).as_deref(),
            Some("src/util.ts")
        );
    }

    #[test]
    fn rejects_paths_escaping_the_repo_root() {
        let set = changed(&["evil.ts"]);
        assert_eq!(
            resolve_import("main.ts", "../../evil", &set, &AliasMap::default()),
            None
        );
    }

    #[test]
    fn resolves_tsconfig_path_aliases() {
        let set = changed(&["src/ui/button.ts", "src/core.ts"]);
        let aliases = AliasMap {
            base_url: String::new(),
            paths: vec![
                ("$ui/*".to_string(), vec!["src/ui/*".to_string()]),
                ("$core".to_string(), vec!["src/core".to_string()]),
            ],
        };

        assert_eq!(
            resolve_import("src/x.ts", "$ui/button", &set, &aliases).as_deref(),
            Some("src/ui/button.ts")
        );
        assert_eq!(
            resolve_import("src/x.ts", "$core", &set, &aliases).as_deref(),
            Some("src/core.ts")
        );
        assert_eq!(
            resolve_import("src/x.ts", "$ui/missing", &set, &aliases),
            None
        );
    }

    #[test]
    fn alias_paths_respect_base_url() {
        let set = changed(&["packages/app/src/ui/x.ts"]);
        let aliases = AliasMap {
            base_url: "packages/app".to_string(),
            paths: vec![("@/*".to_string(), vec!["src/*".to_string()])],
        };
        assert_eq!(
            resolve_import("packages/app/src/main.ts", "@/ui/x", &set, &aliases).as_deref(),
            Some("packages/app/src/ui/x.ts")
        );
    }

    #[test]
    fn suffix_heuristic_requires_a_unique_match() {
        let unique = changed(&["src/ui/patterns/diff-viewer/render-plan.ts", "src/other.ts"]);
        assert_eq!(
            resolve_import(
                "src/x.ts",
                "$ui/patterns/diff-viewer/render-plan",
                &unique,
                &AliasMap::default()
            )
            .as_deref(),
            Some("src/ui/patterns/diff-viewer/render-plan.ts")
        );

        // Two files share the suffix → ambiguous → no edge.
        let ambiguous = changed(&["src/a/lib/util.ts", "src/b/lib/util.ts"]);
        assert_eq!(
            resolve_import("src/x.ts", "$lib/util", &ambiguous, &AliasMap::default()),
            None
        );

        // Bare package names never match the heuristic.
        let set = changed(&["src/react.ts"]);
        assert_eq!(
            resolve_import("src/x.ts", "react", &set, &AliasMap::default()),
            None
        );
        assert_eq!(
            resolve_import("src/x.ts", "$alias", &set, &AliasMap::default()),
            None
        );
    }

    #[test]
    fn parses_tsconfig_with_jsonc_noise() {
        let source = r#"{
  // project config
  "compilerOptions": {
    "baseUrl": "./",
    /* aliases */
    "paths": {
      "$ui/*": ["./src/ui/*"],
      "$core": ["src/core"],
      "broken": "not-an-array",
    },
  },
}"#;
        let aliases = parse_tsconfig_aliases(source).unwrap();
        assert_eq!(aliases.base_url, "");
        assert_eq!(
            aliases.paths,
            vec![
                ("$core".to_string(), vec!["src/core".to_string()]),
                ("$ui/*".to_string(), vec!["src/ui/*".to_string()]),
            ]
        );
    }

    #[test]
    fn tsconfig_without_paths_or_invalid_json_yields_none() {
        assert_eq!(parse_tsconfig_aliases("{}"), None);
        assert_eq!(parse_tsconfig_aliases("{\"compilerOptions\":{}}"), None);
        assert_eq!(parse_tsconfig_aliases("not json at all"), None);
        assert_eq!(
            parse_tsconfig_aliases("{\"compilerOptions\":{\"paths\":{\"x\":[]}}}"),
            None
        );
    }

    #[test]
    fn commas_inside_strings_survive_trailing_comma_stripping() {
        // The trailing "," before ] is dropped; the "," inside the string
        // value (followed by whitespace and a bracket) is NOT.
        let source = "{\"compilerOptions\":{\"paths\":{\"a\":[\"src/x,\" ,]}}}";
        let aliases = parse_tsconfig_aliases(source).unwrap();
        assert_eq!(
            aliases.paths,
            vec![("a".to_string(), vec!["src/x,".to_string()])]
        );
    }

    #[test]
    fn comments_between_a_trailing_comma_and_its_bracket_still_strip_it() {
        let source = "{\"compilerOptions\":{\"paths\":{\"a\":[\"src/x\"], // done\n}}}";
        let aliases = parse_tsconfig_aliases(source).unwrap();
        assert_eq!(aliases.paths.len(), 1);
    }

    #[test]
    fn strings_with_escapes_and_slashes_survive_jsonc_stripping() {
        let source = r#"{"compilerOptions":{"baseUrl":".","paths":{"a/*":["src//a/*"],"q\"//x":["src/q"]}}}"#;
        let aliases = parse_tsconfig_aliases(source).unwrap();
        assert_eq!(aliases.paths.len(), 2);
    }
}
