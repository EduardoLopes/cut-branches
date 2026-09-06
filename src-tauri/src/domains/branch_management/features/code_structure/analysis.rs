//! tree-sitter extraction of imports and symbol definitions.
//!
//! One grammar per language family: TypeScript (also covering TSX and the
//! script blocks of Svelte files) and JavaScript. Svelte files are handled
//! WITHOUT a Svelte grammar: a small quote-aware scanner extracts the
//! `<script>` blocks, each block is parsed with the TypeScript grammar, and
//! all line numbers are offset back to file coordinates. Every Svelte file
//! additionally contributes one synthetic whole-file `Component` symbol so a
//! template-only change still reports "component X changed".

use std::collections::HashSet;
use std::sync::OnceLock;

use streaming_iterator::StreamingIterator;
use tree_sitter::{Language, Node, Parser, Query, QueryCursor};

use super::models::{StructureLanguage, SymbolKind};

/// A definition found in the source, in 1-based file line coordinates.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SymbolDef {
    pub name: String,
    pub kind: SymbolKind,
    pub start_line: u32,
    pub end_line: u32,
}

/// One local name a static `import` statement introduces, tied back to its
/// specifier. Dynamic `import()`, `require()`, and re-exports introduce no
/// local names, so they produce no bindings.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportBinding {
    pub specifier: String,
    /// Name as usable in the file body (alias when `as` is used).
    pub local: String,
    /// Human name of what's used from the target: the original exported name
    /// for named imports; the local name for default and namespace imports.
    pub label: String,
}

/// The raw parse result of one file: definitions plus import specifiers
/// (as written, unresolved), the local bindings those imports introduce, and
/// every identifier referenced outside import statements.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct ParsedFile {
    pub symbols: Vec<SymbolDef>,
    pub imports: Vec<String>,
    pub bindings: Vec<ImportBinding>,
    /// Identifier texts referenced anywhere outside import statements — what
    /// tells an imported-and-used binding from an imported-but-unused one.
    pub used_names: HashSet<String>,
}

/// Maps a repo-relative path to the grammar that parses it.
pub fn detect_language(path: &str) -> StructureLanguage {
    let extension = path.rsplit('.').next().unwrap_or_default();
    match extension {
        "ts" | "tsx" | "mts" | "cts" => StructureLanguage::Typescript,
        "js" | "jsx" | "mjs" | "cjs" => StructureLanguage::Javascript,
        "svelte" => StructureLanguage::Svelte,
        _ => StructureLanguage::Unknown,
    }
}

/// Whether the TSX variant of the TypeScript grammar is needed.
fn is_tsx(path: &str) -> bool {
    path.ends_with(".tsx") || path.ends_with(".jsx")
}

/// Parses a file's source. Returns `None` for unknown languages; parse
/// failures inside a known language yield an empty `ParsedFile` for Svelte
/// (the synthetic component symbol still applies) and `None` otherwise.
pub fn parse_source(path: &str, language: StructureLanguage, source: &str) -> Option<ParsedFile> {
    match language {
        StructureLanguage::Unknown => None,
        StructureLanguage::Svelte => Some(parse_svelte(path, source)),
        StructureLanguage::Typescript | StructureLanguage::Javascript => {
            parse_block(language, is_tsx(path), source, 0)
        }
    }
}

// --- Svelte ------------------------------------------------------------------

fn parse_svelte(path: &str, source: &str) -> ParsedFile {
    let mut parsed = ParsedFile::default();

    for block in extract_script_blocks(source) {
        // Svelte script blocks parse fine with the TS grammar whether or not
        // they declare lang="ts" — plain JS is a TS subset for our queries.
        if let Some(mut inner) = parse_block(
            StructureLanguage::Typescript,
            false,
            block.content,
            block.line_offset,
        ) {
            parsed.symbols.append(&mut inner.symbols);
            parsed.imports.append(&mut inner.imports);
            parsed.bindings.append(&mut inner.bindings);
            parsed.used_names.extend(inner.used_names);
        }
    }

    // Synthetic whole-file component symbol: template-only changes still
    // report the component as changed.
    let stem = path
        .rsplit('/')
        .next()
        .unwrap_or(path)
        .trim_end_matches(".svelte");
    let total_lines = u32::try_from(source.lines().count().max(1)).unwrap_or(u32::MAX);
    parsed.symbols.push(SymbolDef {
        name: stem.to_string(),
        kind: SymbolKind::Component,
        start_line: 1,
        end_line: total_lines,
    });

    parsed
}

