//! Use-case: analyze the code structure of a diff.
//!
//! One pass over the same tree-to-tree diff the review view already shows:
//! collect each changed file's changed-line set, read its target-side blob,
//! parse it (tree-sitter), keep the definitions the changed lines touch, and
//! resolve its imports against the changed-file set to produce the edges the
//! canvas draws. Everything degrades per-file (`parsed: false`); only git
//! failures are fatal.

use std::cell::RefCell;
use std::collections::{BTreeSet, HashSet};
use std::path::Path;

use git2::{Repository, Tree};

use super::analysis::{self, SymbolDef};
use super::models::{
    ChangedSymbol, FileImport, FileStructure, StructureEdge, StructureEdgeKind, StructureLanguage,
};
use super::resolve::{parse_tsconfig_aliases, resolve_import, AliasMap};
use crate::domains::branch_management::core::models::file_change_status::FileChangeStatus;
use crate::domains::branch_management::error::BranchError;
use crate::domains::branch_management::infrastructure::git::diff::{
    build_diff, delta_paths, map_status, open_repo, resolve_trees, DiffTarget,
};
use crate::shared::error::AppError;

/// Blobs past this size are not parsed (generated bundles, vendored code).
const MAX_PARSE_BYTES: usize = 1_500_000;

/// One changed file plus the new-side line numbers its hunks touch.
struct ChangedEntry {
    path: String,
    status: FileChangeStatus,
    is_binary: bool,
    changed_lines: BTreeSet<u32>,
    /// New-side position tracking so deletions land on the line they sit at.
    last_new_line: u32,
}

/// Analyzes the structure of every file changed by the target.
pub fn get_diff_structure(
    path: &Path,
    target: DiffTarget<'_>,
) -> Result<(Vec<FileStructure>, Vec<StructureEdge>), AppError> {
    let repo = open_repo(path)?;
    let (base_tree, target_tree) = resolve_trees(&repo, path, target)?;
    let entries = collect_changed_entries(&repo, base_tree.as_ref(), &target_tree, target)?;

    let changed_paths: HashSet<String> = entries.iter().map(|e| e.path.clone()).collect();
    let aliases = read_alias_map(&repo, &target_tree);

    let mut files = Vec::with_capacity(entries.len());
    let mut edges = Vec::new();

    for entry in &entries {
        let language = analysis::detect_language(&entry.path);
        let structure = analyze_entry(&repo, &target_tree, entry, language)
            .map(|parsed| {
                let imports = parsed
                    .imports
                    .iter()
                    .map(|specifier| FileImport {
                        specifier: specifier.clone(),
                        resolved_path: resolve_import(
                            &entry.path,
                            specifier,
                            &changed_paths,
                            &aliases,
                        )
                        .filter(|resolved| *resolved != entry.path),
                    })
                    .collect::<Vec<_>>();

                for import in &imports {
                    if let Some(resolved) = &import.resolved_path {
                        edges.push(StructureEdge {
                            from: entry.path.clone(),
                            to: resolved.clone(),
                            kind: StructureEdgeKind::Import,
                        });
                    }
                }

                FileStructure {
                    path: entry.path.clone(),
                    language,
                    parsed: true,
                    changed_symbols: changed_symbols(&parsed.symbols, &entry.changed_lines),
                    imports,
                }
            })
            .unwrap_or_else(|| FileStructure {
                path: entry.path.clone(),
                language,
                parsed: false,
                changed_symbols: Vec::new(),
                imports: Vec::new(),
            });
        files.push(structure);
    }

    edges.sort_by(|a, b| a.from.cmp(&b.from).then_with(|| a.to.cmp(&b.to)));
    edges.dedup();

    Ok((files, edges))
}

/// Parses one entry's target-side blob; `None` marks the file unparsed
/// (deleted, binary, unsupported, oversized, unreadable, or parse failure).
fn analyze_entry(
    repo: &Repository,
    target_tree: &Tree<'_>,
    entry: &ChangedEntry,
    language: StructureLanguage,
) -> Option<analysis::ParsedFile> {
    if entry.status == FileChangeStatus::Deleted
        || entry.is_binary
        || language == StructureLanguage::Unknown
    {
        return None;
    }
    let source = read_blob(repo, target_tree, &entry.path)?;
    analysis::parse_source(&entry.path, language, &source)
}