struct ScriptBlock<'a> {
    /// Lines before the block's content (added to every parsed line number).
    line_offset: u32,
    content: &'a str,
}

/// Extracts the content of every `<script …>…</script>` block. The open-tag
/// scan is quote-aware so a `>` inside an attribute value doesn't end the tag.
fn extract_script_blocks(source: &str) -> Vec<ScriptBlock<'_>> {
    let mut blocks = Vec::new();
    let mut cursor = 0;

    while let Some(open_at) = source[cursor..].find("<script") {
        let tag_start = cursor + open_at;
        let after_name = tag_start + "<script".len();
        // Only a real tag: `<script` must be followed by whitespace or `>`
        // (guards against e.g. `<scripted>` in markup).
        if !matches!(
            source[after_name..].chars().next(),
            Some(' ' | '\t' | '\n' | '\r' | '>')
        ) {
            cursor = after_name;
            continue;
        }
        let Some(content_start) = find_tag_end(source, after_name) else {
            break;
        };
        let Some(close_at) = source[content_start..].find("</script") else {
            break;
        };
        let content_end = content_start + close_at;

        let line_offset =
            u32::try_from(source[..content_start].matches('\n').count()).unwrap_or(u32::MAX);
        blocks.push(ScriptBlock {
            line_offset,
            content: &source[content_start..content_end],
        });
        cursor = content_end + "</script".len();
    }

    blocks
}

/// Index just past the `>` that closes an open tag, skipping quoted
/// attribute values. `None` when the tag never closes.
fn find_tag_end(source: &str, from: usize) -> Option<usize> {
    let mut quote: Option<char> = None;
    for (i, ch) in source[from..].char_indices() {
        match (quote, ch) {
            (Some(q), c) if c == q => quote = None,
            (Some(_), _) => {}
            (None, '"' | '\'') => quote = Some(ch),
            (None, '>') => return Some(from + i + 1),
            (None, _) => {}
        }
    }
    None
}

// --- tree-sitter -------------------------------------------------------------

/// Capture names shared by both language queries. The query text differs per
/// grammar only where node names differ (class names are `type_identifier`
/// in TypeScript, `identifier` in JavaScript).
fn query_text(class_name_node: &str) -> String {
    format!(
        r#"
        (import_statement source: (string (string_fragment) @import.source))
        (export_statement source: (string (string_fragment) @import.source))
        (call_expression
          function: (import)
          arguments: (arguments (string (string_fragment) @import.source)))
        (call_expression
          function: (identifier) @require.fn
          arguments: (arguments . (string (string_fragment) @require.source) .))
        (function_declaration name: (identifier) @func.name) @func.def
        (generator_function_declaration name: (identifier) @func.name) @func.def
        (class_declaration name: ({class_name_node}) @class.name) @class.def
        (method_definition name: (property_identifier) @method.name) @method.def
        (lexical_declaration
          (variable_declarator
            name: (identifier) @arrow.name
            value: [(arrow_function) (function_expression)])) @arrow.def
        (variable_declaration
          (variable_declarator
            name: (identifier) @arrow.name
            value: [(arrow_function) (function_expression)])) @arrow.def
        "#
    )
}

struct Grammar {
    language: Language,
    query: Query,
}

fn typescript_grammar() -> &'static Grammar {
    static GRAMMAR: OnceLock<Grammar> = OnceLock::new();
    GRAMMAR.get_or_init(|| {
        let language: Language = tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into();
        let query = Query::new(&language, &query_text("type_identifier"))
            .expect("TypeScript structure query must compile");
        Grammar { language, query }
    })
}

fn tsx_grammar() -> &'static Grammar {
    static GRAMMAR: OnceLock<Grammar> = OnceLock::new();
    GRAMMAR.get_or_init(|| {
        let language: Language = tree_sitter_typescript::LANGUAGE_TSX.into();
        let query = Query::new(&language, &query_text("type_identifier"))
            .expect("TSX structure query must compile");
        Grammar { language, query }
    })
}

fn javascript_grammar() -> &'static Grammar {
    static GRAMMAR: OnceLock<Grammar> = OnceLock::new();
    GRAMMAR.get_or_init(|| {
        let language: Language = tree_sitter_javascript::LANGUAGE.into();
        let query = Query::new(&language, &query_text("identifier"))
            .expect("JavaScript structure query must compile");
        Grammar { language, query }
    })
}

fn grammar_for(language: StructureLanguage, tsx: bool) -> &'static Grammar {
    match (language, tsx) {
        (StructureLanguage::Javascript, _) => javascript_grammar(),
        (_, true) => tsx_grammar(),
        (_, false) => typescript_grammar(),
    }
}

/// Parses one source block with the given grammar, offsetting every line
/// number by `line_offset` (used for Svelte script blocks).
fn parse_block(
    language: StructureLanguage,
    tsx: bool,
    source: &str,
    line_offset: u32,
) -> Option<ParsedFile> {
    let grammar = grammar_for(language, tsx);

    let mut parser = Parser::new();
    parser.set_language(&grammar.language).ok()?;
    let tree = parser.parse(source, None)?;

    let mut parsed = ParsedFile::default();
    let bytes = source.as_bytes();
    let mut cursor = QueryCursor::new();
    let mut matches = cursor.matches(&grammar.query, tree.root_node(), bytes);

    while let Some(matched) = matches.next() {
        let text = |index: u32| {
            matched
                .captures()
                .iter()
                .find(|c| c.index == index)
                .and_then(|c| c.node.utf8_text(bytes).ok())
        };
        let node = |index: u32| {
            matched
                .captures()
                .iter()
                .find(|c| c.index == index)
                .map(|c| c.node)
        };
        let capture_index = |name: &str| grammar.query.capture_index_for_name(name);

        if let Some(source_index) = capture_index("import.source") {
            if let Some(specifier) = text(source_index) {
                parsed.imports.push(specifier.to_string());
                continue;
            }
        }
        // `require("x")` is a plain call in the grammar — keep it only when
        // the callee really is `require` (checked here because the Rust
        // bindings don't evaluate `#eq?` predicates).
        if let (Some(fn_index), Some(source_index)) =
            (capture_index("require.fn"), capture_index("require.source"))
        {
            if text(fn_index) == Some("require") {
                if let Some(specifier) = text(source_index) {
                    parsed.imports.push(specifier.to_string());
                }
                continue;
            }
            if node(fn_index).is_some() {
                continue;
            }
        }

        for (name_capture, def_capture, kind) in [
            ("func.name", "func.def", SymbolKind::Function),
            ("class.name", "class.def", SymbolKind::Class),
            ("method.name", "method.def", SymbolKind::Method),
            ("arrow.name", "arrow.def", SymbolKind::Function),
        ] {
            let (Some(name_index), Some(def_index)) =
                (capture_index(name_capture), capture_index(def_capture))
            else {
                continue;
            };
            if let (Some(name), Some(def_node)) = (text(name_index), node(def_index)) {
                let start = u32::try_from(def_node.start_position().row).unwrap_or(u32::MAX);
                let end = u32::try_from(def_node.end_position().row).unwrap_or(u32::MAX);
                parsed.symbols.push(SymbolDef {
                    name: name.to_string(),
                    kind,
                    start_line: start.saturating_add(1).saturating_add(line_offset),
                    end_line: end.saturating_add(1).saturating_add(line_offset),
                });
                break;
            }
        }
    }

    collect_bindings_and_usage(tree.root_node(), bytes, &mut parsed);

    parsed.symbols.sort_by_key(|s| (s.start_line, s.end_line));
    Some(parsed)
}

/// One iterative pass over the whole tree (shared node names across the TS,
/// TSX, and JS grammars): `import_statement` nodes yield bindings and are not
/// descended into, so the identifiers they declare never count as usage;
/// every other `(identifier)` records a used name.
fn collect_bindings_and_usage(root: Node<'_>, bytes: &[u8], parsed: &mut ParsedFile) {
    let mut stack = vec![root];
    while let Some(node) = stack.pop() {
        // Skip error-recovery subtrees: tokens tree-sitter salvaged from
        // unparseable input aren't reliable usage evidence.
        if node.is_error() {
            continue;
        }
        if node.kind() == "import_statement" {
            collect_import_bindings(node, bytes, parsed);
            continue;
        }
        if node.kind() == "identifier" {
            if let Ok(text) = node.utf8_text(bytes) {
                parsed.used_names.insert(text.to_string());
            }
            continue;
        }
        // Reversed push keeps source order, so bindings stay in file order.
        for i in (0..node.child_count()).rev() {
            if let Some(child) = node.child(i) {
                stack.push(child);
            }
        }
    }
}