/// Runs the same rename-detecting diff the review view uses, collecting each
/// file's changed new-side lines: every added line's number, and for
/// deletions the new-side position the removal sits at (tracked via the last
/// seen new-side line, so a pure-deletion hunk attributes to its own spot
/// instead of the hunk's context start).
fn collect_changed_entries(
    repo: &Repository,
    base_tree: Option<&Tree<'_>>,
    target_tree: &Tree<'_>,
    target: DiffTarget<'_>,
) -> Result<Vec<ChangedEntry>, BranchError> {
    let diff = build_diff(repo, base_tree, target_tree, target, None)?;
    let entries: RefCell<Vec<ChangedEntry>> = RefCell::new(Vec::new());

    diff.foreach(
        &mut |delta, _| {
            let (file_path, _) = delta_paths(&delta);
            entries.borrow_mut().push(ChangedEntry {
                path: file_path,
                status: map_status(delta.status()),
                is_binary: delta.flags().is_binary(),
                changed_lines: BTreeSet::new(),
                last_new_line: 0,
            });
            true
        },
        Some(&mut |_, _| {
            if let Some(entry) = entries.borrow_mut().last_mut() {
                entry.is_binary = true;
            }
            true
        }),
        None,
        Some(&mut |_, _, line| {
            if let Some(entry) = entries.borrow_mut().last_mut() {
                match line.origin() {
                    '+' => {
                        if let Some(no) = line.new_lineno() {
                            entry.changed_lines.insert(no);
                            entry.last_new_line = no;
                        }
                    }
                    '-' => {
                        entry.changed_lines.insert(entry.last_new_line.max(1));
                    }
                    _ => {
                        if let Some(no) = line.new_lineno() {
                            entry.last_new_line = no;
                        }
                    }
                }
            }
            true
        }),
    )
    .map_err(|source| BranchError::DiffFailed {
        target: target.describe(),
        source,
    })?;

    Ok(entries.into_inner())
}

/// Reads a text blob from the target tree, size-capped.
fn read_blob(repo: &Repository, tree: &Tree<'_>, file_path: &str) -> Option<String> {
    let entry = tree.get_path(Path::new(file_path)).ok()?;
    let blob = entry
        .to_object(repo)
        .ok()
        .and_then(|obj| obj.peel_to_blob().ok())?;
    if blob.is_binary() || blob.content().len() > MAX_PARSE_BYTES {
        return None;
    }
    Some(String::from_utf8_lossy(blob.content()).into_owned())
}

/// The analyzed repo's own alias config, read from the target tree
/// (best-effort: first of tsconfig.json / jsconfig.json that yields paths).
fn read_alias_map(repo: &Repository, tree: &Tree<'_>) -> AliasMap {
    ["tsconfig.json", "jsconfig.json"]
        .iter()
        .filter_map(|name| read_blob(repo, tree, name))
        .find_map(|source| parse_tsconfig_aliases(&source))
        .unwrap_or_default()
}