/// The bindings of one static `import` statement. Handles default,
/// namespace, named (with `as` aliases), mixed clauses, and type-only
/// imports; bare `import './x'` has no clause and yields nothing.
fn collect_import_bindings(statement: Node<'_>, bytes: &[u8], parsed: &mut ParsedFile) {
    let text = |node: Node<'_>| node.utf8_text(bytes).ok().map(str::to_string);
    let Some(specifier) = statement
        .child_by_field_name("source")
        .and_then(|source| named_child_of_kind(source, "string_fragment"))
        .and_then(text)
    else {
        return;
    };
    let Some(clause) = named_child_of_kind(statement, "import_clause") else {
        return;
    };

    let mut push = |local: Option<String>, label: Option<String>| {
        if let (Some(local), Some(label)) = (local, label) {
            parsed.bindings.push(ImportBinding {
                specifier: specifier.clone(),
                local,
                label,
            });
        }
    };

    let mut cursor = clause.walk();
    for part in clause.named_children(&mut cursor) {
        match part.kind() {
            // Default import: the local name doubles as the label.
            "identifier" => push(text(part), text(part)),
            // `* as ns` — same: the namespace object IS what's used.
            "namespace_import" => {
                let ns = named_child_of_kind(part, "identifier").and_then(text);
                push(ns.clone(), ns);
            }
            "named_imports" => {
                let mut names = part.walk();
                for spec in part.named_children(&mut names) {
                    if spec.kind() != "import_specifier" {
                        continue;
                    }
                    let name = spec.child_by_field_name("name").and_then(text);
                    let alias = spec.child_by_field_name("alias").and_then(text);
                    push(alias.or_else(|| name.clone()), name);
                }
            }
            _ => {}
        }
    }
}

/// The first named child of `node` with the given kind.
fn named_child_of_kind<'tree>(node: Node<'tree>, kind: &str) -> Option<Node<'tree>> {
    (0..node.named_child_count())
        .filter_map(|i| node.named_child(i as u32))
        .find(|child| child.kind() == kind)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn names(parsed: &ParsedFile) -> Vec<(&str, SymbolKind)> {
        parsed
            .symbols
            .iter()
            .map(|s| (s.name.as_str(), s.kind))
            .collect()
    }

    #[test]
    fn detects_languages_by_extension() {
        assert_eq!(detect_language("src/a.ts"), StructureLanguage::Typescript);
        assert_eq!(detect_language("src/a.tsx"), StructureLanguage::Typescript);
        assert_eq!(detect_language("src/a.js"), StructureLanguage::Javascript);
        assert_eq!(detect_language("src/a.cjs"), StructureLanguage::Javascript);
        assert_eq!(detect_language("src/a.svelte"), StructureLanguage::Svelte);
        assert_eq!(detect_language("Cargo.toml"), StructureLanguage::Unknown);
        assert_eq!(detect_language("Makefile"), StructureLanguage::Unknown);
    }

    #[test]
    fn extracts_typescript_imports_of_every_flavor() {
        let source = r#"
import { a } from './a';
import type { B } from '$ui/b';
export { c } from '../c';
const lazy = await import('./lazy');
const legacy = require('./legacy');
const notImport = somethingElse('./nope');
"#;
        let parsed = parse_source("src/x.ts", StructureLanguage::Typescript, source).unwrap();
        assert_eq!(
            parsed.imports,
            vec!["./a", "$ui/b", "../c", "./lazy", "./legacy"]
        );
    }

    #[test]
    fn extracts_typescript_definitions_with_line_ranges() {
        let source = "function top() {\n  return 1;\n}\nclass Box {\n  open() {\n    return 2;\n  }\n}\nconst arrow = () => 3;\nconst plain = 4;\n";
        let parsed = parse_source("src/x.ts", StructureLanguage::Typescript, source).unwrap();

        assert_eq!(
            names(&parsed),
            vec![
                ("top", SymbolKind::Function),
                ("Box", SymbolKind::Class),
                ("open", SymbolKind::Method),
                ("arrow", SymbolKind::Function),
            ]
        );
        let top = &parsed.symbols[0];
        assert_eq!((top.start_line, top.end_line), (1, 3));
        let open = &parsed.symbols[2];
        assert_eq!((open.start_line, open.end_line), (5, 7));
    }

    #[test]
    fn parses_javascript_classes_and_tsx_files() {
        let js = "class Legacy {}\nconst f = function () {};\n";
        let parsed = parse_source("src/x.js", StructureLanguage::Javascript, js).unwrap();
        assert_eq!(
            names(&parsed),
            vec![("Legacy", SymbolKind::Class), ("f", SymbolKind::Function)]
        );

        let tsx = "export function App() {\n  return <div>{'x'}</div>;\n}\n";
        let parsed = parse_source("src/app.tsx", StructureLanguage::Typescript, tsx).unwrap();
        assert_eq!(names(&parsed), vec![("App", SymbolKind::Function)]);
    }

    #[test]
    fn parses_svelte_script_blocks_with_file_line_offsets() {
        let source = "<script lang=\"ts\" generics=\"T extends '>'\">\n\timport { x } from './x';\n\tfunction handle() {\n\t\treturn x;\n\t}\n</script>\n\n<div>{handle()}</div>\n";
        let parsed =
            parse_source("src/file-node.svelte", StructureLanguage::Svelte, source).unwrap();

        assert_eq!(parsed.imports, vec!["./x"]);
        let handle = parsed.symbols.iter().find(|s| s.name == "handle").unwrap();
        // The function starts on file line 3 (offset past the open tag).
        assert_eq!((handle.start_line, handle.end_line), (3, 5));
        let component = parsed
            .symbols
            .iter()
            .find(|s| s.name == "file-node")
            .unwrap();
        assert_eq!(component.kind, SymbolKind::Component);
        assert_eq!(component.start_line, 1);
        assert!(component.end_line >= 8);
    }

    #[test]
    fn svelte_module_and_instance_blocks_both_parse() {
        let source = "<script module>\n\texport const shared = () => 1;\n</script>\n<script>\n\timport { y } from '$utils/y';\n</script>\n<p>hi</p>\n";
        let parsed = parse_source("src/two.svelte", StructureLanguage::Svelte, source).unwrap();

        assert_eq!(parsed.imports, vec!["$utils/y"]);
        let shared = parsed.symbols.iter().find(|s| s.name == "shared").unwrap();
        assert_eq!((shared.start_line, shared.end_line), (2, 2));
    }

    #[test]
    fn svelte_without_scripts_still_reports_the_component() {
        let parsed = parse_source(
            "cards/badge.svelte",
            StructureLanguage::Svelte,
            "<p>static</p>\n",
        )
        .unwrap();
        assert_eq!(names(&parsed), vec![("badge", SymbolKind::Component)]);
    }

    #[test]
    fn unclosed_script_tags_are_ignored() {
        let source = "<script\n"; // never closes
        let parsed = parse_source("x.svelte", StructureLanguage::Svelte, source).unwrap();
        assert_eq!(parsed.imports, Vec::<String>::new());
        assert_eq!(parsed.symbols.len(), 1); // just the synthetic component

        let source = "<script>const a = () => 1;"; // no </script>
        let parsed = parse_source("x.svelte", StructureLanguage::Svelte, source).unwrap();
        assert_eq!(parsed.symbols.len(), 1);
    }

    #[test]
    fn script_like_tags_are_not_treated_as_script_blocks() {
        // `<scripted>` in the template must not open a block; the real
        // script block after it still parses.
        let source = "<scripted>nope</scripted>\n<script>\nconst real = () => 1;\n</script>\n";
        let parsed = parse_source("x.svelte", StructureLanguage::Svelte, source).unwrap();
        let real = parsed.symbols.iter().find(|s| s.name == "real").unwrap();
        assert_eq!(real.start_line, 3);
    }

    fn binding(specifier: &str, local: &str, label: &str) -> ImportBinding {
        ImportBinding {
            specifier: specifier.to_string(),
            local: local.to_string(),
            label: label.to_string(),
        }
    }

    #[test]
    fn extracts_import_bindings_of_every_flavor() {
        let source = r#"
import { alpha } from './b';
import { beta as b } from './b';
import def, { gamma } from './c';
import * as ns from './d';
import type { T } from './t';
export const run = () => alpha() + b() + def + ns.x + gamma;
"#;
        let parsed = parse_source("src/x.ts", StructureLanguage::Typescript, source).unwrap();
        assert_eq!(
            parsed.bindings,
            vec![
                binding("./b", "alpha", "alpha"),
                binding("./b", "b", "beta"),
                binding("./c", "def", "def"),
                binding("./c", "gamma", "gamma"),
                binding("./d", "ns", "ns"),
                binding("./t", "T", "T"),
            ]
        );
        for used in ["alpha", "b", "def", "gamma", "ns", "run"] {
            assert!(parsed.used_names.contains(used), "{used} should be used");
        }
    }

    #[test]
    fn unused_imports_do_not_appear_in_used_names() {
        let source = "import { alpha } from './b';\nimport { omega } from './b';\nexport const run = () => alpha();\n";
        let parsed = parse_source("src/x.ts", StructureLanguage::Typescript, source).unwrap();
        assert_eq!(
            parsed.bindings,
            vec![
                binding("./b", "alpha", "alpha"),
                binding("./b", "omega", "omega")
            ]
        );
        assert!(parsed.used_names.contains("alpha"));
        // Declared only in the import statement — never referenced in the body.
        assert!(!parsed.used_names.contains("omega"));
    }

    #[test]
    fn aliased_imports_bind_the_alias_but_keep_the_original_label() {
        let source = "import { alpha as a } from './b';\nexport const run = () => a();\n";
        let parsed = parse_source("src/x.ts", StructureLanguage::Typescript, source).unwrap();
        assert_eq!(parsed.bindings, vec![binding("./b", "a", "alpha")]);
        assert!(parsed.used_names.contains("a"));
        assert!(!parsed.used_names.contains("alpha"));
    }

    #[test]
    fn dynamic_imports_and_reexports_produce_no_bindings() {
        let source = "export { c } from '../c';\nconst lazy = await import('./lazy');\nconst legacy = require('./legacy');\n";
        let parsed = parse_source("src/x.ts", StructureLanguage::Typescript, source).unwrap();
        // The specifiers still count as imports…
        assert_eq!(parsed.imports, vec!["../c", "./lazy", "./legacy"]);
        // …but none of them introduces a local binding.
        assert_eq!(parsed.bindings, Vec::<ImportBinding>::new());
    }

    #[test]
    fn javascript_files_extract_bindings_too() {
        let source =
            "import def from './a';\nimport { x as y } from './b';\nconsole.log(def, y);\n";
        let parsed = parse_source("src/x.js", StructureLanguage::Javascript, source).unwrap();
        assert_eq!(
            parsed.bindings,
            vec![binding("./a", "def", "def"), binding("./b", "y", "x")]
        );
        assert!(parsed.used_names.contains("def"));
        assert!(parsed.used_names.contains("y"));
    }

    #[test]
    fn svelte_scripts_contribute_bindings_and_used_names() {
        let source = "<script lang=\"ts\">\n\timport { x } from './x';\n\timport { dead } from './x';\n\tconst v = x();\n</script>\n\n<div>{v}</div>\n";
        let parsed = parse_source("src/w.svelte", StructureLanguage::Svelte, source).unwrap();
        assert_eq!(
            parsed.bindings,
            vec![binding("./x", "x", "x"), binding("./x", "dead", "dead")]
        );
        assert!(parsed.used_names.contains("x"));
        assert!(!parsed.used_names.contains("dead"));
    }

    #[test]
    fn garbage_input_degrades_gracefully() {
        // tree-sitter is error-tolerant: garbage parses to a tree with error
        // nodes and simply yields nothing.
        let parsed = parse_source("src/x.ts", StructureLanguage::Typescript, ")(*&^%$#@!").unwrap();
        assert_eq!(parsed, ParsedFile::default());
    }

    #[test]
    fn unknown_language_yields_none() {
        assert!(parse_source("README.md", StructureLanguage::Unknown, "# hi").is_none());
    }
}