/// The definitions the changed lines touch, innermost-wins: each changed line
/// is attributed to the SMALLEST definition containing it, so a changed
/// method reports the method — the enclosing class only appears when a line
/// outside all its members changed.
fn changed_symbols(defs: &[SymbolDef], changed_lines: &BTreeSet<u32>) -> Vec<ChangedSymbol> {
    let mut picked = vec![false; defs.len()];
    for &line in changed_lines {
        let smallest = defs
            .iter()
            .enumerate()
            .filter(|(_, def)| def.start_line <= line && line <= def.end_line)
            .min_by_key(|(_, def)| def.end_line - def.start_line);
        if let Some((index, _)) = smallest {
            picked[index] = true;
        }
    }

    let mut symbols: Vec<ChangedSymbol> = defs
        .iter()
        .zip(picked)
        .filter(|(_, picked)| *picked)
        .map(|(def, _)| ChangedSymbol {
            name: def.name.clone(),
            kind: def.kind,
            start_line: def.start_line,
            end_line: def.end_line,
        })
        .collect();
    symbols.sort_by_key(|s| (s.start_line, s.end_line));
    symbols
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::branch_management::features::code_structure::models::SymbolKind;
    use crate::shared::utils::test_utils::{commit_file, run_git, setup_test_repo, DirectoryGuard};

    fn def(name: &str, kind: SymbolKind, start: u32, end: u32) -> SymbolDef {
        SymbolDef {
            name: name.to_string(),
            kind,
            start_line: start,
            end_line: end,
        }
    }

    #[test]
    fn changed_symbols_pick_the_innermost_definition() {
        let defs = [
            def("Box", SymbolKind::Class, 1, 10),
            def("open", SymbolKind::Method, 2, 4),
            def("close", SymbolKind::Method, 5, 7),
        ];

        // A line inside `open` reports only the method.
        let lines: BTreeSet<u32> = [3].into();
        let symbols = changed_symbols(&defs, &lines);
        assert_eq!(symbols.len(), 1);
        assert_eq!(symbols[0].name, "open");

        // A line in the class but outside every method adds the class.
        let lines: BTreeSet<u32> = [3, 9].into();
        let names: Vec<_> = changed_symbols(&defs, &lines)
            .into_iter()
            .map(|s| s.name)
            .collect();
        assert_eq!(names, vec!["Box", "open"]);

        // Lines outside everything report nothing.
        let lines: BTreeSet<u32> = [42].into();
        assert!(changed_symbols(&defs, &lines).is_empty());
    }

    /// feature/structure adds `a.ts` (imports ./b and an alias) and modifies
    /// one function of `b.ts`; `unused.css` changes too.
    fn setup_structure_repo() -> tempfile::TempDir {
        let repo = setup_test_repo();
        let path = repo.path();
        commit_file(
            path,
            "src/b.ts",
            "export function alpha() {\n  return 1;\n}\n\nexport function beta() {\n  return 2;\n}\n",
            "Add b.ts",
            "2024-01-01T09:00:00",
        );
        run_git(path, &["checkout", "-b", "feature/structure"]);
        commit_file(
            path,
            "tsconfig.json",
            "{\n  // aliases\n  \"compilerOptions\": { \"baseUrl\": \".\", \"paths\": { \"$src/*\": [\"src/*\"] } },\n}\n",
            "Add tsconfig",
            "2024-01-01T10:00:00",
        );
        commit_file(
            path,
            "src/b.ts",
            "export function alpha() {\n  return 10;\n}\n\nexport function beta() {\n  return 2;\n}\n",
            "Change alpha",
            "2024-01-01T10:01:00",
        );
        commit_file(
            path,
            "src/a.ts",
            "import { alpha } from './b';\nimport { helper } from '$src/b';\nexport const run = () => alpha();\n",
            "Add a.ts",
            "2024-01-01T10:02:00",
        );
        commit_file(
            path,
            "unused.css",
            ".a { color: red; }\n",
            "Add css",
            "2024-01-01T10:03:00",
        );
        run_git(path, &["checkout", "main"]);
        repo
    }

    #[test]
    fn analyzes_files_symbols_and_edges_for_a_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_structure_repo();

        let (files, edges) =
            get_diff_structure(repo.path(), DiffTarget::Branch("feature/structure")).unwrap();

        let a = files.iter().find(|f| f.path == "src/a.ts").unwrap();
        assert!(a.parsed);
        assert_eq!(a.language, StructureLanguage::Typescript);
        assert_eq!(
            a.changed_symbols
                .iter()
                .map(|s| s.name.as_str())
                .collect::<Vec<_>>(),
            vec!["run"]
        );
        // Both the relative and the tsconfig-alias import resolve to b.ts.
        assert!(a
            .imports
            .iter()
            .all(|i| i.resolved_path.as_deref() == Some("src/b.ts")));

        let b = files.iter().find(|f| f.path == "src/b.ts").unwrap();
        assert!(b.parsed);
        // Only `alpha` changed — `beta` is untouched.
        assert_eq!(
            b.changed_symbols
                .iter()
                .map(|s| s.name.as_str())
                .collect::<Vec<_>>(),
            vec!["alpha"]
        );

        let css = files.iter().find(|f| f.path == "unused.css").unwrap();
        assert!(!css.parsed);
        assert_eq!(css.language, StructureLanguage::Unknown);

        // Duplicate imports collapse into one edge.
        assert_eq!(
            edges,
            vec![StructureEdge {
                from: "src/a.ts".to_string(),
                to: "src/b.ts".to_string(),
                kind: StructureEdgeKind::Import,
            }]
        );
    }

    #[test]
    fn analyzes_a_single_commit_against_its_parent() {
        let _guard = DirectoryGuard::new();
        let repo = setup_structure_repo();
        run_git(repo.path(), &["checkout", "feature/structure"]);
        let tip = run_git(repo.path(), &["rev-parse", "HEAD~1"]);
        run_git(repo.path(), &["checkout", "main"]);

        // HEAD~1 is the commit that added a.ts (b.ts unchanged in it).
        let (files, edges) = get_diff_structure(repo.path(), DiffTarget::Commit(&tip)).unwrap();

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/a.ts");
        // b.ts is not part of THIS commit's changed set, so nothing resolves.
        assert!(edges.is_empty());
        assert!(files[0].imports.iter().all(|i| i.resolved_path.is_none()));
    }

    #[test]
    fn deleted_files_stay_unparsed_but_receive_incoming_edges() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        commit_file(
            path,
            "src/gone.ts",
            "export const g = () => 1;\n",
            "Add gone.ts",
            "2024-01-01T09:00:00",
        );
        run_git(path, &["checkout", "-b", "feature/delete"]);
        run_git(path, &["rm", "src/gone.ts"]);
        run_git(path, &["commit", "-m", "Delete gone.ts"]);
        commit_file(
            path,
            "src/user.ts",
            "import { g } from './gone';\nexport const use = () => g();\n",
            "Add user.ts",
            "2024-01-01T10:00:00",
        );
        run_git(path, &["checkout", "main"]);

        let (files, edges) =
            get_diff_structure(repo.path(), DiffTarget::Branch("feature/delete")).unwrap();

        let gone = files.iter().find(|f| f.path == "src/gone.ts").unwrap();
        assert!(!gone.parsed);
        assert!(gone.changed_symbols.is_empty());

        assert_eq!(edges.len(), 1);
        assert_eq!(edges[0].from, "src/user.ts");
        assert_eq!(edges[0].to, "src/gone.ts");
    }

    #[test]
    fn deletion_only_changes_attribute_to_the_surrounding_symbol() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        commit_file(
            path,
            "src/d.ts",
            "export function keep() {\n  const a = 1;\n  const b = 2;\n  return a + b;\n}\n",
            "Add d.ts",
            "2024-01-01T09:00:00",
        );
        run_git(path, &["checkout", "-b", "feature/del-line"]);
        commit_file(
            path,
            "src/d.ts",
            "export function keep() {\n  const a = 1;\n  return a;\n}\n",
            "Remove a line",
            "2024-01-01T10:00:00",
        );
        run_git(path, &["checkout", "main"]);

        let (files, _) =
            get_diff_structure(repo.path(), DiffTarget::Branch("feature/del-line")).unwrap();
        let d = files.iter().find(|f| f.path == "src/d.ts").unwrap();
        assert_eq!(
            d.changed_symbols
                .iter()
                .map(|s| s.name.as_str())
                .collect::<Vec<_>>(),
            vec!["keep"]
        );
    }

    #[test]
    fn missing_branch_surfaces_a_domain_error() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();

        let err = get_diff_structure(repo.path(), DiffTarget::Branch("missing")).unwrap_err();
        assert_eq!(err.kind, "branch_not_found");
    }
}
